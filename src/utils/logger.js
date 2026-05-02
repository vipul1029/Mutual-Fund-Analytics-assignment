import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: "mf-analytics-backend",
    env: env.nodeEnv
  },
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    censor: "[REDACTED]"
  }
});
