import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import profiles from './exportProfiles.json';

describe('animation export profiles', () => {
  test('covers every animation ZIP with a finite scene origin', () => {
    const assetNames = fs
      .readdirSync(path.join(__dirname, 'assets'))
      .filter((name) => name.endsWith('.zip'))
      .sort();

    expect(Object.keys(profiles).sort()).toEqual(assetNames);
    for (const profile of Object.values(profiles)) {
      expect(Number.isFinite(profile.origin.x)).toBe(true);
      expect(Number.isFinite(profile.origin.y)).toBe(true);
      expect(Array.isArray(profile.loopActions)).toBe(true);
    }
  });
});
