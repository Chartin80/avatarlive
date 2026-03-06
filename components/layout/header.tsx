"use client";

import { motion } from "framer-motion";
import { Settings, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConversationStore, useUIStore } from "@/lib/store";
import type { Character } from "@/types";

interface HeaderProps {
  characters: Character[];
}

export function Header({ characters }: HeaderProps) {
  const { currentCharacter } = useConversationStore();
  const { setCharacterSelectorOpen, setSettingsOpen } = useUIStore();

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 safe-area-top"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", damping: 20 }}
    >
      <div className="glass-dark border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">AvatarLive</span>
          </div>

          {/* Current character indicator (center) */}
          {currentCharacter && (
            <motion.button
              onClick={() => setCharacterSelectorOpen(true)}
              className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full glass hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: currentCharacter.accentColor }}
              />
              <span className="text-sm font-medium text-white/90 hidden sm:inline">
                {currentCharacter.name}
              </span>
              <Users className="w-4 h-4 text-white/60" />
            </motion.button>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Character Switcher */}
            {characters.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCharacterSelectorOpen(true)}
                aria-label="Switch character"
                className="sm:hidden"
              >
                <Users className="w-5 h-5" />
              </Button>
            )}

            {/* Settings */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
