import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";
import { EmailDoc } from "../types/index.d";
import { estypes } from "@elastic/elasticsearch";
dotenv.config();

const ELASTIC_URL = process.env.ELASTIC_URL || "http://localhost:9200";
const INDEX = "emails";

// Initialize Elasticsearch client
export const es = new Client({ node: ELASTIC_URL });

/**
 * Ensures the 'emails' index exists with a mapping suitable for search.
 */
export async function ensureIndex() {
  try {
    const exists = await es.indices.exists({ index: INDEX });

    if (!exists) {
      console.log("🧱 Creating Elasticsearch index:", INDEX);

      await es.indices.create({
        index: INDEX,
        body: {
          mappings: {
            properties: {
              account: { type: "keyword" },
              folder: { type: "keyword" },
              subject: { type: "text" },
              from: { type: "keyword" },
              to: { type: "keyword" },
              date: { type: "date" },
              snippet: { type: "text" },
              body: { type: "text" },
              tags: { type: "keyword" },
            },
          },
        },
      }as estypes.IndicesCreateRequest);
    } else {
      console.log("✅ Elasticsearch index already exists:", INDEX);
    }
  } catch (err: any) {
    console.error("❌ Error ensuring Elasticsearch index:", err.message || err);
  }
}

/**
 * Indexes or updates a single email document in Elasticsearch.
 */
export async function indexEmail(doc: EmailDoc) {
  try {
    await es.index({
      index: INDEX,
      id: doc.id,
      document: doc,
      refresh: true, // refresh immediately for testing/demo
    });
  } catch (err: any) {
    console.error("❌ Error indexing email:", err.message || err);
  }
}

/**
 * Searches emails with optional filters:
 * - q: full-text term (subject/snippet/body)
 * - account: filter by account label
 * - folder: filter by folder name
 * - tag: filter by AI label
 */
export async function searchEmails(query: {
  q?: string | string[];
  account?: string | string[];
  folder?: string | string[];
  tag?: string | string[];
}) {
  try {
    const must: any[] = [];

    if (query.q) {
      must.push({
        multi_match: {
          query: query.q,
          fields: ["subject", "snippet", "body"],
        },
      });
    }

    if (query.account)
      must.push({ term: { account: String(query.account) } });
    if (query.folder) must.push({ term: { folder: String(query.folder) } });
    if (query.tag) must.push({ term: { tags: String(query.tag) } });

    const body =
      must.length > 0 ? { query: { bool: { must } } } : { query: { match_all: {} } };

    const res = await es.search({
      index: INDEX,
      body:body as Record<string, any>,
      size: 50,
    });

    return res.hits.hits.map((h: any) => h._source);
  } catch (err: any) {
    console.error("❌ Elasticsearch search error:", err.message || err);
    return [];
  }
}
