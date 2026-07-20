import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');

describe('design tokens (premium light polish)', () => {
  it('defines Light Premium hex surface stack and restrained shadows', () => {
    expect(tokens).toMatch(/--background:\s*#f5f7f8/i);
    expect(tokens).toMatch(/--card:\s*#ffffff/i);
    expect(tokens).toMatch(/--surface:\s*#fafbfb/i);
    expect(tokens).toMatch(/--primary:\s*#174c5b/i);
    expect(tokens).toMatch(/--foreground:\s*#15191c/i);
    expect(tokens).toMatch(/--shadow-xs:/);
    expect(tokens).toMatch(/--shadow-sm:/);
    expect(tokens).toMatch(/--radius-lg:/);
  });

  it('ships paper-design palette + mesh hosts (not full-bleed art)', () => {
    expect(tokens).toContain('.bp-shader-wash');
    expect(tokens).toContain('.bp-shader-card');
    expect(tokens).toContain('.bp-mesh-host');
    expect(tokens).toContain('--shader-powder');
    expect(tokens).toContain('#d2e8ef');
    expect(tokens).toContain('pointer-events: none');
    // Opacity-capped mesh / wash only
    expect(tokens).toMatch(/opacity:\s*0\.(2|22|28|32|42|65|85|9)/);
  });

  it('keeps Inter / system premium sans stack', () => {
    expect(tokens).toMatch(/--font-sans:.*Inter/);
  });
});
