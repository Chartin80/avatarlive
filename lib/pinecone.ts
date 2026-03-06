// ==============================================
// PINECONE VECTOR STORE CLIENT
// RAG support with character-specific namespaces
// ==============================================

import { Pinecone, type RecordMetadata } from "@pinecone-database/pinecone";
import type { RAGChunk, RAGChunkMetadata } from "@/types";

// Embedding dimensions (OpenAI text-embedding-3-small)
const EMBEDDING_DIMENSION = 1536;
const TOP_K_DEFAULT = 5;

// Create Pinecone client
export function createPineconeClient(apiKey: string): Pinecone {
  return new Pinecone({ apiKey });
}

// Get or create index
export async function getIndex(client: Pinecone, indexName: string) {
  const existingIndexes = await client.listIndexes();
  const indexExists = existingIndexes.indexes?.some((i) => i.name === indexName);

  if (!indexExists) {
    console.log(`[Pinecone] Creating index: ${indexName}`);
    await client.createIndex({
      name: indexName,
      dimension: EMBEDDING_DIMENSION,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
    });

    // Wait for index to be ready
    await waitForIndexReady(client, indexName);
  }

  return client.index(indexName);
}

// Wait for index to be ready
async function waitForIndexReady(
  client: Pinecone,
  indexName: string,
  maxWaitMs: number = 60000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const description = await client.describeIndex(indexName);
    if (description.status?.ready) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Index creation timed out");
}

// Query vectors for RAG context
export async function queryRAGContext(
  client: Pinecone,
  indexName: string,
  namespace: string,
  queryEmbedding: number[],
  topK: number = TOP_K_DEFAULT
): Promise<RAGChunk[]> {
  const index = client.index(indexName);
  const ns = index.namespace(namespace);

  const results = await ns.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  });

  return (
    results.matches?.map((match) => ({
      id: match.id,
      content: (match.metadata as RAGChunkMetadata & RecordMetadata)?.content as string || "",
      metadata: {
        characterId: String((match.metadata as RAGChunkMetadata & RecordMetadata)?.characterId || ""),
        sourceFile: String((match.metadata as RAGChunkMetadata & RecordMetadata)?.sourceFile || ""),
        chunkIndex: Number((match.metadata as RAGChunkMetadata & RecordMetadata)?.chunkIndex || 0),
        pageNumber: (match.metadata as RAGChunkMetadata & RecordMetadata)?.pageNumber
          ? Number((match.metadata as RAGChunkMetadata & RecordMetadata)?.pageNumber)
          : undefined,
      },
      score: match.score || 0,
    })) || []
  );
}

// Upsert document chunks
export async function upsertChunks(
  client: Pinecone,
  indexName: string,
  namespace: string,
  chunks: Array<{
    id: string;
    content: string;
    embedding: number[];
    metadata: RAGChunkMetadata;
  }>
): Promise<void> {
  const index = client.index(indexName);
  const ns = index.namespace(namespace);

  // Batch upsert (Pinecone recommends max 100 vectors per request)
  const batchSize = 100;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    await ns.upsert(
      batch.map((chunk) => ({
        id: chunk.id,
        values: chunk.embedding,
        metadata: {
          content: chunk.content,
          ...chunk.metadata,
        },
      }))
    );

    console.log(
      `[Pinecone] Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`
    );
  }
}

// Delete all vectors in a namespace (for re-indexing)
export async function deleteNamespace(
  client: Pinecone,
  indexName: string,
  namespace: string
): Promise<void> {
  const index = client.index(indexName);
  const ns = index.namespace(namespace);

  await ns.deleteAll();
  console.log(`[Pinecone] Deleted namespace: ${namespace}`);
}

// Get namespace stats
export async function getNamespaceStats(
  client: Pinecone,
  indexName: string,
  namespace: string
): Promise<{ vectorCount: number }> {
  const index = client.index(indexName);
  const stats = await index.describeIndexStats();

  const namespaceStats = stats.namespaces?.[namespace];
  return {
    vectorCount: namespaceStats?.recordCount || 0,
  };
}

// Text chunking utilities
export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50
): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        // Keep overlap from previous chunk
        const words = currentChunk.split(" ");
        const overlapWords = words.slice(-Math.ceil(overlap / 5)).join(" ");
        currentChunk = overlapWords + " " + sentence;
      } else {
        // Single sentence longer than chunk size
        chunks.push(sentence.trim());
        currentChunk = "";
      }
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Create namespace name from character slug
export function createNamespace(characterSlug: string): string {
  return `character_${characterSlug.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
}
