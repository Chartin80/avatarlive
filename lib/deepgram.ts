// ==============================================
// DEEPGRAM REAL-TIME STT CLIENT
// WebSocket-based speech-to-text with low latency
// ==============================================

import type { STTResult, STTConfig } from "@/types";

// LOW LATENCY: Optimized settings for sub-500ms transcription
const DEFAULT_STT_CONFIG: STTConfig = {
  language: "en-US",
  punctuate: true,
  interimResults: true,
  vadEvents: true,
  endpointing: 300, // End speech detection after 300ms of silence
  utteranceEndMs: 1000, // Final utterance after 1 second
};

type TranscriptCallback = (result: STTResult) => void;
type ErrorCallback = (error: Error) => void;
type StatusCallback = (status: "connecting" | "connected" | "disconnected") => void;

export class DeepgramClient {
  private socket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  private onTranscript: TranscriptCallback | null = null;
  private onError: ErrorCallback | null = null;
  private onStatus: StatusCallback | null = null;

  constructor(
    private apiKey: string,
    private config: Partial<STTConfig> = {}
  ) {
    this.config = { ...DEFAULT_STT_CONFIG, ...config };
  }

  // Set callbacks
  setCallbacks(callbacks: {
    onTranscript?: TranscriptCallback;
    onError?: ErrorCallback;
    onStatus?: StatusCallback;
  }) {
    if (callbacks.onTranscript) this.onTranscript = callbacks.onTranscript;
    if (callbacks.onError) this.onError = callbacks.onError;
    if (callbacks.onStatus) this.onStatus = callbacks.onStatus;
  }

  // Start listening
  async start(): Promise<void> {
    try {
      this.onStatus?.("connecting");

      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Connect to Deepgram WebSocket
      await this.connectWebSocket();

      // Start sending audio
      this.startRecording();

      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.onStatus?.("connected");
    } catch (error) {
      this.onError?.(error as Error);
      throw error;
    }
  }

  // Stop listening
  stop(): void {
    this.cleanup();
    this.onStatus?.("disconnected");
  }

  // Check if currently listening
  isListening(): boolean {
    return this.isConnected;
  }

  // Private: Connect to Deepgram WebSocket
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const config = this.config as STTConfig;

      // Build WebSocket URL with query parameters
      const params = new URLSearchParams({
        model: "nova-2", // LOW LATENCY: Nova-2 is fastest model
        language: config.language,
        punctuate: String(config.punctuate),
        interim_results: String(config.interimResults),
        vad_events: String(config.vadEvents),
        endpointing: String(config.endpointing),
        utterance_end_ms: String(config.utteranceEndMs),
        encoding: "linear16",
        sample_rate: "16000",
        channels: "1",
        smart_format: "true",
      });

      const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

      this.socket = new WebSocket(wsUrl, ["token", this.apiKey]);

      this.socket.onopen = () => {
        console.log("[Deepgram] WebSocket connected");
        resolve();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch {
          console.error("[Deepgram] Failed to parse message");
        }
      };

      this.socket.onerror = (error) => {
        console.error("[Deepgram] WebSocket error:", error);
        reject(new Error("WebSocket connection failed"));
      };

      this.socket.onclose = (event) => {
        console.log("[Deepgram] WebSocket closed:", event.code);
        this.isConnected = false;
        this.onStatus?.("disconnected");

        // Attempt reconnection if not intentionally closed
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      };
    });
  }

  // Private: Handle incoming WebSocket messages
  private handleMessage(data: {
    type?: string;
    channel?: {
      alternatives?: Array<{
        transcript?: string;
        confidence?: number;
        words?: Array<{
          word: string;
          start: number;
          end: number;
          confidence: number;
        }>;
      }>;
    };
    is_final?: boolean;
    speech_final?: boolean;
  }): void {
    // Handle different message types
    if (data.type === "UtteranceEnd") {
      // Utterance ended - user stopped speaking
      console.log("[Deepgram] Utterance ended");
      return;
    }

    if (data.type === "SpeechStarted") {
      // Speech detected
      console.log("[Deepgram] Speech started");
      return;
    }

    // Handle transcript results
    if (data.channel?.alternatives?.[0]) {
      const alternative = data.channel.alternatives[0];
      const transcript = alternative.transcript || "";

      if (transcript) {
        const result: STTResult = {
          transcript,
          isFinal: data.is_final || data.speech_final || false,
          confidence: alternative.confidence || 0,
          words: alternative.words?.map((w) => ({
            word: w.word,
            start: w.start,
            end: w.end,
            confidence: w.confidence,
          })),
        };

        this.onTranscript?.(result);
      }
    }
  }

  // Private: Start recording audio
  private startRecording(): void {
    if (!this.stream) return;

    // Create AudioContext for processing
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    const source = this.audioContext.createMediaStreamSource(this.stream);

    // Create ScriptProcessor for raw audio access
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0);

        // Convert Float32Array to Int16Array (linear16)
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Send audio data
        this.socket.send(int16Data.buffer);
      }
    };

    source.connect(processor);
    processor.connect(this.audioContext.destination);
  }

  // Private: Attempt to reconnect
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.pow(2, this.reconnectAttempts) * 1000;

    console.log(`[Deepgram] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connectWebSocket();
        this.startRecording();
        this.onStatus?.("connected");
      } catch (error) {
        this.onError?.(error as Error);
      }
    }, delay);
  }

  // Private: Cleanup resources
  private cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.close(1000);
      this.socket = null;
    }

    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.isConnected = false;
  }
}

// Factory function for creating Deepgram client
export function createDeepgramClient(
  apiKey: string,
  config?: Partial<STTConfig>
): DeepgramClient {
  return new DeepgramClient(apiKey, config);
}
