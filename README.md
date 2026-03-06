# AvatarLive - Interactive Video Chatbot

A real-time conversational video chatbot where users talk to lifelike animated characters. Built with Next.js 15, featuring sub-2-second response latency and iPad-optimized PWA experience.

![AvatarLive Demo](./docs/demo.gif)

## Features

- 🎭 **Multiple Characters** - Switch between cartoon, realistic, and custom avatars
- 🎤 **Real-time Voice** - Deepgram STT with sub-500ms transcription
- 🧠 **RAG-powered AI** - Claude with character-specific knowledge bases
- 🎬 **Streaming Video** - D-ID real-time avatar with perfect lip-sync
- 📱 **iPad PWA** - Fullscreen app experience with touch optimization
- 🔄 **Low Latency** - End-to-end response under 2 seconds

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Framer Motion |
| UI | shadcn/ui, Radix UI, Lucide Icons |
| State | Zustand with persistence |
| STT | Deepgram WebSocket (Nova-2) |
| LLM | Anthropic Claude (Haiku/Sonnet) |
| RAG | Pinecone vector store |
| Avatar | D-ID Realtime API (WebRTC) |
| Database | Supabase (Postgres) |
| Deployment | Vercel |

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd avatarlive
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Fill in your API keys:

```env
# Anthropic (Claude) - https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Deepgram (STT) - https://console.deepgram.com/
DEEPGRAM_API_KEY=xxxxx

# D-ID (Avatar) - https://studio.d-id.com/account
DID_API_KEY=xxxxx

# Pinecone (Vector Store) - https://app.pinecone.io/
PINECONE_API_KEY=xxxxx
PINECONE_INDEX=avatarlive

# Supabase - https://supabase.com/dashboard
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# OpenAI (for embeddings) - https://platform.openai.com/
OPENAI_API_KEY=xxxxx

# Admin
ADMIN_PASSWORD=your-secure-password
```

### 3. Set Up Database

1. Go to your Supabase project
2. Open SQL Editor
3. Copy and run the contents of `supabase/schema.sql`

### 4. Set Up Pinecone

1. Create a new index called `avatarlive`
2. Dimension: `1536` (for OpenAI embeddings)
3. Metric: `cosine`
4. Region: `us-east-1` (or your preferred region)

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Creating Your First D-ID Avatar

### Option A: Using D-ID Studio (Recommended)

