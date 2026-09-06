import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

function frontmatter(path: string): Record<string, unknown> {
  const raw = readFileSync(path, 'utf-8');
  const block = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!block) throw new Error(`no frontmatter in ${path}`);
  const out: Record<string, unknown> = {};
  for (const line of block[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const ids = (dir: string) => readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));

describe('content inventory', () => {
  it('has the expected number of entries in each collection', () => {
    expect(ids('src/content/services')).toHaveLength(5);
    expect(ids('src/content/areas')).toHaveLength(6);
    expect(ids('src/content/projects')).toHaveLength(6);
    expect(ids('src/content/testimonials')).toHaveLength(4);
  });
});

describe('cross-collection references resolve', () => {
  const projectIds = ids('src/content/projects');
  const serviceIds = ids('src/content/services');

  it('every area featuredProjectSlug points at a real project', () => {
    for (const area of ids('src/content/areas')) {
      const fm = frontmatter(`src/content/areas/${area}.md`);
      expect(projectIds, `area "${area}"`).toContain(fm.featuredProjectSlug);
    }
  });

  it('every project service points at a real service', () => {
    for (const project of projectIds) {
      const fm = frontmatter(`src/content/projects/${project}.md`);
      expect(serviceIds, `project "${project}"`).toContain(fm.service);
    }
  });
});

describe('area pages are not templated duplicates', () => {
  it('gives every area a distinct localNote of real length', () => {
    const notes = ids('src/content/areas').map((a) => {
      const raw = readFileSync(`src/content/areas/${a}.md`, 'utf-8');
      const m = raw.match(/localNote: >-\n([\s\S]*?)\n\w+:/);
      if (!m) throw new Error(`no localNote in ${a}`);
      return m[1].replace(/\s+/g, ' ').trim();
    });
    for (const note of notes) expect(note.length).toBeGreaterThanOrEqual(200);
    expect(new Set(notes).size).toBe(notes.length);
  });
});
