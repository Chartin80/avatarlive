"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversationStore, useSettingsStore } from "@/lib/store";

interface MicButtonProps {
  onStartListening: () => Promise<void>;
  onStopListening: () => void;
  disabled?: boolean;
  className?: string;
}

export function MicButton({
  onStartListening,
  onStopListening,
  disabled,
  className,
}: MicButtonProps) {
  const { isListening, isProcessing, isSpeaking, error } = useConversationStore();
  const { settings } = useSettingsStore();
  const [isPressed, setIsPressed] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Handle push-to-talk
  const handlePressStart = useCallback(async () => {
    if (disabled || isProcessing) return;

    if (settings.pushToTalk) {
      setIsPressed(true);
      await onStartListening();
    } else {
      // Toggle mode
      if (isListening) {
        onStopListening();
      } else {
        await onStartListening();
      }
    }
  }, [disabled, isProcessing, settings.pushToTalk, isListening, onStartListening, onStopListening]);

  const handlePressEnd = useCallback(() => {
    if (settings.pushToTalk && isPressed) {
      setIsPressed(false);
      onStopListening();
    }
  }, [settings.pushToTalk, isPressed, onStopListening]);

  // Visualize audio level when listening
  useEffect(() => {
    if (isListening && analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const level = sum / dataArray.length / 255;
        setAudioLevel(level);
        animationRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isListening]);

  // Determine button state and colors
  const getButtonState = () => {
    if (disabled) return { color: "bg-gray-500", icon: MicOff };
    if (isProcessing) return { color: "bg-yellow-500", icon: Loader2 };
    if (isSpeaking) return { color: "bg-blue-500", icon: Mic };
    if (isListening) return { color: "bg-green-500", icon: Mic };
    return { color: "bg-red-500", icon: Mic };
  };

  const state = getButtonState();
  const Icon = state.icon;

  return (
    <div className={cn("relative", className)}>
      {/* Ripple effect rings */}
      <AnimatePresence>
        {isListening && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border-2 border-green-500/30"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{
                  scale: 1.5 + i * 0.3 + audioLevel * 0.5,
                  opacity: 0,
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeOut",
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Audio level ring */}
      <AnimatePresence>
        {isListening && audioLevel > 0.1 && (
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-green-400"
            initial={{ scale: 1 }}
            animate={{
              scale: 1 + audioLevel * 0.3,
            }}
            style={{
              opacity: 0.5 + audioLevel * 0.5,
            }}
          />
        )}
      </AnimatePresence>

      {/* Main button */}
      <motion.button
        className={cn(
          "relative w-20 h-20 rounded-full flex items-center justify-center",
          "shadow-2xl touch-target",
          state.color,
          "transition-colors duration-300",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "hover:brightness-110 active:scale-95"
        )}
        whileTap={!disabled ? { scale: 0.92 } : {}}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        disabled={disabled}
        aria-label={
          isListening
            ? "Stop listening"
            : settings.pushToTalk
              ? "Hold to talk"
              : "Start listening"
        }
      >
        <Icon
          className={cn(
            "w-8 h-8 text-white",
            isProcessing && "animate-spin"
          )}
        />

        {/* Inner glow */}
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            isListening && "animate-pulse-glow"
          )}
          style={{
            boxShadow: isListening
              ? `0 0 30px 10px rgba(34, 197, 94, 0.4)`
              : isSpeaking
                ? `0 0 30px 10px rgba(59, 130, 246, 0.4)`
                : `0 0 20px 5px rgba(239, 68, 68, 0.3)`,
          }}
        />
      </motion.button>

      {/* Push-to-talk indicator */}
      <AnimatePresence>
        {settings.pushToTalk && !isListening && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <span className="text-xs text-white/60">Hold to talk</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error indicator */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <span className="text-xs text-red-400">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
