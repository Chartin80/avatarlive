import { NextRequest, NextResponse } from "next/server";

// ==============================================
// D-ID TALK ENDPOINT
// Send text to be spoken by the avatar
// ==============================================

const DID_API_URL = "https://api.d-id.com";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { streamId, sessionId, text, voiceId, voiceProvider } = body;

    if (!streamId || !sessionId || !text) {
      return NextResponse.json(
        { error: "Stream ID, Session ID, and text are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.DID_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "D-ID API key not configured" },
        { status: 500 }
      );
    }

    // LOW LATENCY: Use fluent streaming
    const response = await fetch(`${DID_API_URL}/talks/streams/${streamId}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        script: {
          type: "text",
          input: text,
          provider: {
            type: voiceProvider || "microsoft",
            voice_id: voiceId || "en-US-JennyNeural",
          },
        },
        config: {
          fluent: true, // LOW LATENCY: Enable fluent streaming
          pad_audio: 0,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[D-ID] Talk error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to send talk request" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[D-ID] Talk error:", error);
    return NextResponse.json(
      { error: "Failed to process talk request" },
      { status: 500 }
    );
  }
}
