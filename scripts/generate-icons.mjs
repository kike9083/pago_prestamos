import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

const sizes = [72, 96, 128, 144, 192, 512];
const publicDir = resolve(import.meta.dirname, '..', 'public');
const iconsDir = resolve(publicDir, 'icons');
const svgPath = resolve(iconsDir, 'icon.svg');

mkdirSync(iconsDir, { recursive: true });

const svg = readFileSync(svgPath, 'utf-8');

for (const size of sizes) {
  const resizedSvg = svg
    .replace('width="512"', `width="${size}"`)
    .replace('height="512"', `height="${size}"`)
    .replace('viewBox="0 0 512 512"', `viewBox="0 0 ${size} ${size}"`);
  writeFileSync(resolve(iconsDir, `icon-${size}.svg`), resizedSvg);
  console.log(`Created icon-${size}.svg`);
}

console.log('\nAll SVG icons created in public/icons/');
console.log('To convert to PNG, use: https://convertio.co/svg-png/');
console.log('Or install sharp: npm install sharp && node scripts/convert-icons.mjs');