1. Go to [D-ID Studio](https://studio.d-id.com)
2. Click "Create Video"
3. Upload your character image (photo or cartoon)
4. Note the avatar/image ID from the API response
5. Add it to your character's `did_avatar_id` field

### Option B: Via API

```bash
curl -X POST https://api.d-id.com/images \
  -H "Authorization: Basic YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-image-url.jpg",
    "name": "Chef Mario"
  }'
```

## Adding a New Character

### 1. Via Admin Panel

1. Go to `/admin`
2. Enter admin password
3. Click "Add Character"
4. Fill in details and upload image
5. Upload knowledge documents (PDF, TXT)

### 2. Via Database

```sql
INSERT INTO characters (name, slug, bio, expertise, image_url, greeting, pinecone_namespace)
VALUES (
  'Your Character',
  'your-character',
  'Character bio here',
  'expertise1, expertise2',
  'https://image-url.jpg',
  'Hello! How can I help?',
  'character_your_character'
);
```

### 3. Add Knowledge Base

Upload documents via admin panel or use the embedding API:

```typescript
import { chunkText, upsertChunks } from '@/lib/pinecone';
import { getEmbeddings } from '@/lib/embeddings';

// 1. Chunk your text
const chunks = chunkText(documentText, 500, 50);

// 2. Generate embeddings
const embeddings = await getEmbeddings(chunks);

// 3. Upsert to Pinecone
await upsertChunks(pinecone, 'avatarlive', 'character_slug',
  chunks.map((content, i) => ({
    id: `chunk_${i}`,
    content,
    embedding: embeddings[i],
    metadata: { characterId: 'id', sourceFile: 'doc.pdf', chunkIndex: i }
  }))
);
```

## Testing on iPad Safari

### 1. Local Development

```bash
# Get your local IP
ipconfig getifaddr en0  # macOS
# or
hostname -I  # Linux

# Run dev server on all interfaces
npm run dev -- --host 0.0.0.0
```

Access from iPad: `http://YOUR_IP:3000`

### 2. Add to Home Screen

1. Open Safari on iPad
2. Navigate to your app
3. Tap Share icon
4. "Add to Home Screen"
5. App opens fullscreen as PWA

### 3. Test Checklist

- [ ] Microphone permission works
- [ ] Voice recognition accurate
- [ ] Video plays smoothly
- [ ] Touch targets are 44px+
- [ ] Landscape/portrait handled
- [ ] Audio plays without issues

## Latency Optimization Tips

### Current Architecture
```
User speaks → Deepgram STT (200-400ms) →
Claude Haiku + RAG (300-600ms) →
D-ID Realtime (200-400ms) →
User sees response
```

### Optimizations Applied

1. **Deepgram Nova-2** - Fastest STT model
2. **Claude Haiku** - Sub-second responses
3. **Prompt Caching** - Reduces redundant processing
4. **D-ID Fluent Mode** - Streaming video chunks
5. **WebRTC** - Direct peer connection
6. **Edge Functions** - Reduced round trips

### Further Improvements

```typescript
// Parallel processing
const [ragContext, _] = await Promise.all([
  queryPinecone(query),
  warmupDIDSession(), // Pre-warm during STT
]);

// Streaming responses
const stream = await claude.messages.stream({...});
for await (const chunk of stream) {
  // Start D-ID talk as soon as first sentence complete
  if (chunk.includes('.')) {
    sendToDID(chunk);
  }
}
```

## Project Structure

```
avatarlive/
├── app/
│   ├── page.tsx           # Main conversation page
│   ├── admin/             # Admin dashboard
│   ├── layout.tsx         # Root layout with PWA
│   └── api/
│       ├── chat/          # Claude + RAG endpoint
│       ├── stt/           # Deepgram token
│       ├── did/           # D-ID session management
│       └── characters/    # Character CRUD
├── components/
│   ├── avatar/            # Avatar player, mic button
│   ├── ui/                # shadcn components
│   ├── layout/            # Header, layouts
│   └── settings/          # Settings panel
├── lib/
│   ├── store.ts           # Zustand state
│   ├── deepgram.ts        # STT client
│   ├── did.ts             # D-ID client
│   ├── claude.ts          # Claude helpers
│   ├── pinecone.ts        # RAG utilities
│   └── supabase/          # Database clients
├── hooks/
│   └── use-conversation.ts # Main conversation hook
├── types/
│   └── index.ts           # TypeScript types
├── public/
│   ├── manifest.json      # PWA manifest
│   └── icons/             # App icons
└── supabase/
    └── schema.sql         # Database schema
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `DEEPGRAM_API_KEY` | Yes | Deepgram API key |
| `DID_API_KEY` | Yes | D-ID API key |
| `PINECONE_API_KEY` | Yes | Pinecone API key |
| `PINECONE_INDEX` | Yes | Pinecone index name |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service key |
| `OPENAI_API_KEY` | Yes | OpenAI key (for embeddings) |
| `ADMIN_PASSWORD` | Yes | Admin panel password |
| `ELEVENLABS_API_KEY` | No | ElevenLabs for voice cloning |

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Other Platforms

Works on any Node.js platform:
- AWS Amplify
- Netlify
- Railway
- Render

## Troubleshooting

### Microphone Not Working

- Check browser permissions
- Ensure HTTPS (required for getUserMedia)
- Safari requires user gesture to start

### D-ID Video Not Playing

- Check WebRTC support
- Verify D-ID API key
- Check browser console for ICE errors

### Slow Responses

- Use Claude Haiku (not Sonnet)
- Enable prompt caching
- Check Pinecone region latency
- Use D-ID fluent mode

### Safari Audio Issues

Safari has specific autoplay policies:
```typescript
// Ensure user interaction before playing
button.onclick = () => {
  video.play(); // Works after click
};
```

## License

MIT

## Support

- [GitHub Issues](https://github.com/your-repo/issues)
- [Documentation](https://docs.avatarlive.app)
- [Discord Community](https://discord.gg/avatarlive)
