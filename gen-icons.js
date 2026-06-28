/* Generates the extension's PNG icons (16/48/128) from scratch — no image libraries.
 * Draws a rounded blue tile with a white grid (a spreadsheet) and a green cell (export). */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function png(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: none
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}
function icon(S) {
  const buf = Buffer.alloc(S * S * 4);
  const m = Math.max(1, Math.round(S * 0.06));
  const rad = Math.round(S * 0.2);
  const x0 = m, y0 = m, x1 = S - 1 - m, y1 = S - 1 - m;
  const W = x1 - x0, H = y1 - y0;
  const inRound = (x, y) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    const cornerOK = (cx, cy) => (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad;
    if (x < x0 + rad && y < y0 + rad) return cornerOK(x0 + rad, y0 + rad);
    if (x > x1 - rad && y < y0 + rad) return cornerOK(x1 - rad, y0 + rad);
    if (x < x0 + rad && y > y1 - rad) return cornerOK(x0 + rad, y1 - rad);
    if (x > x1 - rad && y > y1 - rad) return cornerOK(x1 - rad, y1 - rad);
    return true;
  };
  const set = (x, y, r, g, b, a) => { const i = (y * S + x) * 4; buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a; };
  const lineW = Math.max(1, Math.round(S * 0.05));
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!inRound(x, y)) continue;
      let r = 37, g = 99, b = 235; // brand blue
      const cx = (x - x0) / W, cy = (y - y0) / H;
      if (cx < 1 / 3 - 0.03 && cy < 1 / 3 - 0.03) { r = 22; g = 163; b = 74; } // green export cell
      const onV = [1 / 3, 2 / 3].some((f) => Math.abs(x - (x0 + W * f)) < lineW / 2);
      const onH = [1 / 3, 2 / 3].some((f) => Math.abs(y - (y0 + H * f)) < lineW / 2);
      if (onV || onH) { r = 255; g = 255; b = 255; }
      set(x, y, r, g, b, 255);
    }
  }
  return png(S, buf);
}
const dir = path.join(__dirname, 'icons');
fs.mkdirSync(dir, { recursive: true });
[16, 48, 128].forEach((s) => {
  fs.writeFileSync(path.join(dir, 'icon' + s + '.png'), icon(s));
  console.log('wrote icons/icon' + s + '.png');
});
