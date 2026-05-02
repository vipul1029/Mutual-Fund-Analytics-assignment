import { request } from "undici";

const baseUrl = process.env.BENCHMARK_BASE_URL ?? "http://localhost:3000";
const iterations = Number(process.env.BENCHMARK_ITERATIONS ?? 20);

const endpoints = [
  "/funds",
  "/funds/rank?category=Equity:%20Mid%20Cap%20Direct%20Growth&window=3Y&sort_by=median_return&limit=5",
  "/sync/status",
  "/metrics"
];

async function hit(path) {
  const started = performance.now();
  const response = await request(`${baseUrl}${path}`, { method: "GET" });
  await response.body.text();
  const elapsed = performance.now() - started;
  return { status: response.statusCode, elapsed };
}

async function run() {
  const all = [];
  for (const path of endpoints) {
    const samples = [];
    for (let i = 0; i < iterations; i += 1) {
      const result = await hit(path);
      samples.push(result.elapsed);
      all.push(result.elapsed);
      if (result.status >= 400) {
        throw new Error(`Benchmark failed on ${path}: HTTP ${result.status}`);
      }
    }
    const avg = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    console.log(`${path} avg=${avg.toFixed(2)}ms p95=${samples.sort((a, b) => a - b)[Math.floor(0.95 * (samples.length - 1))].toFixed(2)}ms`);
  }
  const avgTotal = all.reduce((sum, value) => sum + value, 0) / all.length;
  console.log(`avg_response_time=${avgTotal.toFixed(2)}ms`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
