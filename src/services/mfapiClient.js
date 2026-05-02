import { request } from "undici";
import { env } from "../config/env.js";
import { mfapiLimiter } from "./rateLimiter.js";
import { logger } from "../utils/logger.js";

const MAX_RETRIES = 4;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(path, attempt = 0) {
  const url = `${env.mfapiBaseUrl}${path}`;
  const schemeCode = path.split("/")[2] ?? "unknown";
  try {
    const response = await mfapiLimiter.schedule(async () =>
      request(url, {
        method: "GET",
        headersTimeout: 10_000,
        bodyTimeout: 15_000
      }),
      { schemeCode }
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.body.json();
    }

    if (RETRYABLE_STATUS.has(response.statusCode) && attempt < MAX_RETRIES) {
      const delay = Math.pow(2, attempt) * 250 + Math.floor(Math.random() * 100);
      await sleep(delay);
      return fetchJson(path, attempt + 1);
    }

    const body = await response.body.text();
    throw new Error(`MFAPI failed ${response.statusCode}: ${body.slice(0, 300)}`);
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      const delay = Math.pow(2, attempt) * 250 + Math.floor(Math.random() * 100);
      logger.warn({ error, path, attempt }, "MFAPI call failed, retrying");
      await sleep(delay);
      return fetchJson(path, attempt + 1);
    }
    throw error;
  }
}

export const mfapiClient = {
  getFundHistory(code) {
    return fetchJson(`/mf/${code}`);
  },
  getFundLatest(code) {
    return fetchJson(`/mf/${code}/latest`);
  },
  searchFunds(query) {
    return fetchJson(`/mf/search?q=${encodeURIComponent(query)}`);
  }
};
