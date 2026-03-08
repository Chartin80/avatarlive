"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/header";
import { AvatarPlayer } from "@/components/avatar/avatar-player";
import { MicButton } from "@/components/avatar/mic-button";
import { TranscriptPanel } from "@/components/avatar/transcript-panel";
import {
  CharacterSelector,
  CharacterGallery,
} from "@/components/avatar/character-selector";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { useConversationStore, useUIStore } from "@/lib/store";
import { useConversation } from "@/hooks/use-conversation";
import type { Character } from "@/types";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// ==============================================
// MAIN APP PAGE
// iPad-optimized PWA experience
// ==============================================

// Demo characters (will be replaced by Supabase data)
const DEMO_CHARACTERS: Character[] = [
  {
    id: "darby",
    name: "Darby",
    slug: "darby",
    bio: "Darby is a curious second grader who absolutely loves animals and the planet they live on. She's full of energy and excitement, and she's always ready to share fun animal facts or talk about how we can help protect nature.",
    expertise: "Animals, wildlife facts, nature, habitats, protecting the environment",
    imageUrl: "/characters/avatar-4.webp",
    greeting: "Hi! I'm Darby and you can ask me anything about nature and animals",
    voiceStyle: {
      provider: "elevenlabs",
      voiceId: "Nggzl2QAXh3OijoXD116",
    },
    accentColor: "#4CAF50",
    pineconeNamespace: "character_darby",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "dennis",
    name: "Dennis",
    slug: "dennis",
    bio: "Dennis is the regular at the corner stool of a dim dive bar, always a few beers deep and halfway through a story that never quite lands anywhere. He rambles, forgets his point, and somehow circles every conversation back to something that happened \"back in '98.\"",
    expertise: "Pointless stories, barroom rambling, half-remembered memories, questionable life advice",
    imageUrl: "/characters/avatar-5.webp",
    greeting: "Hey… hey buddy… you ever notice how things just kinda… y'know… anyway, what were we talkin' about?",
    voiceStyle: {
      provider: "elevenlabs",
      voiceId: "YEkUdc7PezGaXaRslSHB",
    },
    accentColor: "#795548",
    pineconeNamespace: "character_dennis",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "chef-antonio",
    name: "Chef Antonio Bianchi",
    slug: "chef-antonio",
    bio: "Chef Antonio Bianchi is a master of traditional Italian cooking who has spent decades perfecting every sauce, pasta, and flame-kissed dish. Brilliant in the kitchen but famously impatient, he teaches culinary excellence with blunt honesty and zero tolerance for shortcuts.",
    expertise: "Italian cuisine, pasta mastery, sauces, wine pairing, fine dining technique",
    imageUrl: "/characters/avatar-3.webp",
    greeting: "Alright, listen. What is it you want to learn about real Italian cooking?",
    voiceStyle: {
      provider: "elevenlabs",
      voiceId: "s2wvuS7SwITYg8dqsJdn",
    },
    accentColor: "#CE2B37",
    pineconeNamespace: "character_chef_antonio",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function Home() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { currentCharacter, setCurrentCharacter, setCharacters: setStoreCharacters } =
    useConversationStore();
  const { showInstallPrompt, setShowInstallPrompt } = useUIStore();

  // Fetch characters on mount
  useEffect(() => {
    async function fetchCharacters() {
      try {
        const response = await fetch("/api/characters");

        if (!response.ok) {
          // Fall back to demo characters
          console.warn("Using demo characters");
          setCharacters(DEMO_CHARACTERS);
          setStoreCharacters(DEMO_CHARACTERS);
          if (!currentCharacter) {
            setCurrentCharacter(DEMO_CHARACTERS[0]);
          }
          return;
        }

        const data = await response.json();

        if (data.length === 0) {
          // Use demo characters if none in database
          setCharacters(DEMO_CHARACTERS);
          setStoreCharacters(DEMO_CHARACTERS);
          if (!currentCharacter) {
            setCurrentCharacter(DEMO_CHARACTERS[0]);
          }
        } else {
          setCharacters(data);
          setStoreCharacters(data);
          if (!currentCharacter) {
            setCurrentCharacter(data[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch characters:", error);
        // Fall back to demo characters
        setCharacters(DEMO_CHARACTERS);
        setStoreCharacters(DEMO_CHARACTERS);
        if (!currentCharacter) {
          setCurrentCharacter(DEMO_CHARACTERS[0]);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchCharacters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = () => {
      setShowInstallPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [setShowInstallPrompt]);

  // Handle character selection
  const handleSelectCharacter = useCallback(
    (character: Character) => {
      setCurrentCharacter(character);
    },
    [setCurrentCharacter]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
          <Loader2 className="w-8 h-8 animate-spin text-white/60" />
          <p className="text-white/60">Loading AvatarLive...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background overflow-hidden">
      {/* Header */}
      <Header characters={characters} />

      {/* Main content */}
      <div className="pt-16 pb-4 px-4 h-screen flex flex-col safe-area-bottom">
        {/* Character gallery (horizontal scroll) */}
        {characters.length > 1 && (
          <CharacterGallery
            characters={characters}
            onSelect={handleSelectCharacter}
            className="mb-4 -mx-4"
          />
        )}

        {/* Avatar and conversation area */}
        {currentCharacter ? (
          <ConversationArea
            character={currentCharacter}
            characters={characters}
            onSelectCharacter={handleSelectCharacter}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/60">Select a character to start</p>
          </div>
        )}
      </div>

      {/* Character selector modal */}
      <CharacterSelector
        characters={characters}
        onSelect={handleSelectCharacter}
      />

      {/* Settings panel */}
      <SettingsPanel />

      {/* PWA install prompt */}
      <AnimatePresence>
        {showInstallPrompt && (
          <PWAInstallPrompt onDismiss={() => setShowInstallPrompt(false)} />
        )}
      </AnimatePresence>
    </main>
  );
}

// Conversation area component
function ConversationArea({
  character,
  characters: _characters,
  onSelectCharacter: _onSelectCharacter,
}: {
  character: Character;
  characters: Character[];
  onSelectCharacter: (character: Character) => void;
}) {
  const { startListening, stopListening, interrupt, videoStream, isReady } =
    useConversation({
      character,
      onGreeting: (greeting) => {
        console.log("Greeting:", greeting);
      },
    });

  const { isListening: _isListening, isProcessing, streamStatus: _streamStatus } = useConversationStore();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Avatar player */}
      <motion.div
        key={character.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex items-center justify-center min-h-0 py-4"
      >
        <AvatarPlayer
          character={character}
          videoStream={videoStream}
          onInterrupt={interrupt}
          className="max-w-lg w-full"
        />
      </motion.div>

      {/* Mic button */}
      <div className="flex justify-center py-6">
        <MicButton
          onStartListening={startListening}
          onStopListening={stopListening}
          disabled={!isReady || isProcessing}
        />
      </div>

      {/* Transcript panel */}
      <TranscriptPanel character={character} />
    </div>
  );
}

// PWA install prompt component
function PWAInstallPrompt({ onDismiss }: { onDismiss: () => void }) {
  const handleInstall = async () => {
    // @ts-expect-error - deferredPrompt is set in layout
    const deferredPrompt = window.deferredPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    }
    onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed bottom-4 left-4 right-4 glass rounded-2xl p-4 z-50 safe-area-bottom"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white">Install AvatarLive</h3>
          <p className="text-sm text-white/60 mt-1">
            Add to your home screen for the best experience
          </p>
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <Button
          variant="ghost"
          className="flex-1"
          onClick={onDismiss}
        >
          Not now
        </Button>
        <Button
          variant="glow"
          className="flex-1"
          onClick={handleInstall}
        >
          Install
        </Button>
      </div>
    </motion.div>
  );
}
