// ==============================================
// AVATARLIVE TYPE DEFINITIONS
// ==============================================

// ---------- Character Types ----------
export interface Character {
  id: string;
  name: string;
  slug: string;
  bio: string;
  expertise: string;
  imageUrl: string;
  thumbnailUrl?: string;
  greeting: string;
  voiceStyle: VoiceStyle;
  accentColor: string;
  didAvatarId?: string;
  didAgentId?: string;
  pineconeNamespace: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceStyle {
  provider: "d-id" | "elevenlabs";
  voiceId: string;
  pitch?: number;
  speed?: number;
  stability?: number;
  similarityBoost?: number;
}

export interface CharacterConfig {
  systemPrompt: string;
  ragEnabled: boolean;
  maxContextChunks: number;
  temperature: number;
  maxTokens: number;
}

// ---------- Conversation Types ----------
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  characterId?: string;
  audioUrl?: string;
  videoUrl?: string;
  isStreaming?: boolean;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  latency?: number;
  tokensUsed?: number;
  ragChunksUsed?: number;
  sttConfidence?: number;
}

export interface Conversation {
  id: string;
  userId: string;
  characterId: string;
  messages: Message[];
  startedAt: string;
  lastMessageAt: string;
}

// ---------- STT Types ----------
export interface STTConfig {
  language: string;
  punctuate: boolean;
  interimResults: boolean;
  vadEvents: boolean;
  endpointing: number;
  utteranceEndMs: number;
}

export interface STTResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  words?: STTWord[];
}

export interface STTWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

// ---------- D-ID Types ----------
export interface DIDSessionConfig {
  sourceUrl: string;
  voiceId?: string;
  voiceProvider?: "microsoft" | "elevenlabs" | "amazon";
  streamWarmup?: boolean;
  compatibilityMode?: "on" | "off" | "auto";
}

export interface DIDStreamStatus {
  status: "idle" | "connecting" | "connected" | "streaming" | "error";
  error?: string;
  sessionId?: string;
  iceConnectionState?: RTCIceConnectionState;
}

export interface DIDTalkRequest {
  text: string;
  voiceId?: string;
  ssml?: boolean;
  expression?: DIDExpression;
}

export interface DIDExpression {
  type: "happy" | "sad" | "surprised" | "neutral";
  intensity: number;
}

// ---------- RAG Types ----------
export interface RAGChunk {
  id: string;
  content: string;
  metadata: RAGChunkMetadata;
  score: number;
}

export interface RAGChunkMetadata {
  characterId: string;
  sourceFile: string;
  chunkIndex: number;
  pageNumber?: number;
}

export interface KnowledgeFile {
  id: string;
  characterId: string;
  fileName: string;
  fileType: "pdf" | "txt" | "url";
  fileSize: number;
  chunkCount: number;
  status: "pending" | "processing" | "completed" | "error";
  uploadedAt: string;
  processedAt?: string;
  error?: string;
}

// ---------- User Types ----------
export interface User {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  preferences: UserPreferences;
  createdAt: string;
}

export interface UserPreferences {
  voiceSpeed: number;
  videoEnabled: boolean;
  pushToTalk: boolean;
  autoPlay: boolean;
  captionsEnabled: boolean;
  preferredCharacterId?: string;
}

// ---------- Settings Types ----------
export interface AppSettings {
  voiceSpeed: number;
  videoEnabled: boolean;
  pushToTalk: boolean;
  autoPlay: boolean;
  captionsEnabled: boolean;
  highContrast: boolean;
}

// ---------- Analytics Types ----------
export interface AnalyticsEvent {
  event: string;
  properties: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

// ---------- API Response Types ----------
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ---------- WebSocket Types ----------
export interface WSMessage {
  type: string;
  payload: unknown;
  timestamp: number;
}

// ---------- State Types ----------
export interface AppState {
  currentCharacter: Character | null;
  characters: Character[];
  conversation: Message[];
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  currentTranscript: string;
  settings: AppSettings;
  error: string | null;
}
