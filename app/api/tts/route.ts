import { NextRequest } from "next/server";

// ==============================================
// ELEVENLABS TEXT-TO-SPEECH API
// Converts text to audio using character voices
// ==============================================

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId } = await request.json();

    console.log("[TTS] Request received:", { textLength: text?.length, voiceId });

    if (!text || !voiceId) {
      console.error("[TTS] Missing fields:", { text: !!text, voiceId: !!voiceId });
      return new Response(
        JSON.stringify({ error: "Missing text or voiceId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error("[TTS] ELEVENLABS_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("[TTS] API key exists, length:", apiKey.length, "starts with:", apiKey.substring(0, 5));

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TTS] ElevenLabs error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "TTS generation failed", details: errorText }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Return audio stream
    const audioBuffer = await response.arrayBuffer();
    console.log("[TTS] Success - audio size:", audioBuffer.byteLength);

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[TTS] Error:", error);
    return new Response(
      JSON.stringify({
        error: "TTS request failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
