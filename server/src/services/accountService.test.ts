import { tombstoneEmailForUser } from './accountService';

describe('tombstoneEmailForUser', () => {
  it('embeds user id and looks like a unique placeholder email', async () => {
    const uid = 'clxxxxxxxxxxxxxxxx';
    const a = tombstoneEmailForUser(uid);
    await new Promise((r) => setTimeout(r, 5));
    const b = tombstoneEmailForUser(uid);
    expect(a).toContain(uid);
    expect(a).toMatch(/@account-closed\.invalid$/);
    expect(a).not.toBe(b);
  });
});
