"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, User, Bot } from "lucide-react";
import { cn, formatTimestamp } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConversationStore, useUIStore } from "@/lib/store";
import type { Character, Message } from "@/types";

interface TranscriptPanelProps {
  character: Character;
  className?: string;
}

export function TranscriptPanel({ character, className }: TranscriptPanelProps) {
  const { messages, currentTranscript, interimTranscript, isListening } =
    useConversationStore();
  const { isTranscriptExpanded, setTranscriptExpanded } = useUIStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentTranscript, interimTranscript]);

  const toggleExpanded = () => {
    setTranscriptExpanded(!isTranscriptExpanded);
  };

  return (
    <motion.div
      className={cn(
        "glass rounded-t-2xl overflow-hidden",
        "border-t border-white/10",
        className
      )}
      initial={false}
      animate={{
        height: isTranscriptExpanded ? "40vh" : "auto",
      }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
    >
      {/* Header with toggle */}
      <button
        onClick={toggleExpanded}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
        aria-expanded={isTranscriptExpanded}
        aria-label={isTranscriptExpanded ? "Collapse transcript" : "Expand transcript"}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white/80">Transcript</span>
          {messages.length > 0 && (
            <span className="text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
              {messages.length}
            </span>
          )}
        </div>
        {isTranscriptExpanded ? (
          <ChevronDown className="w-5 h-5 text-white/60" />
        ) : (
          <ChevronUp className="w-5 h-5 text-white/60" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isTranscriptExpanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ScrollArea className="h-[calc(40vh-48px)]" ref={scrollRef}>
              <div className="p-4 space-y-4">
                {messages.length === 0 && !interimTranscript && (
                  <p className="text-sm text-white/40 text-center py-8">
                    Start talking to see the conversation here
                  </p>
                )}

                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    character={character}
                  />
                ))}

                {/* Current interim transcript */}
                {interimTranscript && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 bg-white/5 rounded-2xl rounded-tl-sm px-4 py-3">
                      <p className="text-sm text-white/60 italic">
                        {interimTranscript}
                        <span className="inline-block w-2 h-4 ml-1 bg-white/40 animate-pulse" />
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-3"
          >
            {/* Show last message or current transcript */}
            {isListening && interimTranscript ? (
              <p className="text-sm text-white/60 truncate">
                <span className="text-primary">You:</span> {interimTranscript}
              </p>
            ) : messages.length > 0 ? (
              <p className="text-sm text-white/60 truncate">
                <span
                  className="font-medium"
                  style={{
                    color:
                      messages[messages.length - 1].role === "assistant"
                        ? character.accentColor
                        : undefined,
                  }}
                >
                  {messages[messages.length - 1].role === "assistant"
                    ? character.name
                    : "You"}
                  :
                </span>{" "}
                {messages[messages.length - 1].content}
              </p>
            ) : (
              <p className="text-sm text-white/40">Tap the mic to start talking</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Message bubble component
function MessageBubble({
  message,
  character,
}: {
  message: Message;
  character: Character;
}) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser ? "bg-primary/20" : "bg-white/10"
        )}
        style={!isUser ? { backgroundColor: `${character.accentColor}20` } : {}}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary" />
        ) : (
          <Bot className="w-4 h-4" style={{ color: character.accentColor }} />
        )}
      </div>

      <div
        className={cn(
          "flex-1 rounded-2xl px-4 py-3 max-w-[80%]",
          isUser
            ? "bg-primary/20 rounded-tr-sm ml-auto"
            : "bg-white/5 rounded-tl-sm"
        )}
      >
        <p className="text-sm text-white/90 whitespace-pre-wrap">
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-white/40 animate-pulse" />
          )}
        </p>
        <p className="text-xs text-white/30 mt-1">
          {formatTimestamp(message.timestamp)}
        </p>
      </div>
    </motion.div>
  );
}
