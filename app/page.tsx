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
import { Loader2, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// ==============================================
// MAIN APP PAGE
// iPad-optimized PWA experience
// ==============================================

// Demo characters (will be replaced by Supabase data)
const DEMO_CHARACTERS: Character[] = [
  {
    id: "chef-mario",
    name: "Chef Mario",
    slug: "chef-mario",
    bio: "A passionate Italian chef with 30 years of experience in traditional Mediterranean cuisine.",
    expertise: "Italian cooking, pasta making, wine pairing, Mediterranean diet",
    imageUrl: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800&h=1000&fit=crop",
    greeting: "Ciao! I'm Chef Mario. What delicious dish can I help you create today?",
    voiceStyle: {
      provider: "d-id",
      voiceId: "en-US-GuyNeural",
    },
    accentColor: "#CE2B37",
    pineconeNamespace: "character_chef_mario",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prof-ada",
    name: "Professor Ada",
    slug: "prof-ada",
    bio: "A brilliant computer science professor specializing in AI and machine learning.",
    expertise: "Artificial intelligence, machine learning, programming, computer science",
    imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=1000&fit=crop",
    greeting: "Hello! I'm Professor Ada. Ready to explore the fascinating world of AI together?",
    voiceStyle: {
      provider: "d-id",
      voiceId: "en-US-JennyNeural",
    },
    accentColor: "#1E3A8A",
    pineconeNamespace: "character_prof_ada",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "coach-alex",
    name: "Coach Alex",
    slug: "coach-alex",
    bio: "An energetic fitness coach passionate about helping people achieve their health goals.",
    expertise: "Fitness training, nutrition, weight loss, muscle building, wellness",
    imageUrl: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=1000&fit=crop",
    greeting: "Hey there! I'm Coach Alex. Let's get you on track to your best self!",
    voiceStyle: {
      provider: "d-id",
      voiceId: "en-US-DavisNeural",
    },
    accentColor: "#059669",
    pineconeNamespace: "character_coach_alex",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function Home() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [_loadError, _setLoadError] = useState<string | null>(null);

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

  // Error state
  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">
            Failed to Load
          </h1>
          <p className="text-white/60 mb-4">{loadError}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
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
