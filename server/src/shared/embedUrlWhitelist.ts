/**
 * Wave 4：外链视频域名白名单（与产品 `16` §3 一致；Admin 可配白名单为 P2 不做）
 */
const ALLOWED_HOST_ROOTS = ['bilibili.com', 'youtube.com', 'youtu.be', 'vimeo.com'] as const;

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, '');
}

/** 主机名是否落在允许的一级域或其子域（如 player.bilibili.com） */
export function isEmbedHostnameAllowed(hostname: string): boolean {
  const h = normalizeHostname(hostname);
  for (const root of ALLOWED_HOST_ROOTS) {
    if (h === root) {
      return true;
    }
    if (h.endsWith(`.${root}`)) {
      return true;
    }
  }
  return false;
}

export type EmbedUrlValidationError = 'INVALID_URL' | 'HTTPS_REQUIRED' | 'DOMAIN_NOT_ALLOWED';

/** 解析并校验外链；仅允许 https */
export function parseAndValidateHttpsEmbedUrl(raw: string): { ok: true; url: URL } | { ok: false; error: EmbedUrlValidationError } {
  const trimmed = raw.trim();
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return { ok: false, error: 'INVALID_URL' };
  }
  if (u.protocol !== 'https:') {
    return { ok: false, error: 'HTTPS_REQUIRED' };
  }
  if (!isEmbedHostnameAllowed(u.hostname)) {
    return { ok: false, error: 'DOMAIN_NOT_ALLOWED' };
  }
  return { ok: true, url: u };
}

export function assertHttpsEmbedUrl(raw: string): URL {
  const r = parseAndValidateHttpsEmbedUrl(raw);
  if (!r.ok) {
    const err = new Error(r.error);
    (err as Error & { code: EmbedUrlValidationError }).code = r.error;
    throw err;
  }
  return r.url;
}
