import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Button from '../../src/components/primitives/Button.astro';
import Container from '../../src/components/primitives/Container.astro';
import Section from '../../src/components/primitives/Section.astro';

type RenderOptions = Parameters<AstroContainer['renderToString']>[1];
const render = async (Component: Parameters<AstroContainer['renderToString']>[0], options: RenderOptions) =>
  (await AstroContainer.create()).renderToString(Component, options);

describe('Button', () => {
  it('renders an anchor with its slot content', async () => {
    const html = await render(Button, { props: { href: '/contact' }, slots: { default: 'Request a quote' } });
    expect(html).toContain('href="/contact"');
    expect(html).toContain('Request a quote');
  });

  it('applies a distinct class for the ghost variant', async () => {
    const primary = await render(Button, { props: { href: '/x' }, slots: { default: 'A' } });
    const ghost = await render(Button, { props: { href: '/x', variant: 'ghost' }, slots: { default: 'A' } });
    expect(primary).not.toBe(ghost);
  });

  it('never emits a raw hex color', async () => {
    const html = await render(Button, { props: { href: '/x' }, slots: { default: 'A' } });
    expect(html).not.toMatch(/#[0-9a-fA-F]{6}/);
  });
});

describe('Container', () => {
  it('constrains text width when asked', async () => {
    const html = await render(Container, { props: { width: 'text' }, slots: { default: '<p>copy</p>' } });
    expect(html).toContain('copy');
    expect(html).toContain('container-text');
  });
});

describe('Section', () => {
  it('renders a section element carrying its id', async () => {
    const html = await render(Section, { props: { id: 'process' }, slots: { default: 'body' } });
    expect(html).toMatch(/<section[^>]*id="process"/);
  });
});
