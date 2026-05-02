/**
 * 将用户粘贴的「观看页」链接尽量转为可 iframe 嵌入的地址（Wave 4）
 * 若无法识别则返回原串（仍须已通过服务端白名单）
 */
export function toVideoIframeSrc(pageUrl: string): string {
  let u: URL;
  try {
    u = new URL(pageUrl.trim());
  } catch {
    return pageUrl;
  }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'youtu.be') {
    const id = u.pathname.replace(/^\//, '').split('/')[0];
    if (id) {
      return `https://www.youtube.com/embed/${id}`;
    }
  }

  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    const v = u.searchParams.get('v');
    if (v) {
      return `https://www.youtube.com/embed/${encodeURIComponent(v)}`;
    }
    const shorts = u.pathname.match(/^\/shorts\/([^/?]+)/);
    if (shorts?.[1]) {
      return `https://www.youtube.com/embed/${encodeURIComponent(shorts[1])}`;
    }
    const embed = u.pathname.match(/^\/embed\/([^/?]+)/);
    if (embed?.[1]) {
      return `https://www.youtube.com/embed/${encodeURIComponent(embed[1])}`;
    }
  }

  if (host.includes('bilibili.com')) {
    const bv = u.pathname.match(/(BV[a-zA-Z0-9]+)/i)?.[1];
    if (bv) {
      return `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bv)}&high_quality=1&autoplay=0`;
    }
  }

  if (host.includes('vimeo.com')) {
    const m = u.pathname.match(/\/(?:video\/)?(\d+)/);
    if (m?.[1]) {
      return `https://player.vimeo.com/video/${m[1]}`;
    }
  }

  return pageUrl;
}

export function isLikelyMobileSafari(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const noChrome = !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && noChrome;
}
