function readEnvFlag(
  publicKey: string,
  serverKey: string,
  defaultValue = false
): boolean {
  const pub = process.env[publicKey];
  if (pub !== undefined) {
    return pub === "true" || pub === "1";
  }
  const server = process.env[serverKey];
  if (server !== undefined) {
    return server === "true" || server === "1";
  }
  return defaultValue;
}

/**
 * Blog visual generator — MVP 기본 흐름에서는 숨김.
 * 클라이언트 UI: NEXT_PUBLIC_ENABLE_BLOG_VISUAL_GENERATOR (기본 false)
 * 서버 API guard(선택): ENABLE_BLOG_VISUAL_GENERATOR
 */
export function isBlogVisualGeneratorEnabled(): boolean {
  return readEnvFlag(
    "NEXT_PUBLIC_ENABLE_BLOG_VISUAL_GENERATOR",
    "ENABLE_BLOG_VISUAL_GENERATOR"
  );
}

/**
 * Instagram cardnews panel — MVP 기본 흐름에서는 숨김.
 * 클라이언트 UI: NEXT_PUBLIC_ENABLE_INSTAGRAM_CARDNEWS (기본 false)
 */
export function isInstagramCardnewsEnabled(): boolean {
  return readEnvFlag(
    "NEXT_PUBLIC_ENABLE_INSTAGRAM_CARDNEWS",
    "ENABLE_INSTAGRAM_CARDNEWS"
  );
}
