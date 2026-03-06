"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConversationStore, useUIStore } from "@/lib/store";
import type { Character } from "@/types";
import { Check, Sparkles } from "lucide-react";

interface CharacterSelectorProps {
  characters: Character[];
  onSelect: (character: Character) => void;
}

export function CharacterSelector({
  characters,
  onSelect,
}: CharacterSelectorProps) {
  const { currentCharacter } = useConversationStore();
  const { isCharacterSelectorOpen, setCharacterSelectorOpen } = useUIStore();

  const handleSelect = (character: Character) => {
    onSelect(character);
    setCharacterSelectorOpen(false);
  };

  return (
    <Dialog open={isCharacterSelectorOpen} onOpenChange={setCharacterSelectorOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Choose Your Character
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] -mx-6 px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                isSelected={currentCharacter?.id === character.id}
                onSelect={() => handleSelect(character)}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Character card component
function CharacterCard({
  character,
  isSelected,
  onSelect,
}: {
  character: Character;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      onClick={onSelect}
      className={cn(
        "relative rounded-2xl overflow-hidden aspect-[3/4]",
        "bg-gradient-to-b from-gray-800 to-gray-900",
        "border-2 transition-all duration-300",
        isSelected
          ? "border-primary shadow-lg shadow-primary/20"
          : "border-white/10 hover:border-white/30"
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Character Image */}
      <div className="absolute inset-0">
        {character.imageUrl ? (
          <Image
            src={character.imageUrl}
            alt={character.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ backgroundColor: character.accentColor }}
          />
        )}
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

      {/* Selected indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center"
        >
          <Check className="w-5 h-5 text-white" />
        </motion.div>
      )}

      {/* Character info */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3
          className="text-lg font-bold text-white mb-1"
          style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
        >
          {character.name}
        </h3>
        <p className="text-sm text-white/70 line-clamp-2">{character.bio}</p>

        {/* Expertise tag */}
        <div
          className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs"
          style={{
            backgroundColor: `${character.accentColor}30`,
            color: character.accentColor,
          }}
        >
          {character.expertise.split(",")[0]}
        </div>
      </div>

      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 opacity-0 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 30px 10px ${character.accentColor}40`,
        }}
        whileHover={{ opacity: 1 }}
      />
    </motion.button>
  );
}

// Horizontal scrollable character gallery (for header)
export function CharacterGallery({
  characters,
  onSelect,
  className,
}: {
  characters: Character[];
  onSelect: (character: Character) => void;
  className?: string;
}) {
  const { currentCharacter } = useConversationStore();

  return (
    <div className={cn("overflow-x-auto hide-scrollbar", className)}>
      <div className="flex gap-3 px-4 py-2">
        {characters.map((character) => (
          <motion.button
            key={character.id}
            onClick={() => onSelect(character)}
            className={cn(
              "flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full",
              "transition-all duration-200",
              currentCharacter?.id === character.id
                ? "bg-white/20"
                : "bg-white/5 hover:bg-white/10"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div
              className="w-8 h-8 rounded-full overflow-hidden border-2"
              style={{
                borderColor:
                  currentCharacter?.id === character.id
                    ? character.accentColor
                    : "transparent",
              }}
            >
              {character.thumbnailUrl || character.imageUrl ? (
                <Image
                  src={character.thumbnailUrl || character.imageUrl}
                  alt={character.name}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{ backgroundColor: character.accentColor }}
                />
              )}
            </div>
            <span className="text-sm font-medium text-white/80 whitespace-nowrap">
              {character.name}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
