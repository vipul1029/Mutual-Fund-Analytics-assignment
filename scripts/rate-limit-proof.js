import { request } from "undici";

const baseUrl = process.env.PROOF_BASE_URL ?? "http://localhost:3000";
const calls = Number(process.env.PROOF_CALLS ?? 30);
const sleepMs = Number(process.env.PROOF_SLEEP_MS ?? 250);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readMetrics() {
  const response = await request(`${baseUrl}/metrics`, { method: "GET" });
  const payload = await response.body.json();
  return payload;
}

async function triggerOneCall() {
  const response = await request(`${baseUrl}/sync/status`, { method: "GET" });
  await response.body.text();
}

async function run() {
  console.log("rate_limit_proof_start");
  for (let i = 0; i < calls; i += 1) {
    await triggerOneCall();
    const metrics = await readMetrics();
    const now = new Date().toISOString();
    const ok =
      metrics.per_second <= metrics.limits.per_second &&
      metrics.per_minute <= metrics.limits.per_minute &&
      metrics.per_hour <= metrics.limits.per_hour;
    console.log(
      `[${now}] PROOF_CALL=${i + 1} sec=${metrics.per_second}/${metrics.limits.per_second} min=${metrics.per_minute}/${metrics.limits.per_minute} hour=${metrics.per_hour}/${metrics.limits.per_hour} ok=${ok}`
    );
    if (!ok) {
      throw new Error("Rate limit invariant violated");
    }
    await sleep(sleepMs);
  }
  console.log("rate_limit_proof_complete");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
