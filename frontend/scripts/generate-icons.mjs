/**
 * generate-icons.mjs
 *
 * Generates favicon, apple-icon, and opengraph image from the NERBIS isotipo source.
 *
 * Usage: npm run generate-icons
 *
 * Source: public/Isotipo_color_NERBIS.png (2598x2480)
 * Outputs:
 *   - src/app/favicon.ico   (48x48 PNG — browsers accept PNG as favicon)
 *   - src/app/apple-icon.png (180x180)
 *   - src/app/opengraph-image.png (1200x630, brand background + centered isotipo)
 */

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { join, dirname } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(__dirname, '../public/Isotipo_color_NERBIS.png');
const APP_DIR = join(__dirname, '../src/app');

const BRAND_BG = { r: 28, g: 59, b: 87, alpha: 1 }; // #1C3B57
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function generateFavicon() {
  console.log('  -> favicon.ico (48x48 ICO)');
  const pngBuffer = await sharp(SOURCE)
    .resize(48, 48, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer();
  const icoBuffer = await pngToIco([pngBuffer]);
  await writeFile(join(APP_DIR, 'favicon.ico'), icoBuffer);
}

async function generateAppleIcon() {
  console.log('  -> apple-icon.png (180x180)');
  await sharp(SOURCE)
    .resize(180, 180, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toFile(join(APP_DIR, 'apple-icon.png'));
}

async function generateOGImage() {
  console.log('  -> opengraph-image.png (1200x630)');

  // Resize the isotipo to 200x200 for compositing
  const isotipo = await sharp(SOURCE)
    .resize(200, 200, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer();

  // Create canvas with brand background and composite the isotipo centered
  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: BRAND_BG,
    },
  })
    .composite([{ input: isotipo, gravity: 'centre' }])
    .png()
    .toFile(join(APP_DIR, 'opengraph-image.png'));
}

async function main() {
  console.log('Generating NERBIS icon assets...');
  console.log(`Source: ${SOURCE}`);
  console.log(`Output: ${APP_DIR}\n`);

  await Promise.all([
    generateFavicon(),
    generateAppleIcon(),
    generateOGImage(),
  ]);

  console.log('\nAll assets generated successfully.');
}

main().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
