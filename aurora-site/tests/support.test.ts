import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { SUPPORT } from '../src/lib/support';
import { EXTRACT } from '../src/lib/products';

describe('support + free extension', () => {
  it('points at the Telegram channel and the support mailbox', () => {
    expect(SUPPORT.telegram).toBe('https://t.me/+GqmNSvnMJxhhMzJh');
    expect(SUPPORT.email).toBe('support@getaurorastudios.com');
  });
  it('ships the free extension zip and lists all three platforms', () => {
    expect(existsSync('public' + EXTRACT.zip)).toBe(true);
    expect(EXTRACT.platforms.map(p => p.id)).toEqual(['facebook', 'instagram', 'tiktok']);
    expect(EXTRACT.exports.join(' ')).toMatch(/Excel/);
  });
});
