import { NextResponse } from "next/server";

interface AccessRequestBody {
  password?: string;
}

function isAccessGateEnabled(): boolean {
  return Boolean(process.env.APP_ACCESS_PASSWORD?.trim());
}

export async function GET() {
  return NextResponse.json({ enabled: isAccessGateEnabled() });
}

export async function POST(request: Request) {
  const configuredPassword = process.env.APP_ACCESS_PASSWORD?.trim();

  if (!configuredPassword) {
    return NextResponse.json({ ok: true, gateDisabled: true });
  }

  try {
    const body = (await request.json()) as AccessRequestBody;
    const password = body.password ?? "";

    if (password === configuredPassword) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: "비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { error: "접근 확인 중 오류가 발생했습니다." },
      { status: 400 }
    );
  }
}
