import { isEmbedHostnameAllowed, parseAndValidateHttpsEmbedUrl } from './embedUrlWhitelist';

describe('embedUrlWhitelist', () => {
  describe('isEmbedHostnameAllowed', () => {
    it('allows bilibili.com and subdomains', () => {
      expect(isEmbedHostnameAllowed('bilibili.com')).toBe(true);
      expect(isEmbedHostnameAllowed('www.bilibili.com')).toBe(true);
      expect(isEmbedHostnameAllowed('player.bilibili.com')).toBe(true);
      expect(isEmbedHostnameAllowed('m.bilibili.com')).toBe(true);
    });
    it('allows youtube and youtu.be', () => {
      expect(isEmbedHostnameAllowed('youtube.com')).toBe(true);
      expect(isEmbedHostnameAllowed('www.youtube.com')).toBe(true);
      expect(isEmbedHostnameAllowed('m.youtube.com')).toBe(true);
      expect(isEmbedHostnameAllowed('youtu.be')).toBe(true);
    });
    it('allows vimeo', () => {
      expect(isEmbedHostnameAllowed('vimeo.com')).toBe(true);
      expect(isEmbedHostnameAllowed('player.vimeo.com')).toBe(true);
    });
    it('rejects other domains', () => {
      expect(isEmbedHostnameAllowed('evil.com')).toBe(false);
      expect(isEmbedHostnameAllowed('notbilibili.com')).toBe(false);
      expect(isEmbedHostnameAllowed('bilibili.com.evil.net')).toBe(false);
    });
  });

  describe('parseAndValidateHttpsEmbedUrl', () => {
    it('accepts https watch URLs on allowlist', () => {
      const r = parseAndValidateHttpsEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.url.hostname).toContain('youtube');
      }
    });
    it('rejects http', () => {
      const r = parseAndValidateHttpsEmbedUrl('http://www.youtube.com/watch?v=1');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe('HTTPS_REQUIRED');
    });
    it('rejects non-whitelisted https', () => {
      const r = parseAndValidateHttpsEmbedUrl('https://example.com/video');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe('DOMAIN_NOT_ALLOWED');
    });
  });
});
