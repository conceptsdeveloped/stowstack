import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, 'logo.svg');
const outputPath = resolve(__dirname, '..', 'public', 'stowstack-logo-1024.png');

const svgBuffer = readFileSync(svgPath);

await sharp(svgBuffer, { density: 300 })
  .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(outputPath);

console.log(`Logo saved to ${outputPath}`);

// Also verify dimensions
const metadata = await sharp(outputPath).metadata();
console.log(`Dimensions: ${metadata.width}x${metadata.height}`);
