import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Character,
  Message,
  AppSettings,
  DIDStreamStatus,
} from "@/types";

// ==============================================
// AVATARLIVE ZUSTAND STORE
// Centralized state management with persistence
// ==============================================

interface ConversationState {
  // Character state
  currentCharacter: Character | null;
  characters: Character[];
  setCurrentCharacter: (character: Character | null) => void;
  setCharacters: (characters: Character[]) => void;

  // Conversation state
  messages: Message[];
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
  setMessages: (messages: Message[]) => void;

  // Voice state
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  currentTranscript: string;
  interimTranscript: string;
  setIsListening: (value: boolean) => void;
  setIsSpeaking: (value: boolean) => void;
  setIsProcessing: (value: boolean) => void;
  setCurrentTranscript: (value: string) => void;
  setInterimTranscript: (value: string) => void;

  // D-ID stream state
  streamStatus: DIDStreamStatus;
  setStreamStatus: (status: DIDStreamStatus) => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;

  // Reset
  reset: () => void;
}

interface SettingsState {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

interface UIState {
  isCharacterSelectorOpen: boolean;
  isSettingsOpen: boolean;
  isTranscriptExpanded: boolean;
  showInstallPrompt: boolean;
  setCharacterSelectorOpen: (value: boolean) => void;
  setSettingsOpen: (value: boolean) => void;
  setTranscriptExpanded: (value: boolean) => void;
  setShowInstallPrompt: (value: boolean) => void;
}

// Default settings
const defaultSettings: AppSettings = {
  voiceSpeed: 1.0,
  videoEnabled: true,
  pushToTalk: false,
  autoPlay: true,
  captionsEnabled: true,
  highContrast: false,
};

// Default stream status
const defaultStreamStatus: DIDStreamStatus = {
  status: "idle",
};

// ---------- Conversation Store ----------
export const useConversationStore = create<ConversationState>()((set, get) => ({
  // Character state
  currentCharacter: null,
  characters: [],
  setCurrentCharacter: (character) => {
    set({ currentCharacter: character });
    // Clear messages when switching characters
    if (character?.id !== get().currentCharacter?.id) {
      set({ messages: [] });
    }
  },
  setCharacters: (characters) => set({ characters }),

  // Conversation state - keep last 10 messages for context
  messages: [],
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message].slice(-20), // Keep last 20 messages
    })),
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),
  clearMessages: () => set({ messages: [] }),
  setMessages: (messages) => set({ messages }),

  // Voice state
  isListening: false,
  isSpeaking: false,
  isProcessing: false,
  currentTranscript: "",
  interimTranscript: "",
  setIsListening: (value) => set({ isListening: value }),
  setIsSpeaking: (value) => set({ isSpeaking: value }),
  setIsProcessing: (value) => set({ isProcessing: value }),
  setCurrentTranscript: (value) => set({ currentTranscript: value }),
  setInterimTranscript: (value) => set({ interimTranscript: value }),

  // D-ID stream state
  streamStatus: defaultStreamStatus,
  setStreamStatus: (status) => set({ streamStatus: status }),

  // Error state
  error: null,
  setError: (error) => set({ error }),

  // Reset all state
  reset: () =>
    set({
      currentCharacter: null,
      messages: [],
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      currentTranscript: "",
      interimTranscript: "",
      streamStatus: defaultStreamStatus,
      error: null,
    }),
}));

// ---------- Settings Store (Persisted) ----------
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: "avatarlive-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ---------- UI Store ----------
export const useUIStore = create<UIState>()((set) => ({
  isCharacterSelectorOpen: false,
  isSettingsOpen: false,
  isTranscriptExpanded: false,
  showInstallPrompt: false,
  setCharacterSelectorOpen: (value) => set({ isCharacterSelectorOpen: value }),
  setSettingsOpen: (value) => set({ isSettingsOpen: value }),
  setTranscriptExpanded: (value) => set({ isTranscriptExpanded: value }),
  setShowInstallPrompt: (value) => set({ showInstallPrompt: value }),
}));

// ---------- Selectors ----------
export const selectLastUserMessage = (state: ConversationState) =>
  state.messages.filter((m) => m.role === "user").slice(-1)[0];

export const selectLastAssistantMessage = (state: ConversationState) =>
  state.messages.filter((m) => m.role === "assistant").slice(-1)[0];

export const selectConversationContext = (state: ConversationState) =>
  state.messages.slice(-10); // Last 10 messages for context

export const selectIsStreaming = (state: ConversationState) =>
  state.streamStatus.status === "streaming";
