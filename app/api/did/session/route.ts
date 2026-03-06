import { NextRequest, NextResponse } from "next/server";

// ==============================================
// D-ID SESSION MANAGEMENT
// Create and manage avatar streaming sessions
// ==============================================

const DID_API_URL = "https://api.d-id.com";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceUrl, voiceId: _voiceId } = body;

    if (!sourceUrl) {
      return NextResponse.json(
        { error: "Source URL is required" },
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

    // Create streaming session
    const response = await fetch(`${DID_API_URL}/talks/streams`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_url: sourceUrl,
        driver_url: "bank://lively/driver-06",
        stream_warmup: true,
        compatibility_mode: "auto",
        config: {
          stitch: true,
          fluent: true, // LOW LATENCY: Enable fluent mode
          pad_audio: 0,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[D-ID] Create session error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create D-ID session" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("[D-ID] Session created:", data.id);

    return NextResponse.json(data);
  } catch (error) {
    console.error("[D-ID] Session error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const streamId = searchParams.get("streamId");
    const sessionId = searchParams.get("sessionId");

    if (!streamId || !sessionId) {
      return NextResponse.json(
        { error: "Stream ID and Session ID are required" },
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

    const response = await fetch(`${DID_API_URL}/talks/streams/${streamId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (!response.ok) {
      console.warn("[D-ID] Delete session warning:", response.status);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[D-ID] Delete session error:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
