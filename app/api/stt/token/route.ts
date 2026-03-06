import { NextResponse } from "next/server";

// ==============================================
// DEEPGRAM TOKEN ENDPOINT
// Returns API key for client-side WebSocket connection
// ==============================================

export async function GET() {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Deepgram API key not configured" },
      { status: 500 }
    );
  }

  // In production, you would create a temporary scoped token
  // For now, we return the API key (ensure HTTPS in production)
  return NextResponse.json({
    key: apiKey,
    // Add expiry for temporary tokens
    expiresAt: Date.now() + 3600000, // 1 hour
  });
}
