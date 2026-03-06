// ==============================================
// TEXT EMBEDDINGS
// Using OpenAI text-embedding-3-small for Pinecone
// ==============================================

import OpenAI from "openai";

// LOW LATENCY: text-embedding-3-small is fastest
const EMBEDDING_MODEL = "text-embedding-3-small";

let openaiClient: OpenAI | null = null;

// Initialize OpenAI client
export function initEmbeddingsClient(apiKey: string): void {
  openaiClient = new OpenAI({ apiKey });
}

// Get embedding for a single text
export async function getEmbedding(text: string): Promise<number[]> {
  if (!openaiClient) {
    throw new Error("Embeddings client not initialized");
  }

  // Truncate text if too long (max ~8000 tokens for this model)
  const truncatedText = text.slice(0, 8000);

  const response = await openaiClient.embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncatedText,
  });

  return response.data[0].embedding;
}

// Get embeddings for multiple texts (batched)
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (!openaiClient) {
    throw new Error("Embeddings client not initialized");
  }

  // Truncate texts
  const truncatedTexts = texts.map((t) => t.slice(0, 8000));

  // Batch in groups of 100 (OpenAI limit is 2048 but being conservative)
  const batchSize = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < truncatedTexts.length; i += batchSize) {
    const batch = truncatedTexts.slice(i, i + batchSize);

    const response = await openaiClient.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });

    allEmbeddings.push(...response.data.map((d) => d.embedding));
  }

  return allEmbeddings;
}

// Simple fallback embedding using character n-grams
// Used when OpenAI API is not available (development)
export function getSimpleEmbedding(text: string, dimension: number = 1536): number[] {
  const hash = (str: string): number => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return h;
  };

  const embedding: number[] = new Array(dimension).fill(0);
  const words = text.toLowerCase().split(/\s+/);

  for (const word of words) {
    for (let n = 1; n <= 3; n++) {
      for (let i = 0; i <= word.length - n; i++) {
        const ngram = word.slice(i, i + n);
        const idx = Math.abs(hash(ngram)) % dimension;
        embedding[idx] += 1;
      }
    }
  }

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dimension; i++) {
      embedding[i] /= magnitude;
    }
  }

  return embedding;
}
