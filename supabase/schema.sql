-- ==============================================
-- AVATARLIVE DATABASE SCHEMA
-- Run this in Supabase SQL Editor to set up tables
-- ==============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- CHARACTERS TABLE ----------
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  bio TEXT NOT NULL,
  expertise TEXT NOT NULL,
  image_url TEXT,
  thumbnail_url TEXT,
  greeting TEXT DEFAULT 'Hello! How can I help you today?',
  voice_style JSONB DEFAULT '{"provider": "d-id", "voiceId": "en-US-JennyNeural"}',
  accent_color VARCHAR(7) DEFAULT '#EF4444',
  did_avatar_id VARCHAR(100),
  did_agent_id VARCHAR(100),
  pinecone_namespace VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_characters_slug ON characters(slug);
CREATE INDEX idx_characters_active ON characters(is_active);

-- ---------- KNOWLEDGE FILES TABLE ----------
CREATE TABLE IF NOT EXISTS knowledge_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('pdf', 'txt', 'url', 'md')),
  file_size INTEGER,
  file_url TEXT,
  chunk_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_message TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX idx_knowledge_files_character ON knowledge_files(character_id);
CREATE INDEX idx_knowledge_files_status ON knowledge_files(status);

-- ---------- CONVERSATIONS TABLE ----------
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(100),
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

-- Create index for faster lookups
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_character ON conversations(character_id);

-- ---------- MESSAGES TABLE ----------
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  audio_url TEXT,
  video_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- ---------- USERS TABLE (Optional - for authenticated users) ----------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE,
  name VARCHAR(100),
  avatar_url TEXT,
  preferences JSONB DEFAULT '{"voiceSpeed": 1.0, "videoEnabled": true, "pushToTalk": false, "autoPlay": true, "captionsEnabled": true}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------- ANALYTICS TABLE ----------
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name VARCHAR(100) NOT NULL,
  user_id VARCHAR(100),
  session_id VARCHAR(100),
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for analytics queries
CREATE INDEX idx_analytics_event ON analytics_events(event_name);
CREATE INDEX idx_analytics_created ON analytics_events(created_at DESC);

-- ---------- ROW LEVEL SECURITY ----------
-- Enable RLS on tables
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Public read access for characters
CREATE POLICY "Characters are viewable by everyone"
  ON characters FOR SELECT
  USING (is_active = true);

-- Authenticated users can manage their own data
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()::text
    )
  );

-- Service role has full access
CREATE POLICY "Service role has full access to characters"
  ON characters FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to knowledge_files"
  ON knowledge_files FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ---------- FUNCTIONS ----------
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to characters table
CREATE TRIGGER update_characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update conversation message count and last_message_at
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    message_count = message_count + 1,
    last_message_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- ---------- SEED DATA ----------
-- Insert demo characters
INSERT INTO characters (name, slug, bio, expertise, image_url, greeting, voice_style, accent_color, pinecone_namespace)
VALUES
  (
    'Chef Mario',
    'chef-mario',
    'A passionate Italian chef with 30 years of experience in traditional Mediterranean cuisine.',
    'Italian cooking, pasta making, wine pairing, Mediterranean diet',
    'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800&h=1000&fit=crop',
    'Ciao! I''m Chef Mario. What delicious dish can I help you create today?',
    '{"provider": "d-id", "voiceId": "en-US-GuyNeural"}',
    '#CE2B37',
    'character_chef_mario'
  ),
  (
    'Professor Ada',
    'prof-ada',
    'A brilliant computer science professor specializing in AI and machine learning.',
    'Artificial intelligence, machine learning, programming, computer science',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=1000&fit=crop',
    'Hello! I''m Professor Ada. Ready to explore the fascinating world of AI together?',
    '{"provider": "d-id", "voiceId": "en-US-JennyNeural"}',
    '#1E3A8A',
    'character_prof_ada'
  ),
  (
    'Coach Alex',
    'coach-alex',
    'An energetic fitness coach passionate about helping people achieve their health goals.',
    'Fitness training, nutrition, weight loss, muscle building, wellness',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=1000&fit=crop',
    'Hey there! I''m Coach Alex. Let''s get you on track to your best self!',
    '{"provider": "d-id", "voiceId": "en-US-DavisNeural"}',
    '#059669',
    'character_coach_alex'
  )
ON CONFLICT (slug) DO NOTHING;
