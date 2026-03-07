// ==============================================
// ANTHROPIC CLAUDE CLIENT WITH RAG SUPPORT
// Low-latency streaming responses with context
// ==============================================

import Anthropic from "@anthropic-ai/sdk";
import type { Character, Message, RAGChunk } from "@/types";

// LOW LATENCY: Using Haiku 4.5 for fastest responses
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const SONNET_MODEL = "claude-sonnet-4-6";

interface ClaudeStreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

// Create Anthropic client
export function createClaudeClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

// Build system prompt for character
export function buildCharacterSystemPrompt(
  character: Character,
  ragContext: RAGChunk[]
): string {
  const contextText = ragContext.length > 0
    ? ragContext.map((chunk) => chunk.content).join("\n\n---\n\n")
    : "No specific context available for this query.";

  return `You are ${character.name}, ${character.bio}

EXPERTISE: ${character.expertise}

YOUR PERSONALITY:
- Speak warmly and conversationally, like a friendly expert
- Use natural language with occasional expressions that match your character
- Keep responses concise (2-4 sentences) for a conversational flow
- Show enthusiasm about your area of expertise
- Be helpful and encouraging

IMPORTANT RULES:
- NEVER mention that you are an AI, chatbot, or language model
- NEVER say "As an AI" or similar phrases
- NEVER include action descriptions like *leans back* or *smiles* or any text in asterisks
- Only output spoken dialogue, no stage directions or actions
- Stay in character at all times
- Only answer questions related to your expertise using the provided context
- If a question is outside your expertise, gently redirect to your area
- If you don't know something, say so naturally without breaking character

KNOWLEDGE CONTEXT (use ONLY this information to answer):
${contextText}

Remember: You are ${character.name}. Respond as if you are actually this character having a real conversation.`;
}

// Format conversation history for Claude
export function formatConversationHistory(
  messages: Message[]
): Anthropic.MessageParam[] {
  return messages
    .filter((m) => m.role !== "system")
    .slice(-10) // Keep last 10 messages for context
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
}

// Stream response from Claude
export async function streamClaudeResponse(
  client: Anthropic,
  character: Character,
  userMessage: string,
  ragContext: RAGChunk[],
  conversationHistory: Message[],
  callbacks: ClaudeStreamCallbacks,
  useHighQuality: boolean = false
): Promise<void> {
  try {
    // LOW LATENCY: Use Haiku by default, Sonnet for complex queries
    const model = useHighQuality ? SONNET_MODEL : DEFAULT_MODEL;

    const systemPrompt = buildCharacterSystemPrompt(character, ragContext);
    const messages = formatConversationHistory(conversationHistory);

    // Add current user message
    messages.push({
      role: "user",
      content: userMessage,
    });

    // LOW LATENCY: Using Haiku for fastest responses
    const stream = await client.messages.stream({
      model,
      max_tokens: 300, // Keep responses concise for conversation
      system: systemPrompt,
      messages,
    });

    let fullText = "";

    // Handle streaming tokens
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        const token = event.delta.text;
        fullText += token;
        callbacks.onToken(token);
      }
    }

    callbacks.onComplete(fullText);
  } catch (error) {
    callbacks.onError(error as Error);
    throw error;
  }
}

// Non-streaming response (for fallback)
export async function getClaudeResponse(
  client: Anthropic,
  character: Character,
  userMessage: string,
  ragContext: RAGChunk[],
  conversationHistory: Message[],
  useHighQuality: boolean = false
): Promise<string> {
  const model = useHighQuality ? SONNET_MODEL : DEFAULT_MODEL;
  const systemPrompt = buildCharacterSystemPrompt(character, ragContext);
  const messages = formatConversationHistory(conversationHistory);

  messages.push({
    role: "user",
    content: userMessage,
  });

  const response = await client.messages.create({
    model,
    max_tokens: 300,
    system: systemPrompt,
    messages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "";
}

// Analyze if query needs high-quality response
export function shouldUseHighQuality(query: string): boolean {
  const complexIndicators = [
    "explain",
    "why",
    "how does",
    "compare",
    "difference",
    "detailed",
    "technical",
    "in-depth",
  ];

  const lowerQuery = query.toLowerCase();
  return complexIndicators.some((indicator) => lowerQuery.includes(indicator));
}

// Generate greeting for character
export async function generateGreeting(
  client: Anthropic,
  character: Character,
  userName?: string
): Promise<string> {
  const greeting = character.greeting.replace(
    "{userName}",
    userName || "there"
  );

  // Use the character's pre-defined greeting if available
  if (greeting) {
    return greeting;
  }

  // Otherwise generate one
  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 100,
    system: `You are ${character.name}, ${character.bio}. Generate a warm, friendly greeting to start a conversation. Keep it to 1-2 sentences. ${userName ? `The user's name is ${userName}.` : ""}`,
    messages: [
      {
        role: "user",
        content: "Generate a greeting.",
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.type === "text" ? textBlock.text : character.greeting;
}
