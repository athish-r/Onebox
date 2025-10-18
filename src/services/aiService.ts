import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type EmailCategory =
  | "Interested"
  | "Meeting Booked"
  | "Not Interested"
  | "Spam"
  | "Out of Office";

/**
 * Categorizes an email based on its subject and body content.
 * Uses GPT model for classification.
 */
export async function categorizeEmail(
  subject: string,
  body: string
): Promise<EmailCategory> {
  const prompt = `
You are an AI email assistant. Categorize the following email into exactly ONE of the following categories:
1. Interested
2. Meeting Booked
3. Not Interested
4. Spam
5. Out of Office

Email Subject: "${subject}"
Email Body: """${body.slice(0, 1000)}"""

Respond with only one label (exactly as written above).
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // lightweight and fast for classification
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 5,
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";

    // Normalize and validate response
    const validLabels: EmailCategory[] = [
      "Interested",
      "Meeting Booked",
      "Not Interested",
      "Spam",
      "Out of Office",
    ];

    const matched = validLabels.find((label) =>
      text.toLowerCase().includes(label.toLowerCase())
    );

    if (!matched) {
      console.warn("⚠️ Unrecognized AI label, defaulting to 'Not Interested':", text);
      return "Not Interested";
    }

    console.log(`🤖 [AI] Categorized email as: ${matched}`);
    return matched;
  } catch (err: any) {
    console.error("❌ Error categorizing email:", err.message || err);
    return "Not Interested";
  }
}
