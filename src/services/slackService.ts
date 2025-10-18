import axios from "axios";
import dotenv from "dotenv";
import { EmailDoc } from "../types/index.d";

dotenv.config();

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

/**
 * Sends a Slack notification when an "Interested" email is received.
 * @param email Email document containing subject, sender, snippet, etc.
 */
export async function sendSlackNotification(email: EmailDoc) {
  if (!SLACK_WEBHOOK_URL) {
    console.warn("⚠️ SLACK_WEBHOOK_URL not configured. Skipping Slack notification.");
    return;
  }

  const message = {
    text: `📩 *New Interested Email Detected*`,
    attachments: [
      {
        color: "#36a64f",
        fields: [
          {
            title: "Subject",
            value: email.subject || "No subject",
            short: false,
          },
          {
            title: "From",
            value: email.from || "Unknown sender",
            short: true,
          },
          {
            title: "Account",
            value: email.account || "N/A",
            short: true,
          },
          {
            title: "Snippet",
            value:
              email.snippet?.substring(0, 200) || "(no preview available)",
            short: false,
          },
        ],
        footer: "AI Email Categorization System",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    await axios.post(SLACK_WEBHOOK_URL, message);
    console.log(`✅ [Slack] Notification sent for "${email.subject}"`);
  } catch (err: any) {
    console.error("❌ [Slack] Failed to send notification:", err.message || err);
  }
}
