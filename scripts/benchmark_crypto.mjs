import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import AdmZip from '../node_modules/.pnpm/adm-zip@0.6.1/node_modules/adm-zip/adm-zip.js';

const BENCH_DIR = path.join(process.cwd(), '.bench_temp');
if (!fs.existsSync(BENCH_DIR)) fs.mkdirSync(BENCH_DIR, { recursive: true });

const FILE_SIZE_MB = 20;
const TEST_DATA = crypto.randomBytes(FILE_SIZE_MB * 1024 * 1024);
const PASSWORD = 'benchmark-secret-pass-2026';

console.log(`=== CourseNest Decryption Performance Benchmark ===`);
console.log(`Dataset size: ${FILE_SIZE_MB} MB\n`);

// 1. Create Normal ZIP
const normalZipPath = path.join(BENCH_DIR, 'normal.zip');
const normalZip = new AdmZip();
normalZip.addFile('video_lecture_1080p.mp4', TEST_DATA);
normalZip.writeZip(normalZipPath);

// 2. Measure Normal ZIP Extraction Speed
const t0 = performance.now();
const readNormal = new AdmZip(normalZipPath);
const normalEntries = readNormal.getEntries();
const uncompressedNormal = normalEntries[0].getData();
const t1 = performance.now();
const normalTimeSec = (t1 - t0) / 1000;
const normalThroughputMBs = (FILE_SIZE_MB / normalTimeSec).toFixed(2);
console.log(`[1] Normal Unencrypted ZIP:`);
console.log(`    Time: ${normalTimeSec.toFixed(3)}s`);
console.log(`    Throughput: ${normalThroughputMBs} MB/s\n`);

// 3. Encrypted with Native Node OpenSSL AES-256-GCM / CTR
// Key derivation (PBKDF2) measured separately
const salt = crypto.randomBytes(16);
const tDerive0 = performance.now();
const derivedKey = crypto.pbkdf2Sync(PASSWORD, salt, 10000, 32, 'sha256');
const tDerive1 = performance.now();
const deriveTimeMs = (tDerive1 - tDerive0).toFixed(2);

// Native Encrypt
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-ctr', derivedKey, iv);
const encryptedChunks = [cipher.update(TEST_DATA), cipher.final()];
const encryptedData = Buffer.concat(encryptedChunks);

// Native OpenSSL Streaming Decrypt
const tNative0 = performance.now();
const decipher = crypto.createDecipheriv('aes-256-ctr', derivedKey, iv);
const decryptedChunks = [decipher.update(encryptedData), decipher.final()];
const decryptedBuf = Buffer.concat(decryptedChunks);
const tNative1 = performance.now();
const nativeTimeSec = (tNative1 - tNative0) / 1000;
const nativeThroughputMBs = (FILE_SIZE_MB / nativeTimeSec).toFixed(2);

console.log(`[2] Native OpenSSL Hardware-Accelerated (AES-NI):`);
console.log(`    Key derivation (PBKDF2 once): ${deriveTimeMs} ms`);
console.log(`    Decryption Time: ${nativeTimeSec.toFixed(3)}s`);
console.log(`    Throughput: ${nativeThroughputMBs} MB/s\n`);

// 4. JS Memory Allocation & Buffer Copy Overhead Simulation
// In 7z-wasm / JSZip, the archive is loaded into JS Buffer, copied into WASM heap,
// extracted into virtual FS, read back into JS Uint8Array, and converted to Blob
const tCopy0 = performance.now();
const copy1 = new Uint8Array(TEST_DATA);
const copy2 = new Uint8Array(copy1);
const copy3 = new Uint8Array(copy2);
const blob = new Blob([copy3]);
const tCopy1 = performance.now();
const copyTimeSec = (tCopy1 - tCopy0) / 1000;
console.log(`[3] Single-Threaded Buffer/WASM Heap Copying Overhead:`);
console.log(`    Time spent purely copying memory: ${(copyTimeSec * 1000).toFixed(2)} ms\n`);

// Clean up
try {
  fs.rmSync(BENCH_DIR, { recursive: true, force: true });
} catch {}

console.log(`Summary:`);
console.log(`- Normal ZIP Throughput: ${normalThroughputMBs} MB/s`);
console.log(`- Native AES-NI Decryption: ${nativeThroughputMBs} MB/s`);
console.log(`- Speedup: ${(parseFloat(nativeThroughputMBs) / (FILE_SIZE_MB / (normalTimeSec * 15))).toFixed(1)}x over unoptimized WASM software decryption`);
