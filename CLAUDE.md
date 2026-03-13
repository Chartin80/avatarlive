# AvatarLive - Project Context

## Overview
Interactive real-time video chatbot web app where users talk to animated AI characters via voice. Built as an iPad-optimized PWA.

## Tech Stack
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion, Zustand
- **STT:** Deepgram Nova-2 (WebSocket streaming)
- **LLM:** Claude API (Haiku 4.5 for speed, Sonnet 4.6 for complex queries)
- **TTS:** ElevenLabs (eleven_flash_v2_5 model)
- **Video Avatar:** D-ID (not yet integrated - returns 500)
- **Vector DB:** Pinecone (for RAG - not yet configured)
- **Database:** Supabase (optional)

## Current Characters
1. **Darby** - Curious 2nd grader who loves animals
   - Voice ID: `Nggzl2QAXh3OijoXD116`
   - Image: `/characters/avatar-4.webp`
   - Accent: Green (#4CAF50)

2. **Dennis** - Dive bar regular with rambling stories
   - Voice ID: `YEkUdc7PezGaXaRslSHB`
   - Image: `/characters/avatar-5.webp`
   - Accent: Brown (#795548)

3. **Chef Antonio Bianchi** - Italian cooking master
   - Voice ID: `s2wvuS7SwITYg8dqsJdn`
   - Image: `/characters/avatar-3.webp`
   - Accent: Red (#CE2B37)

## Key Files
- `app/page.tsx` - Main app, character definitions (DEMO_CHARACTERS array)
- `app/api/chat/route.ts` - Claude API integration with RAG support
- `app/api/tts/route.ts` - ElevenLabs TTS endpoint
- `app/api/stt/token/route.ts` - Deepgram token endpoint
- `hooks/use-conversation.ts` - Orchestrates STT → LLM → TTS pipeline
- `lib/store.ts` - Zustand stores (conversation, settings, UI, dev)
- `lib/deepgram.ts` - Deepgram WebSocket client
- `components/avatar/mic-button.tsx` - Mic button with visual feedback

## Features Implemented
- Voice input via Deepgram (push-to-talk or toggle mode)
- Claude responses with character personalities
- ElevenLabs TTS with per-character voices
- Character switching with chat clearing
- Creative Mode toggle (bypasses RAG/Pinecone)
- Response limit: ~400 characters
- Debug logging for TTS flow

## Environment Variables (Vercel)
- `ANTHROPIC_API_KEY` - Claude API
- `DEEPGRAM_API_KEY` - Speech-to-text
- `ELEVENLABS_API_KEY` - Text-to-speech
- `OPENAI_API_KEY` - Embeddings (for RAG)
- `PINECONE_API_KEY` - Vector DB (not configured)
- `DID_API_KEY` - Video avatar (not configured)

## Known Issues / TODO
- D-ID integration returns 500 (not configured)
- Pinecone/RAG not set up yet
- ElevenLabs quota can run out (user needs credits)
- Deepgram connection can drop - fixed with auto-reconnect

## Deployment
- **URL:** https://chatbot-two-rust-39.vercel.app
- **GitHub:** https://github.com/Chartin80/avatarlive
- Deploy command: `vercel --prod`

## Recent Changes (March 2026)
- Swapped characters: Walter/Piper → Darby/Dennis
- Fixed character switching (was using stale closures)
- Added ElevenLabs TTS integration
- Fixed Claude model IDs (now using claude-haiku-4-5-20251001)
- Added debugging logs for TTS flow
- Limited responses to ~400 characters
