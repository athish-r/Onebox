import express from "express";
import { searchEmails } from "../services/elasticService";
import { categorizeEmail } from "../services/aiService";

const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint.
 */
router.get("/health", (req, res) => {
  res.json({ ok: true, message: "Server running" });
});

/**
 * GET /api/search
 * Search emails in Elasticsearch with optional filters.
 * Query params:
 *  - q: full-text query
 *  - account: filter by IMAP account label
 *  - folder: filter by folder name
 *  - tag: filter by AI classification
 */
router.get("/search", async (req, res) => {
  try {
    const { q, account, folder, tag } = req.query;

    const results = await searchEmails({
      q: q as string,
      account: account as string,
      folder: folder as string,
      tag: tag as string,
    });

    res.json({
      ok: true,
      count: results.length,
      results,
    });
  } catch (err: any) {
    console.error("❌ Error in /api/search:", err.message || err);
    res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
});

/**
 * POST /api/categorize
 * Test AI categorization on-demand.
 * Body: { subject: string, body: string }
 */
router.post("/categorize", async (req, res) => {
  try {
    const { subject, body } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ ok: false, error: "Missing subject or body" });
    }

    const category = await categorizeEmail(subject, body);

    res.json({ ok: true, category });
  } catch (err: any) {
    console.error("❌ Error in /api/categorize:", err.message || err);
    res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
});

export default router;
