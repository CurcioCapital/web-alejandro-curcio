// rag.js — server-only retrieval helpers for /api/chat.
//
// Ported from sitio-chat/retrieve.mjs (same cosine top-k logic), pointed at
// the copies under src/chat-data/ instead. Never imported from a .astro
// component's client-side script or from anything that ships to the
// browser — only from src/pages/api/chat.js, which runs on the server.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'chat-data');
const EMBED_MODEL = 'openai/text-embedding-3-small';
const CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const EMBEDDINGS_URL = 'https://openrouter.ai/api/v1/embeddings';

let _chunks = null;
let _index = null;
let _systemPrompt = null;
let _chatConfig = null;

/** Loads (and caches) chunks.json + index.json + system-prompt.md + chat-config.json. */
export function loadData() {
  if (_chunks && _index && _systemPrompt && _chatConfig) {
    return { chunks: _chunks, index: _index, systemPrompt: _systemPrompt, chatConfig: _chatConfig };
  }
  _chunks = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'chunks.json'), 'utf-8'));
  _index = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'index.json'), 'utf-8'));
  _systemPrompt = fs.readFileSync(path.join(DATA_DIR, 'system-prompt.md'), 'utf-8');
  _chatConfig = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'chat-config.json'), 'utf-8'));
  return { chunks: _chunks, index: _index, systemPrompt: _systemPrompt, chatConfig: _chatConfig };
}

/** True once chunks.json/index.json are present and non-empty (dev/deploy sanity check). */
export function hasIndex() {
  try {
    const { chunks, index } = loadData();
    return Array.isArray(chunks) && chunks.length > 0 && Array.isArray(index) && index.length > 0;
  } catch {
    return false;
  }
}

/** Cosine similarity between two equal-length numeric arrays. */
export function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Top-k chunks most similar to a query embedding vector, sorted by score desc. */
export function retrieve(queryVector, { k = 6 } = {}) {
  const { chunks, index } = loadData();
  const chunkById = new Map(chunks.map((c) => [c.id, c]));
  const scored = index.map((entry) => ({
    id: entry.id,
    score: cosineSimilarity(queryVector, entry.vector),
    chunk: chunkById.get(entry.id),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

/** Embeds a single query string via OpenRouter (text-embedding-3-small). */
export async function embedQuery(text, apiKey) {
  const res = await fetch(EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: [text] }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter embeddings error ${res.status}: ${body}`);
  }
  const json = await res.json();
  return json.data[0].embedding;
}

/**
 * Calls DeepSeek V4 Flash via OpenRouter chat completions with the given
 * message list. Params come straight from chat-config.json (temperature,
 * frequency_penalty, max_tokens, reasoning off, model id) — no provider
 * pin, per that file's explicit note (structured/consumer runtime, allow
 * default routing).
 */
export async function chatComplete(messages, apiKey) {
  const { chatConfig } = loadData();
  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: chatConfig.model,
      messages,
      temperature: chatConfig.temperature,
      frequency_penalty: chatConfig.frequency_penalty,
      max_tokens: chatConfig.max_tokens,
      reasoning: chatConfig.reasoning,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter chat error ${res.status}: ${body}`);
  }
  const json = await res.json();
  const choice = json.choices?.[0];
  return {
    text: choice?.message?.content ?? '',
    provider: json.provider,
    finishReason: choice?.finish_reason,
  };
}

/** Builds the {label, detail} source list for a set of retrieved chunks, deduped by detail. */
export function sourcesFromHits(hits) {
  const seen = new Set();
  const sources = [];
  for (const hit of hits) {
    const detail = hit.chunk?.source_detail;
    if (!detail || seen.has(detail)) continue;
    seen.add(detail);
    sources.push({ label: hit.chunk?.source_page ?? detail, detail });
  }
  return sources;
}
