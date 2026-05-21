import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

// Resolve repo root from this test file location:
// __tests__ -> showcase -> src -> web -> apps -> <repo root>
const REPO_ROOT = path.resolve(__dirname, '../../../../..');

// Sanity assertion: this is the right cwd if apps/web exists at that path.
const REPO_ROOT_OK = existsSync(path.join(REPO_ROOT, 'apps', 'web'));

// -----------------------------------------------------------------------------
// Test 1 — Forbidden covenant vocab MUST NOT appear in apps/web/src/showcase/**
// -----------------------------------------------------------------------------
//
// The forbidden pattern intentionally excludes the bare word "member": the plan's
// forbidden list flags only the isolated word in CSRA-style framing, not legitimate
// compounds like "memberships" or "community member" in benefit-only contexts.
// "Capital partners & allies" is the permitted public-facing phrase and is NOT
// flagged here.
//
// Implementation note: we do NOT shell out to `xargs`/`grep` because this test
// runs on Windows (per project CLAUDE.md) where those binaries are unreliable.
// Instead we use `git ls-files` (cross-platform) for the file list and read +
// regex-match in pure JS.

const FORBIDDEN_PATTERN =
  /CSRA|advance.purchase|yield.share|salam|riba|gharar|\binvestor\b|\bROI\b/i;

describe('covenant: forbidden vocab is absent from showcase tree', () => {
  it('repo root resolves correctly', () => {
    expect(REPO_ROOT_OK, `repo root mis-resolved: ${REPO_ROOT}`).toBe(true);
  });

  it('grep returns zero matches in apps/web/src/showcase/**', () => {
    const raw = execSync('git ls-files apps/web/src/showcase', {
      encoding: 'utf8',
      cwd: REPO_ROOT,
      maxBuffer: 16 * 1024 * 1024,
    });
    const files = raw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    expect(files.length, 'no showcase files found via git ls-files').toBeGreaterThan(0);

    // Exclude the covenant test file itself — it intentionally contains the
    // forbidden tokens as literal patterns to grep for.
    const SELF = 'apps/web/src/showcase/__tests__/covenant.test.ts';
    const targets = files.filter((f) => f.replace(/\\/g, '/') !== SELF);

    const hits: string[] = [];
    for (const rel of targets) {
      const abs = path.join(REPO_ROOT, rel);
      let body: string;
      try {
        body = readFileSync(abs, 'utf8');
      } catch {
        // Binary or unreadable file — skip.
        continue;
      }
      const lines = body.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (FORBIDDEN_PATTERN.test(line)) {
          hits.push(`${rel}:${i + 1}: ${line.trim()}`);
        }
      }
    }

    expect(hits, `Forbidden vocab found:\n${hits.join('\n')}`).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// Test 2 — Apricot Lane attribution string is exact in all 4 prerendered HTMLs
// -----------------------------------------------------------------------------
//
// This is a CI guard intended to run AFTER `pnpm --filter @ogden/web build`.
// When the dist directory does not exist (local dev without a build), the
// describe block is skipped via `describe.skipIf` so the suite still passes.

const APRICOT =
  'Inspired by farms like Apricot Lane Farms and the rehabilitation arc shown in The Biggest Little Farm; Three Streams Farm is a fictional Ontario operation.';
const DIST = path.resolve(__dirname, '../../../dist/showcase/three-streams');
const PAGES = [
  'index.html',
  'dreaming/index.html',
  'transitioning/index.html',
  'stewarding/index.html',
];

describe.skipIf(!existsSync(DIST))(
  'covenant: Apricot Lane attribution string is exact in prerendered HTML',
  () => {
    it.each(PAGES)('contains the attribution string in %s', (page) => {
      const file = path.join(DIST, page);
      expect(existsSync(file), `${page} missing from dist`).toBe(true);
      const html = readFileSync(file, 'utf8');
      expect(html, `${page} missing Apricot Lane attribution`).toContain(APRICOT);
    });
  },
);
