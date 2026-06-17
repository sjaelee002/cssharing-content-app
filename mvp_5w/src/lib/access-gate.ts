export const ACCESS_GATE_STORAGE_KEY = "cssharing-access-granted";

export function isAccessGrantedInSession(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.sessionStorage.getItem(ACCESS_GATE_STORAGE_KEY) === "1";
}

export function setAccessGrantedInSession(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(ACCESS_GATE_STORAGE_KEY, "1");
}

export function clearAccessGrantedInSession(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(ACCESS_GATE_STORAGE_KEY);
}
