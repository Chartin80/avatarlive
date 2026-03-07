import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Pinecone } from "@pinecone-database/pinecone";
import type { Character, Message, RAGChunk } from "@/types";
import {
  buildCharacterSystemPrompt,
  formatConversationHistory,
  shouldUseHighQuality,
} from "@/lib/claude";
import { queryRAGContext } from "@/lib/pinecone";
import { getEmbedding, initEmbeddingsClient } from "@/lib/embeddings";

// ==============================================
// CHAT API ENDPOINT
// Handles RAG + Claude streaming responses
// LOW LATENCY: Uses Haiku for fastest responses
// ==============================================

// Lazy initialization of clients (initialized on first request)
let anthropic: Anthropic | null = null;
let pinecone: Pinecone | null = null;
let embeddingsInitialized = false;

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

function getPineconeClient(): Pinecone {
  if (!pinecone) {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pinecone;
}

function ensureEmbeddingsInitialized(): void {
  if (!embeddingsInitialized && process.env.OPENAI_API_KEY) {
    initEmbeddingsClient(process.env.OPENAI_API_KEY);
    embeddingsInitialized = true;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      character,
      conversationHistory,
      bypassRAG = false,
    }: {
      message: string;
      character: Character;
      conversationHistory: Message[];
      bypassRAG?: boolean;
    } = body;

    if (!message || !character) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // LOW LATENCY: Run RAG retrieval in parallel with other setup
    let ragContext: RAGChunk[] = [];

    // Check if Creative Mode is enabled (bypass RAG/Pinecone)
    if (bypassRAG) {
      console.log("🎨 CREATIVE MODE ENABLED — Pinecone bypassed, character responds freely");
      ragContext = [];
    } else {
      // Initialize clients lazily
      ensureEmbeddingsInitialized();

      try {
        // Get embedding for the query
        const queryEmbedding = await getEmbedding(message);

        // Query Pinecone for relevant context
        ragContext = await queryRAGContext(
          getPineconeClient(),
          process.env.PINECONE_INDEX!,
          character.pineconeNamespace,
          queryEmbedding,
          5 // Top 5 chunks
        );

        console.log(`[RAG] Found ${ragContext.length} relevant chunks`);
      } catch (ragError) {
        console.warn("[RAG] Failed to retrieve context:", ragError);
        // Continue without RAG context
      }
    }

    // Determine model based on query complexity
    const useHighQuality = shouldUseHighQuality(message);
    const model = useHighQuality
      ? "claude-3-5-sonnet-20241022"
      : "claude-3-haiku-20240307";

    console.log(
      `[Chat] Using model: ${model}, RAG chunks: ${ragContext.length}`
    );

    // Build system prompt with RAG context
    const systemPrompt = buildCharacterSystemPrompt(character, ragContext);

    // Format conversation history
    const messages = formatConversationHistory(conversationHistory);
    messages.push({ role: "user", content: message });

    // Create streaming response
    // LOW LATENCY: Using Haiku for fastest responses
    const stream = await getAnthropicClient().messages.stream({
      model,
      max_tokens: 300, // Keep responses concise for conversation
      system: systemPrompt,
      messages,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const chunk = JSON.stringify({
                type: "text",
                content: event.delta.text,
              }) + "\n";
              controller.enqueue(encoder.encode(chunk));
            }
          }

          // Send completion signal
          const finalMessage = await stream.finalMessage();
          const completeChunk = JSON.stringify({
            type: "complete",
            usage: finalMessage.usage,
            ragChunksUsed: ragContext.length,
          }) + "\n";
          controller.enqueue(encoder.encode(completeChunk));

          controller.close();
        } catch (error) {
          console.error("[Chat] Streaming error:", error);
          const errorMessage = error instanceof Error ? error.message : "Streaming failed";
          const errorChunk = JSON.stringify({
            type: "error",
            error: errorMessage,
          }) + "\n";
          controller.enqueue(encoder.encode(errorChunk));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[Chat] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
