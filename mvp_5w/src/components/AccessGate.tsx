"use client";

import { useCallback, useEffect, useState } from "react";

import {
  clearAccessGrantedInSession,
  isAccessGrantedInSession,
  setAccessGrantedInSession,
} from "@/lib/access-gate";

type GateState = "loading" | "disabled" | "locked" | "unlocked";

interface AccessGateProps {
  children: React.ReactNode;
}

export function AccessGate({ children }: AccessGateProps) {
  const [gateState, setGateState] = useState<GateState>("loading");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const response = await fetch("/api/access", { method: "GET" });
        const data = (await response.json()) as { enabled?: boolean };

        if (cancelled) {
          return;
        }

        if (!data.enabled) {
          setGateState("disabled");
          return;
        }

        if (isAccessGrantedInSession()) {
          setGateState("unlocked");
          return;
        }

        setGateState("locked");
      } catch {
        if (!cancelled) {
          setError("접근 설정을 확인하지 못했습니다. 잠시 후 다시 시도하세요.");
          setGateState("locked");
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = useCallback(() => {
    clearAccessGrantedInSession();
    setPassword("");
    setError("");
    setGateState("locked");
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmitting(true);
      setError("");

      try {
        const response = await fetch("/api/access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        const data = (await response.json()) as {
          ok?: boolean;
          error?: string;
        };

        if (response.ok && data.ok) {
          setAccessGrantedInSession();
          setGateState("unlocked");
          setPassword("");
          return;
        }

        setError(data.error || "비밀번호가 올바르지 않습니다.");
      } catch {
        setError("접근 확인 중 오류가 발생했습니다.");
      } finally {
        setSubmitting(false);
      }
    },
    [password]
  );

  if (gateState === "loading") {
    return (
      <div className="access-gate-screen">
        <div className="access-gate-card">
          <p className="access-gate-hint">접근 설정 확인 중...</p>
        </div>
      </div>
    );
  }

  if (gateState === "locked") {
    return (
      <div className="access-gate-screen">
        <div className="access-gate-card">
          <h1 className="access-gate-title">콘텐츠 운영 OS</h1>
          <p className="access-gate-subtitle">
            1차 팀 내부 테스트용 임시 접근 제한입니다. (정식 로그인/권한 관리가
            아닙니다.)
          </p>
          <form className="access-gate-form" onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="access-password">
              접근 비밀번호
            </label>
            <input
              id="access-password"
              type="password"
              className="text-input"
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={submitting}
            />
            {error && <p className="access-gate-error">{error}</p>}
            <button
              type="submit"
              className="primary-btn"
              disabled={submitting || !password.trim()}
            >
              {submitting ? "확인 중..." : "입장"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      {gateState === "disabled" && (
        <div className="access-gate-notice">
          개발 모드: <code>APP_ACCESS_PASSWORD</code>가 설정되지 않아 접근
          게이트가 비활성화되었습니다.
        </div>
      )}
      {children}
      {gateState === "unlocked" && (
        <button
          type="button"
          className="access-logout-btn"
          onClick={handleLogout}
        >
          접근 종료
        </button>
      )}
    </>
  );
}
