import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = path.join(root, 'assets', 'icon.base64');
const target = path.join(root, 'assets', 'icon.png');

const encoded = fs.readFileSync(source, 'utf8').replace(/\s+/g, '');
const buffer = Buffer.from(encoded, 'base64');

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, buffer);

console.log(`Restored app icon: ${target} (${buffer.length} bytes)`);
