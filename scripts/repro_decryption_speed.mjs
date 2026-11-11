// Repro & Baseline script for B3: Encryption Decryption Speed Baseline
// Compares Normal ZIP extraction vs 7z-wasm software decryption (as used in zipImporter.ts)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import AdmZip from '../node_modules/.pnpm/adm-zip@0.6.1/node_modules/adm-zip/adm-zip.js';

const BENCH_DIR = path.join(process.cwd(), '.bench_baseline');
if (fs.existsSync(BENCH_DIR)) fs.rmSync(BENCH_DIR, { recursive: true, force: true });
fs.mkdirSync(BENCH_DIR, { recursive: true });

const FILE_SIZE_MB = 25;
const TEST_DATA = crypto.randomBytes(FILE_SIZE_MB * 1024 * 1024);
const PASSWORD = 'test-course-password-2026';

console.log('--- REPRO B3: Baseline Decryption Speed Measurement ---');
console.log(`Test dataset size: ${FILE_SIZE_MB} MB`);

// 1. Measure Normal ZIP extraction
const normalZipPath = path.join(BENCH_DIR, 'normal_test.zip');
const zip = new AdmZip();
zip.addFile('lesson_video.mp4', TEST_DATA);
zip.writeZip(normalZipPath);

const t0 = performance.now();
const readNormal = new AdmZip(normalZipPath);
const entries = readNormal.getEntries();
const normalBytes = entries[0].getData();
const t1 = performance.now();

const normalDurationSec = (t1 - t0) / 1000;
const normalThroughputMBs = (FILE_SIZE_MB / normalDurationSec).toFixed(2);
console.log(`[1] Normal ZIP Extraction Throughput: ${normalThroughputMBs} MB/s (${normalDurationSec.toFixed(3)}s)`);

// 2. Measure 7z-wasm software decryption (as currently implemented in zipImporter.ts:334)
async function measure7zWasm() {
  try {
    const SevenZipModule = await import('../apps/client/node_modules/7z-wasm/7zz.es6.js');
    const SevenZip = SevenZipModule.default || SevenZipModule;

    // First create a password-protected 7z/zip using 7z-wasm or measure virtual FS operations
    const stdoutLogs = [];
    const stderrLogs = [];
    const sz = await SevenZip({
      print: (txt) => stdoutLogs.push(txt),
      printErr: (txt) => stderrLogs.push(txt),
    });

    const memArchive = '/bench.7z';
    const stagingDir = '/staging_bench';
    
    // Simulate current zipImporter.ts workflow:
    // a) Write buffer to Emscripten FS
    const tWrite0 = performance.now();
    sz.FS.writeFile('/source.bin', TEST_DATA);
    sz.FS.mkdir(stagingDir);
    // Create encrypted 7z in WASM memory
    sz.callMain(['a', memArchive, '/source.bin', `-p${PASSWORD}`, '-y']);
    const tWrite1 = performance.now();

    // b) Measure extraction & decryption
    const tExtract0 = performance.now();
    const exitCode = sz.callMain(['x', memArchive, `-o${stagingDir}`, `-p${PASSWORD}`, '-y']);
    // c) Read back from virtual FS into JS memory
    const readBytes = sz.FS.readFile(`${stagingDir}/source.bin`);
    const blob = new Blob([readBytes]);
    const tExtract1 = performance.now();

    const wasmDurationSec = (tExtract1 - tExtract0) / 1000;
    const wasmThroughputMBs = (FILE_SIZE_MB / wasmDurationSec).toFixed(2);
    const slowdownRatio = (parseFloat(normalThroughputMBs) / parseFloat(wasmThroughputMBs)).toFixed(1);

    console.log(`[2] Current 7z-wasm Decryption Throughput: ${wasmThroughputMBs} MB/s (${wasmDurationSec.toFixed(3)}s)`);
    console.log(`[3] Measured Slowdown vs Normal ZIP: ${slowdownRatio}x slower`);

    // Clean up
    try {
      sz.FS.unlink(memArchive);
      sz.FS.unlink('/source.bin');
      sz.FS.unlink(`${stagingDir}/source.bin`);
      sz.FS.rmdir(stagingDir);
    } catch {}

    return {
      normalThroughputMBs,
      wasmThroughputMBs,
      slowdownRatio,
    };
  } catch (err) {
    console.warn('WASM measurement error:', err.message);
    return null;
  } finally {
    try { fs.rmSync(BENCH_DIR, { recursive: true, force: true }); } catch {}
  }
}

measure7zWasm();
