import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../apps/lifeos-web/public");
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function png(size, rgb) {
  const [r, g, b] = rgb;
  const row = Buffer.alloc(1 + size * 3);
  const rows = [];
  for (let y = 0; y < size; y++) {
    const line = Buffer.alloc(1 + size * 3);
    line[0] = 0;
    for (let x = 0; x < size; x++) {
      const cx = x - size / 2;
      const cy = y - size / 2;
      const inMark = Math.abs(cx) + Math.abs(cy) < size * 0.28 || (Math.hypot(cx, cy) < size * 0.12);
      const edge = x < size * 0.08 || y < size * 0.08 || x > size * 0.92 || y > size * 0.92;
      const i = 1 + x * 3;
      if (inMark) {
        line[i] = 255;
        line[i + 1] = 255;
        line[i + 2] = 255;
      } else if (!edge) {
        line[i] = r;
        line[i + 1] = g;
        line[i + 2] = b;
      } else {
        line[i] = Math.max(0, r - 20);
        line[i + 1] = Math.max(0, g - 20);
        line[i + 2] = Math.max(0, b - 20);
      }
    }
    rows.push(line);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const idat = deflateSync(Buffer.concat(rows));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const color = [13, 122, 111];
writeFileSync(join(outDir, "pwa-192.png"), png(192, color));
writeFileSync(join(outDir, "pwa-512.png"), png(512, color));
writeFileSync(join(outDir, "apple-touch-icon.png"), png(180, color));
console.log("Generated LifeOS PWA icons in apps/lifeos-web/public");
