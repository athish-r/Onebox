import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import pino from "pino";
import apiRouter from "./routes/api";
import { ensureIndex } from "./services/elasticService";
import { startImapSync } from "./services/imapService";

dotenv.config();

const logger = pino({ transport: { target: "pino-pretty" } });
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use("/api", apiRouter);

// Health route (fallback)
app.get("/", (req, res) => {
  res.json({ ok: true, message: "AI Email Sync Backend Running" });
});

(async () => {
  try {
    // 1️⃣ Ensure Elasticsearch index is ready
    await ensureIndex();

    // 2️⃣ Start IMAP Sync for multiple accounts (real-time)
    await startImapSync();

    // 3️⃣ Start Express server
    app.listen(PORT, () => {
      logger.info(`🚀 Server listening on http://localhost:${PORT}`);
    });
  } catch (err: any) {
    logger.error("❌ Fatal startup error:", err.message || err);
    process.exit(1);
  }
})();
