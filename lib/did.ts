// ==============================================
// D-ID REALTIME API CLIENT
// WebRTC-based avatar streaming with low latency
// ==============================================

import type { DIDStreamStatus, DIDTalkRequest, DIDSessionConfig } from "@/types";

// LOW LATENCY: D-ID Realtime API for sub-200ms streaming
const DID_API_URL = "https://api.d-id.com";

type StatusCallback = (status: DIDStreamStatus) => void;
type VideoCallback = (stream: MediaStream) => void;
type ErrorCallback = (error: Error) => void;

interface DIDStreamResponse {
  id: string;
  session_id: string;
  offer?: RTCSessionDescriptionInit;
  ice_servers?: RTCIceServer[];
}

export class DIDClient {
  private apiKey: string;
  private peerConnection: RTCPeerConnection | null = null;
  private sessionId: string | null = null;
  private streamId: string | null = null;
  private dataChannel: RTCDataChannel | null = null;

  private onStatus: StatusCallback | null = null;
  private onVideo: VideoCallback | null = null;
  private onError: ErrorCallback | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Set callbacks
  setCallbacks(callbacks: {
    onStatus?: StatusCallback;
    onVideo?: VideoCallback;
    onError?: ErrorCallback;
  }): void {
    if (callbacks.onStatus) this.onStatus = callbacks.onStatus;
    if (callbacks.onVideo) this.onVideo = callbacks.onVideo;
    if (callbacks.onError) this.onError = callbacks.onError;
  }

