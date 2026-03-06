"use client";

import { motion } from "framer-motion";
import { Settings, Users, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useConversationStore, useUIStore, useDevStore } from "@/lib/store";
import type { Character } from "@/types";

interface HeaderProps {
  characters: Character[];
}

export function Header({ characters }: HeaderProps) {
  const { currentCharacter } = useConversationStore();
  const { setCharacterSelectorOpen, setSettingsOpen } = useUIStore();
  const { bypassRAG, toggleBypassRAG } = useDevStore();

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
            {/* Creative Mode Toggle */}
            {(
              <div className="flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-800">
                <Zap className={`w-3.5 h-3.5 ${bypassRAG ? "text-orange-400" : "text-zinc-500"}`} />
                <Label
                  htmlFor="bypass-rag"
                  className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider cursor-pointer"
                >
                  Creative
                </Label>
                <Switch
                  id="bypass-rag"
                  checked={bypassRAG}
                  onCheckedChange={toggleBypassRAG}
                  className="data-[state=checked]:bg-orange-500 scale-75"
                />
              </div>
            )}

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
