"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useConversationStore } from "@/lib/store";
import type { Character } from "@/types";
import { Volume2, VolumeX, Loader2 } from "lucide-react";

interface AvatarPlayerProps {
  character: Character;
  videoStream: MediaStream | null;
  onInterrupt?: () => void;
  className?: string;
}

export function AvatarPlayer({
  character,
  videoStream,
  onInterrupt,
  className,
}: AvatarPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const { isListening, isSpeaking, isProcessing, streamStatus } =
    useConversationStore();

  // Connect video stream to video element
  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
      videoRef.current.play().catch(console.error);
    }
  }, [videoStream]);

  // Handle video load
  const handleVideoLoad = useCallback(() => {
    setIsVideoReady(true);
  }, []);

  // Handle tap to interrupt
  const handleTapToInterrupt = useCallback(() => {
    if (isSpeaking && onInterrupt) {
      onInterrupt();
    }
  }, [isSpeaking, onInterrupt]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Determine glow state
  const glowClass = isListening
    ? "video-glow-listening"
    : isSpeaking
      ? "video-glow"
      : "";

  return (
    <div
      className={cn(
        "relative w-full aspect-[3/4] max-h-[70vh] rounded-3xl overflow-hidden",
        "bg-gradient-to-b from-gray-900 to-black",
        "border border-white/10",
        glowClass,
        "transition-all duration-500",
        className
      )}
    >
      {/* Video Element */}
      <motion.video
        ref={videoRef}
        className={cn(
          "absolute inset-0 w-full h-full object-cover",
          isListening && "animate-breathe"
        )}
        autoPlay
        playsInline
        muted={isMuted}
        onLoadedData={handleVideoLoad}
        onClick={handleTapToInterrupt}
        style={{ transform: "scaleX(-1)" }} // Mirror video
      />

      {/* Fallback Image when no video stream */}
      <AnimatePresence>
        {!videoStream && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            {/* Character Image Placeholder */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: character.imageUrl
                  ? `url(${character.imageUrl})`
                  : undefined,
                backgroundColor: !character.imageUrl
                  ? character.accentColor
                  : undefined,
              }}
            />
            {/* Connecting indicator */}
            {streamStatus.status === "connecting" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="w-12 h-12 animate-spin text-white" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing Indicator */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2"
          >
            <div className="glass px-4 py-2 rounded-full flex items-center gap-2">
              <span className="text-sm text-white/80">Thinking</span>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listening Indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-4 left-1/2 -translate-x-1/2"
          >
            <div className="glass px-4 py-2 rounded-full flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-white">Listening...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speaking indicator - tap to interrupt */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 cursor-pointer"
            onClick={handleTapToInterrupt}
          >
            <div className="glass px-4 py-2 rounded-full flex items-center gap-2 hover:bg-white/20 transition-colors">
              <div className="flex gap-0.5">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-primary rounded-full"
                    animate={{
                      height: [8, 16, 8],
                    }}
                    transition={{
                      duration: 0.4,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
              <span className="text-sm text-white/80">Tap to interrupt</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute button */}
      <button
        onClick={toggleMute}
        className="absolute bottom-4 right-4 p-3 rounded-full glass hover:bg-white/20 transition-colors"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-white/80" />
        ) : (
          <Volume2 className="w-5 h-5 text-white/80" />
        )}
      </button>

      {/* Character name badge */}
      <div className="absolute top-4 left-4 glass px-3 py-1.5 rounded-full">
        <span
          className="text-sm font-medium"
          style={{ color: character.accentColor }}
        >
          {character.name}
        </span>
      </div>

      {/* Subtle vignette overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/30 via-transparent to-black/10" />
    </div>
  );
}
