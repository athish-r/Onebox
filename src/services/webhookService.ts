import axios from "axios";
import dotenv from "dotenv";
import { EmailDoc } from "../types/index.d";

dotenv.config();

const WEBHOOK_TARGET = process.env.WEBHOOK_TARGET;

/**
 * Trigger an external webhook (like webhook.site or Zapier)
 * when a new "Interested" email is detected.
 * 
 * @param email Email document containing subject, sender, snippet, etc.
 */
export async function triggerWebhook(email: EmailDoc) {
  if (!WEBHOOK_TARGET) {
    console.warn("⚠️ WEBHOOK_TARGET not configured. Skipping webhook trigger.");
    return;
  }

  try {
    const payload = {
      event: "new_interested_email",
      timestamp: new Date().toISOString(),
      data: {
        subject: email.subject || "(no subject)",
        from: email.from || "(unknown sender)",
        to: email.to || "(unknown recipient)",
        account: email.account,
        folder: email.folder,
        snippet: email.snippet?.slice(0, 500) || "",
        date: email.date,
        tags: email.tags,
      },
    };

    const res = await axios.post(WEBHOOK_TARGET, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });

    console.log(`🔗 [Webhook] Triggered successfully → ${WEBHOOK_TARGET}`);
    console.log(`   Response: ${res.status} ${res.statusText}`);
  } catch (err: any) {
    console.error("❌ [Webhook] Failed to trigger webhook:", err.message || err);
  }
}
