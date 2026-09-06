import type { ImageMetadata } from 'astro';

const assets = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/images/**/*.{jpg,jpeg,png,webp,avif}',
);

export function imageAssetPath(contentPath: string): string {
  const normalized = contentPath.startsWith('/') ? contentPath : `/${contentPath}`;
  return `/src/assets${normalized}`;
}

export async function resolveImage(contentPath: string): Promise<ImageMetadata> {
  const key = imageAssetPath(contentPath);
  const loader = assets[key];
  if (!loader) {
    throw new Error(
      `Image not found: "${contentPath}" resolved to "${key}". Add the file to src/assets/images or run scripts/generate-placeholders.mjs.`,
    );
  }
  return (await loader()).default;
}
