// Run: npm install sharp && node scripts/convert-icons.mjs
// Converts SVG icons to PNG for PWA compatibility (required by iOS Safari)

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import sharp from 'sharp';

const sizes = [72, 96, 128, 144, 192, 512];
const iconsDir = resolve(import.meta.dirname, '..', 'public', 'icons');
const svgBuffer = readFileSync(resolve(iconsDir, 'icon.svg'));

async function convert() {
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(resolve(iconsDir, `icon-${size}.png`));
    console.log(`Created icon-${size}.png`);
  }
  console.log('\nAll PNG icons created. Update manifest.json if needed.');
}

convert().catch(console.error);
