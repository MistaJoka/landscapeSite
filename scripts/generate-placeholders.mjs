import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const OUT = 'src/assets/images';
export const OG_FILE = 'public/og/default.jpg';
const PALETTE = ['#3F5641', '#5C6169', '#2C3D2E', '#6B7A5E', '#4A5568'];

export const FILES = [
  ['hero.jpg', 2400, 1600, 'Hero'],
  ['about-portrait.jpg', 1200, 1500, 'Portrait'],
  ['services/garden-design.jpg', 1600, 1200, 'Garden Design'],
  ['services/patios-stonework.jpg', 1600, 1200, 'Patios & Stonework'],
  ['services/lawn-grounds-care.jpg', 1600, 1200, 'Lawn & Grounds'],
  ['services/irrigation-drainage.jpg', 1600, 1200, 'Irrigation & Drainage'],
  ['services/seasonal-cleanup.jpg', 1600, 1200, 'Seasonal Cleanup'],
];

for (const slug of [
  'tioronda-terrace',
  'chestnut-ridge-garden',
  'rhinebeck-farmhouse-grounds',
  'wallkill-drainage',
  'kingston-stoop-steps',
  'hudson-courtyard',
]) {
  FILES.push([`work/${slug}-before.jpg`, 1600, 1200, `${slug} before`]);
  FILES.push([`work/${slug}-after.jpg`, 1600, 1200, `${slug} after`]);
}

function svg(width, height, label, color) {
  const safe = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="${color}"/>
    <text x="50%" y="50%" fill="#FAF9F6" font-family="sans-serif" font-size="${Math.round(width / 26)}"
          text-anchor="middle" dominant-baseline="middle" opacity="0.85">${safe}</text>
  </svg>`);
}

async function generate() {
let index = 0;
for (const [name, width, height, label] of FILES) {
  const target = join(OUT, name);
  await mkdir(dirname(target), { recursive: true });
  const buffer = await sharp(svg(width, height, label, PALETTE[index % PALETTE.length]))
    .jpeg({ quality: 82 })
    .toBuffer();
  await writeFile(target, buffer);
  index += 1;
}

// Open Graph default lives in public/ because social crawlers need a stable, unhashed URL.
await mkdir('public/og', { recursive: true });
await writeFile(
  'public/og/default.jpg',
  await sharp(svg(1200, 630, 'Stonecrop Landscape Co.', PALETTE[0])).jpeg({ quality: 82 }).toBuffer(),
);

console.log(`generated ${FILES.length + 1} placeholder images`);
}

// Only generate when invoked directly, so tests can import the manifest.
if (import.meta.url === `file://${process.argv[1]}`) await generate();
