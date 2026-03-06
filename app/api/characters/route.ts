import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { Character } from "@/types";

// ==============================================
// CHARACTERS API
// CRUD operations for character management
// ==============================================

// GET - List all active characters
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: characters, error } = await supabase
      .from("characters")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Characters] Fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch characters" },
        { status: 500 }
      );
    }

    // Transform database records to Character type
    const transformedCharacters: Character[] = (characters || []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      bio: c.bio,
      expertise: c.expertise,
      imageUrl: c.image_url,
      thumbnailUrl: c.thumbnail_url,
      greeting: c.greeting,
      voiceStyle: c.voice_style,
      accentColor: c.accent_color,
      didAvatarId: c.did_avatar_id,
      didAgentId: c.did_agent_id,
      pineconeNamespace: c.pinecone_namespace,
      isActive: c.is_active,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    return NextResponse.json(transformedCharacters);
  } catch (error) {
    console.error("[Characters] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new character (admin only)
export async function POST(request: NextRequest) {
  try {
    // Simple admin auth check
    const adminPassword = request.headers.get("x-admin-password");
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      bio,
      expertise,
      imageUrl,
      greeting,
      voiceStyle,
      accentColor,
    } = body;

    if (!name || !bio || !expertise) {
      return NextResponse.json(
        { error: "Name, bio, and expertise are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");

    // Create Pinecone namespace
    const pineconeNamespace = `character_${slug}`;

    const { data: character, error } = await supabase
      .from("characters")
      .insert({
        name,
        slug,
        bio,
        expertise,
        image_url: imageUrl,
        greeting:
          greeting || `Hi there! I'm ${name}. What can I help you with today?`,
        voice_style: voiceStyle || {
          provider: "d-id",
          voiceId: "en-US-JennyNeural",
        },
        accent_color: accentColor || "#EF4444",
        pinecone_namespace: pineconeNamespace,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("[Characters] Create error:", error);
      return NextResponse.json(
        { error: "Failed to create character" },
        { status: 500 }
      );
    }

    return NextResponse.json(character, { status: 201 });
  } catch (error) {
    console.error("[Characters] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
