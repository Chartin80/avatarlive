"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { useConversationStore, useSettingsStore } from "@/lib/store";
import { DeepgramClient } from "@/lib/deepgram";
import { DIDClient } from "@/lib/did";
import { generateId } from "@/lib/utils";
import type { Character, Message, DIDStreamStatus } from "@/types";

// ==============================================
// CONVERSATION HOOK
// Orchestrates STT → LLM → TTS/Video pipeline
// LOW LATENCY: Optimized for sub-2s response time
// ==============================================

interface UseConversationOptions {
  character: Character | null;
  onGreeting?: (greeting: string) => void;
}

export function useConversation({ character, onGreeting }: UseConversationOptions) {
  const {
    messages,
    addMessage,
    updateMessage,
    setIsListening,
    setIsSpeaking,
    setIsProcessing,
    setCurrentTranscript,
    setInterimTranscript,
    setStreamStatus,
    setError,
  } = useConversationStore();

  const { settings } = useSettingsStore();

  // Refs for persistent clients
  const deepgramRef = useRef<DeepgramClient | null>(null);
  const didClientRef = useRef<DIDClient | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);

  // State for video stream
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  // Initialize Deepgram client
  const initDeepgram = useCallback(async () => {
    if (deepgramRef.current) return deepgramRef.current;

    try {
      // Get Deepgram API key from server
      const response = await fetch("/api/stt/token");
      const { key } = await response.json();

      deepgramRef.current = new DeepgramClient(key, {
        language: "en-US",
        punctuate: true,
        interimResults: true,
        vadEvents: true,
        endpointing: 300,
        utteranceEndMs: 1000,
      });

      return deepgramRef.current;
    } catch (error) {
      console.error("[Conversation] Failed to init Deepgram:", error);
      setError("Failed to initialize speech recognition");
      throw error;
    }
  }, [setError]);

  // Initialize D-ID client and session
  const initDID = useCallback(async () => {
    if (!character || !settings.videoEnabled) return null;

    try {
      // Create D-ID session via server API
      const response = await fetch("/api/did/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl: character.imageUrl,
          voiceId: character.voiceStyle.voiceId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create D-ID session");
      }

      const sessionData = await response.json();

      // Create client-side D-ID manager
      didClientRef.current = new DIDClient(process.env.NEXT_PUBLIC_DID_API_KEY || "");

      // Set up WebRTC connection would happen here
      // For now, we'll use the REST API approach

      setStreamStatus({
        status: "connected",
        sessionId: sessionData.session_id,
      });

      return sessionData;
    } catch (error) {
      console.error("[Conversation] Failed to init D-ID:", error);
      setStreamStatus({
        status: "error",
        error: "Failed to initialize video avatar",
      });
      return null;
    }
  }, [character, settings.videoEnabled, setStreamStatus]);

  // Process chat with Claude + RAG
  const processChat = useCallback(
    async (userText: string): Promise<string> => {
      if (!character) throw new Error("No character selected");

      setIsProcessing(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userText,
            character,
            conversationHistory: messages.slice(-10), // Last 10 messages
          }),
        });

        if (!response.ok) {
          throw new Error("Chat request failed");
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        let fullResponse = "";
        const assistantMessageId = generateId();

        // Add placeholder message for streaming
        addMessage({
          id: assistantMessageId,
          role: "assistant",
          content: "",
          timestamp: Date.now(),
          characterId: character.id,
          isStreaming: true,
        });

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter(Boolean);

          for (const line of lines) {
            try {
              const data = JSON.parse(line);

              if (data.type === "text") {
                fullResponse += data.content;
                updateMessage(assistantMessageId, {
                  content: fullResponse,
                  isStreaming: true,
                });
              } else if (data.type === "complete") {
                updateMessage(assistantMessageId, {
                  content: fullResponse,
                  isStreaming: false,
                  metadata: {
                    tokensUsed: data.usage?.output_tokens,
                    ragChunksUsed: data.ragChunksUsed,
                  },
                });
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.warn("[Chat] Parse error:", parseError);
            }
          }
        }

        return fullResponse;
      } finally {
        setIsProcessing(false);
      }
    },
    [character, messages, addMessage, updateMessage, setIsProcessing]
  );

  // Speak response via D-ID
  const speakResponse = useCallback(
    async (text: string) => {
      if (!character || !settings.videoEnabled) return;

      const streamStatus = useConversationStore.getState().streamStatus;
      if (!streamStatus.sessionId) {
        console.warn("[Conversation] No D-ID session available");
        return;
      }

      try {
        setIsSpeaking(true);

        await fetch("/api/did/talk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            streamId: streamStatus.sessionId, // This would be the stream ID
            sessionId: streamStatus.sessionId,
            text,
            voiceId: character.voiceStyle.voiceId,
            voiceProvider: character.voiceStyle.provider,
          }),
        });

        // In real implementation, video would stream via WebRTC
        // For demo, we simulate speaking duration
        const speakDuration = Math.max(2000, text.length * 50);
        await new Promise((resolve) => setTimeout(resolve, speakDuration));
      } catch (error) {
        console.error("[Conversation] Speak error:", error);
      } finally {
        setIsSpeaking(false);
      }
    },
    [character, settings.videoEnabled, setIsSpeaking]
  );

  // Main conversation handler
  const handleUserSpeech = useCallback(
    async (transcript: string) => {
      if (!transcript.trim() || !character) return;

      // Add user message
      addMessage({
        id: generateId(),
        role: "user",
        content: transcript,
        timestamp: Date.now(),
      });

      // Clear transcript
      setCurrentTranscript("");
      setInterimTranscript("");

      try {
        // Process with Claude + RAG
        const response = await processChat(transcript);

        // Speak response (if video enabled)
        if (settings.videoEnabled && settings.autoPlay) {
          await speakResponse(response);
        }
      } catch (error) {
        console.error("[Conversation] Error:", error);
        setError("Failed to process your message. Please try again.");
      }
    },
    [
      character,
      addMessage,
      setCurrentTranscript,
      setInterimTranscript,
      processChat,
      speakResponse,
      settings,
      setError,
    ]
  );

  // Start listening
  const startListening = useCallback(async () => {
    try {
      setError(null);
      const deepgram = await initDeepgram();

      deepgram.setCallbacks({
        onTranscript: (result) => {
          if (result.isFinal) {
            setCurrentTranscript(result.transcript);
            setInterimTranscript("");

            // Process the final transcript
            handleUserSpeech(result.transcript);
          } else {
            setInterimTranscript(result.transcript);
          }
        },
        onError: (error) => {
          console.error("[STT] Error:", error);
          setError("Speech recognition error. Please try again.");
          setIsListening(false);
        },
        onStatus: (status) => {
          console.log("[STT] Status:", status);
          setIsListening(status === "connected");
        },
      });

      await deepgram.start();
      setIsListening(true);
    } catch (error) {
      console.error("[Conversation] Start listening error:", error);
      setError("Could not access microphone. Please check permissions.");
      setIsListening(false);
    }
  }, [
    initDeepgram,
    handleUserSpeech,
    setIsListening,
    setCurrentTranscript,
    setInterimTranscript,
    setError,
  ]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (deepgramRef.current) {
      deepgramRef.current.stop();
    }
    setIsListening(false);
  }, [setIsListening]);

  // Interrupt speaking
  const interrupt = useCallback(async () => {
    if (didClientRef.current) {
      await didClientRef.current.interrupt();
    }
    setIsSpeaking(false);
  }, [setIsSpeaking]);

  // Send greeting when character changes
  useEffect(() => {
    if (character && onGreeting) {
      const greeting = character.greeting.replace("{userName}", "there");
      onGreeting(greeting);

      // Add greeting message
      addMessage({
        id: generateId(),
        role: "assistant",
        content: greeting,
        timestamp: Date.now(),
        characterId: character.id,
      });

      // Speak greeting if enabled
      if (settings.videoEnabled && settings.autoPlay) {
        speakResponse(greeting);
      }
    }
    // Only run when character changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id]);

  // Initialize D-ID when character changes
  useEffect(() => {
    if (character && settings.videoEnabled) {
      initDID();
    }

    return () => {
      // Cleanup D-ID session
      if (didClientRef.current) {
        didClientRef.current.close();
        didClientRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id, settings.videoEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (didClientRef.current) {
        didClientRef.current.close();
      }
    };
  }, [stopListening]);

  return {
    startListening,
    stopListening,
    interrupt,
    videoStream,
    isReady: !!character,
  };
}
