import { ImapFlow } from "imapflow";
import dotenv from "dotenv";
import pino from "pino";
import { simpleParser } from "mailparser";
import { categorizeEmail } from "./aiService";
import { indexEmail } from "./elasticService";
import { sendSlackNotification } from "./slackService";
import { triggerWebhook } from "./webhookService";
import { EmailDoc } from "../types/index.d";

dotenv.config();
const logger = pino({ transport: { target: "pino-pretty" } });

/**
 * Parses .env config for multiple IMAP accounts
 */
function getImapAccounts() {
  const accounts: any[] = [];
  let i = 1;
  while (process.env[`IMAP_${i}_HOST`]) {
    accounts.push({
      host: process.env[`IMAP_${i}_HOST`],
      port: Number(process.env[`IMAP_${i}_PORT`] || 993),
      secure: process.env[`IMAP_${i}_SECURE`] === "true",
      auth: {
        user: process.env[`IMAP_${i}_USER`],
        pass: process.env[`IMAP_${i}_PASS`],
      },
      label: process.env[`IMAP_${i}_LABEL`] || `account_${i}`,
    });
    i++;
  }
  return accounts;
}

const FETCH_DAYS = parseInt(process.env.FETCH_DAYS || "30", 10);

/**
 * Main entry — connects to all IMAP accounts
 */
export async function startImapSync() {
  const accounts = getImapAccounts();

  if (accounts.length === 0) {
    logger.error("❌ No IMAP accounts configured in .env");
    return;
  }

  for (const acc of accounts) {
    connectAccount(acc).catch((err) => {
      logger.error(`IMAP connection failed for ${acc.label}:`, err.message || err);
    });
  }
}

/**
 * Connects and starts listening for a single IMAP account
 */
async function connectAccount(account: any) {
  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: account.secure,
    auth: account.auth,
    logger: false,
  });

  logger.info(`🔌 Connecting IMAP account: ${account.label}`);

  await client.connect();
  logger.info(`✅ Connected to IMAP: ${account.label}`);

  await client.mailboxOpen("INBOX");

  // Initial fetch (last 30 days)
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - FETCH_DAYS);

 const searchCriteria = { since: sinceDate };

  const messages = await client.search(searchCriteria, { uid: true });

 if (!Array.isArray(messages) || messages.length === 0) {
  logger.info(`📨 [${account.label}] No recent emails found (last ${FETCH_DAYS} days)`);
  return;
}

logger.info(
  `📨 [${account.label}] Found ${messages.length} recent emails (last ${FETCH_DAYS} days)`
);

  for await (const msg of client.fetch(messages, { uid:true,source: true })) {
  if (!msg.source) continue; 
  await handleEmail(msg.source, account,msg.uid);
}

  // Real-time listener using IDLE mode
  client.on("exists", async () => {
  logger.info(`📬 New message detected for ${account.label}`);

  if (client.mailbox === false) {
    logger.warn(`⚠️ Mailbox not available yet.`);
    return;
  }
  const lock = await client.getMailboxLock("INBOX");
  try {
    const latest = await client.fetchOne(client.mailbox.exists, { source: true });

if (latest !== false && latest.source) {
  await handleEmail(latest.source, account, latest.uid);
} else {
  logger.warn(`⚠️ [${account.label}] No source found for latest message`);
}

  } catch (err) {
    logger.error( {err},`❌ Error fetching latest email for ${account.label}:`);
  } finally {
    lock.release();
  }
});


  // Handle disconnects gracefully
  client.on("close", () => {
    logger.warn(`⚠️ IMAP connection closed for ${account.label}, reconnecting...`);
    setTimeout(() => connectAccount(account), 10000);
  });
}

/**
 * Handles a single raw email message
 */
async function handleEmail(source: Buffer, account: any,uid:number) {
  try {
    const parsed = await simpleParser(source);
    const subject = parsed.subject || "(no subject)";
    const from = parsed.from?.text??  "(unknown sender)";
    const to = Array.isArray(parsed.to)? parsed.to.map((t) => t.text).join(", "): parsed.to?.text ?? "";
    const date = parsed.date || new Date();
    const htmlText =
       typeof parsed.html === "string"
    ? parsed.html.replace(/<[^>]*>/g, "")
    : "";
      const snippet =
  parsed.text?.substring(0, 300) ||
  htmlText.substring(0, 300) ||
  "";


    const body = parsed.text || parsed.html || "";

    const emailDoc: EmailDoc = {
      id: `${account.label}-${Date.now()}`,
      account: account.label,
      folder: "INBOX",
      uid,
      subject,
      from,
      to:[],
      date,
      snippet,
      body,
      tags: [],
    };

    // 🧠 AI categorization
    const category = await categorizeEmail(subject, body);
    emailDoc.tags = [category];

    // 🧾 Index into Elasticsearch
    await indexEmail(emailDoc);

    // 🚀 Notify Slack & webhook if Interested
    if (category === "Interested") {
      await sendSlackNotification(emailDoc);
      await triggerWebhook(emailDoc);
    }

    logger.info(
      `📥 [${account.label}] Indexed email: "${subject}" → ${category}`
    );
  } catch (err: any) {
    logger.error("❌ Error processing email:", err.message || err);
  }
}
