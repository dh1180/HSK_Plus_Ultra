import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const source = path.join(root, 'assets', 'icon.svg');
const target = path.join(root, 'assets', 'icon.png');

fs.mkdirSync(path.dirname(target), { recursive: true });

await sharp(source)
  .resize(1024, 1024)
  .png({ compressionLevel: 6, adaptiveFiltering: false })
  .toFile(target);

const { size = 0 } = fs.statSync(target);
console.log(`Generated app icon: ${target} (${size} bytes)`);
