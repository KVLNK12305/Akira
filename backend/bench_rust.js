import { generateRustKey } from './src/utils/rustEngine.js';

// Warm up the engine to let the JIT optimize
console.log('Warming up Rust Engine...');
for (let i = 0; i < 1000; i++) {
    generateRustKey();
}

const iterations = 500_000; // Let's test half a million keys

console.log(`\nStarting Benchmark: Generating ${iterations.toLocaleString()} keys using Rust FFI...`);

const start = performance.now();

for (let i = 0; i < iterations; i++) {
    generateRustKey();
}

const end = performance.now();
const durationMs = end - start;
const durationSec = durationMs / 1000;
const keysPerSec = iterations / durationSec;

console.log('\n--- Rust Engine Benchmark Results ---');
console.log(`Total Time:       ${durationMs.toFixed(2)} ms (${durationSec.toFixed(2)} seconds)`);
console.log(`Throughput:       ${keysPerSec.toLocaleString(undefined, { maximumFractionDigits: 2 })} keys / sec`);
console.log(`Latency (avg):    ${(durationMs / iterations).toFixed(6)} ms / key`);
