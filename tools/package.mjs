// Packages the game into dist/silicon-garage-web.zip, ready to upload to itch.io as an HTML game.
// No dependencies: writes a standard deflate ZIP with Node's zlib.
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { Buffer } from 'node:buffer';

const root = resolve(new URL('..', import.meta.url).pathname);
const INCLUDE = ['index.html', 'css', 'src'];
const OUT_DIR = join(root, 'dist');
const OUT = join(OUT_DIR, 'silicon-garage-web.zip');

async function walk(path) {
  const s = await stat(path);
  if (s.isFile()) return [path];
  const out = [];
  for (const name of (await readdir(path)).sort()) {
    if (name.startsWith('.')) continue;
    out.push(...(await walk(join(path, name))));
  }
  return out;
}

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

const files = [];
for (const entry of INCLUDE) files.push(...(await walk(join(root, entry))));

const now = dosTime(new Date());
const locals = [];
const centrals = [];
let offset = 0;
for (const file of files) {
  const name = Buffer.from(relative(root, file).split('\\').join('/'));
  const data = await readFile(file);
  const comp = deflateRawSync(data, { level: 9 });
  const crc = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x0800, 6); // UTF-8 names
  local.writeUInt16LE(8, 8); // deflate
  local.writeUInt16LE(now.time, 10);
  local.writeUInt16LE(now.date, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(comp.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(0, 28);
  locals.push(local, name, comp);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(now.time, 12);
  central.writeUInt16LE(now.date, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(comp.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(offset, 42);
  centrals.push(central, name);
  offset += local.length + name.length + comp.length;
}
const centralSize = centrals.reduce((a, b) => a + b.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralSize, 12);
end.writeUInt32LE(offset, 16);

await mkdir(OUT_DIR, { recursive: true });
const zip = Buffer.concat([...locals, ...centrals, end]);
await writeFile(OUT, zip);
console.log(`Wrote ${relative(root, OUT)} (${files.length} files, ${(zip.length / 1024).toFixed(0)} KB)`);
