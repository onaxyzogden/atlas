import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Vite's `define:` block does literal build-time text substitution of
// `process.env.FEATURE_*`. Any FEATURE_* read by flags.ts that is absent from
// the define block is `undefined` in the browser bundle, so that flag is
// permanently false regardless of env. This guards the whole bug class.
describe('feature-flag build wiring', () => {
  const repoRoot = join(__dirname, '..', '..', '..', '..', '..');
  const flagsSrc = readFileSync(
    join(repoRoot, 'packages', 'shared', 'src', 'constants', 'flags.ts'),
    'utf8',
  );
  const viteSrc = readFileSync(
    join(repoRoot, 'apps', 'web', 'vite.config.ts'),
    'utf8',
  );

  const referencedFlags = [
    ...flagsSrc.matchAll(/process\.env\['(FEATURE_[A-Z0-9_]+)'\]/g),
  ].map((m) => m[1]);

  it('references at least the SYNC_STATE_BLOBS flag', () => {
    expect(referencedFlags).toContain('FEATURE_SYNC_STATE_BLOBS');
  });

  it.each(referencedFlags)(
    'exposes %s to the browser bundle via the vite define block',
    (flag) => {
      expect(viteSrc).toContain(`'process.env.${flag}'`);
    },
  );
});