  // Create a new streaming session
  async createSession(config: DIDSessionConfig): Promise<void> {
    try {
      this.updateStatus({ status: "connecting" });

      // Create stream with D-ID API
      const response = await fetch(`${DID_API_URL}/talks/streams`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_url: config.sourceUrl,
          driver_url: "bank://lively/driver-06", // Natural movement driver
          stream_warmup: config.streamWarmup ?? true,
          compatibility_mode: config.compatibilityMode ?? "auto",
          config: {
            stitch: true,
            fluent: true, // LOW LATENCY: Enable fluent mode
            pad_audio: 0,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create D-ID stream");
      }

      const data: DIDStreamResponse = await response.json();
      this.streamId = data.id;
      this.sessionId = data.session_id;

      // Set up WebRTC connection
      await this.setupWebRTC(data);

      this.updateStatus({
        status: "connected",
        sessionId: this.sessionId,
      });
    } catch (error) {
      this.updateStatus({
        status: "error",
        error: (error as Error).message,
      });
      this.onError?.(error as Error);
      throw error;
    }
  }

  // Send text to be spoken by avatar
  async talk(request: DIDTalkRequest): Promise<void> {
    if (!this.streamId || !this.sessionId) {
      throw new Error("No active D-ID session");
    }

    try {
      this.updateStatus({ status: "streaming" });

      const response = await fetch(
        `${DID_API_URL}/talks/streams/${this.streamId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: this.sessionId,
            script: {
              type: request.ssml ? "ssml" : "text",
              input: request.text,
              provider: {
                type: "microsoft", // Or "elevenlabs" for cloned voices
                voice_id: request.voiceId || "en-US-JennyNeural",
              },
            },
            config: {
              fluent: true, // LOW LATENCY: Enable fluent streaming
              pad_audio: 0,
            },
            ...(request.expression && {
              driver_expressions: {
                expressions: [
                  {
                    expression: request.expression.type,
                    intensity: request.expression.intensity,
                    start_frame: 0,
                  },
                ],
              },
            }),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send talk request");
      }

      // Response will be received via WebRTC stream
    } catch (error) {
      this.onError?.(error as Error);
      throw error;
    }
  }

  // Stop the avatar from speaking (interrupt)
  async interrupt(): Promise<void> {
    if (!this.streamId || !this.sessionId) return;

    try {
      // Send interrupt signal via data channel if available
      if (this.dataChannel?.readyState === "open") {
        this.dataChannel.send(JSON.stringify({ type: "interrupt" }));
      }

      // Also call API to ensure stream stops
      await fetch(`${DID_API_URL}/talks/streams/${this.streamId}/interrupt`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: this.sessionId,
        }),
      });
    } catch (error) {
      console.error("[D-ID] Interrupt failed:", error);
    }
  }

  // Close the session
  async close(): Promise<void> {
    if (this.streamId && this.sessionId) {
      try {
        await fetch(`${DID_API_URL}/talks/streams/${this.streamId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Basic ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: this.sessionId,
          }),
        });
      } catch (error) {
        console.error("[D-ID] Failed to close session:", error);
      }
    }

    this.cleanup();
    this.updateStatus({ status: "idle" });
  }

  // Get current session ID
  getSessionId(): string | null {
    return this.sessionId;
  }

  // Private: Set up WebRTC connection
  private async setupWebRTC(data: DIDStreamResponse): Promise<void> {
    // Create peer connection with ICE servers from D-ID
    const config: RTCConfiguration = {
      iceServers: data.ice_servers || [{ urls: "stun:stun.l.google.com:19302" }],
      iceTransportPolicy: "all",
    };

    this.peerConnection = new RTCPeerConnection(config);

    // Handle incoming video stream
    this.peerConnection.ontrack = (event) => {
      console.log("[D-ID] Received video track");
      if (event.streams[0]) {
        this.onVideo?.(event.streams[0]);
      }
    };

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log("[D-ID] ICE connection state:", state);

      if (state === "connected" || state === "completed") {
        this.updateStatus({
          status: "connected",
          sessionId: this.sessionId || undefined,
          iceConnectionState: state,
        });
      } else if (state === "failed" || state === "disconnected") {
        this.updateStatus({
          status: "error",
          error: `ICE connection ${state}`,
          iceConnectionState: state,
        });
      }
    };

    // Create data channel for bidirectional communication
    this.dataChannel = this.peerConnection.createDataChannel("JanusDataChannel");
    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleDataChannelMessage(message);
      } catch {
        console.log("[D-ID] Data channel message:", event.data);
      }
    };

    // Set remote description (offer from D-ID)
    if (data.offer) {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );

      // Create and set local description (answer)
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send answer back to D-ID
      await this.sendAnswer(answer);
    }

    // Handle ICE candidates
    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        await this.sendIceCandidate(event.candidate);
      }
    };
  }

  // Private: Send SDP answer to D-ID
  private async sendAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    const response = await fetch(
      `${DID_API_URL}/talks/streams/${this.streamId}/sdp`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: this.sessionId,
          answer,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to send SDP answer");
    }
  }

  // Private: Send ICE candidate to D-ID
  private async sendIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    try {
      await fetch(`${DID_API_URL}/talks/streams/${this.streamId}/ice`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: this.sessionId,
          candidate: candidate.candidate,
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex,
        }),
      });
    } catch (error) {
      console.error("[D-ID] Failed to send ICE candidate:", error);
    }
  }

  // Private: Handle data channel messages
  private handleDataChannelMessage(message: { type?: string; [key: string]: unknown }): void {
    switch (message.type) {
      case "stream_started":
        console.log("[D-ID] Stream started");
        this.updateStatus({ status: "streaming" });
        break;
      case "stream_ended":
        console.log("[D-ID] Stream ended");
        this.updateStatus({ status: "connected" });
        break;
      case "error":
        console.error("[D-ID] Stream error:", message);
        this.onError?.(new Error(String(message.error || "Unknown error")));
        break;
      default:
        console.log("[D-ID] Unknown message type:", message.type);
    }
  }

  // Private: Update status
  private updateStatus(status: DIDStreamStatus): void {
    this.onStatus?.(status);
  }

  // Private: Cleanup resources
  private cleanup(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.streamId = null;
    this.sessionId = null;
  }
}

// Factory function
export function createDIDClient(apiKey: string): DIDClient {
  return new DIDClient(apiKey);
}

// Helper to create avatar from image URL
export async function createDIDAvatar(
  apiKey: string,
  imageUrl: string,
  name: string
): Promise<{ id: string; url: string }> {
  const response = await fetch(`${DID_API_URL}/images`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: imageUrl,
      name,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create avatar");
  }

  return response.json();
}
