import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { createAdminClient } from "@/lib/supabase/server";
import { chunkText, upsertChunks, createNamespace } from "@/lib/pinecone";
import { getEmbeddings, initEmbeddingsClient } from "@/lib/embeddings";

// ==============================================
// KNOWLEDGE EMBEDDING API
// Process documents and store in Pinecone
// ==============================================

// Lazy initialization
let pinecone: Pinecone | null = null;
let embeddingsInitialized = false;

function getPineconeClient(): Pinecone {
  if (!pinecone) {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pinecone;
}

function ensureEmbeddingsInitialized(): void {
  if (!embeddingsInitialized && process.env.OPENAI_API_KEY) {
    initEmbeddingsClient(process.env.OPENAI_API_KEY);
    embeddingsInitialized = true;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Simple admin auth check
    const adminPassword = request.headers.get("x-admin-password");
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const characterId = formData.get("characterId") as string;
    const characterSlug = formData.get("characterSlug") as string;
    const textContent = formData.get("textContent") as string | null;

    if (!characterId || !characterSlug) {
      return NextResponse.json(
        { error: "Character ID and slug are required" },
        { status: 400 }
      );
    }

    let content: string;
    let fileName: string;
    let fileType: string;
    let fileSize: number;

    if (file) {
      // Handle file upload
      fileName = file.name;
      fileType = file.name.split(".").pop()?.toLowerCase() || "txt";
      fileSize = file.size;

      // Read file content
      const buffer = await file.arrayBuffer();
      const text = new TextDecoder().decode(buffer);

      if (fileType === "pdf") {
        // For PDF, we would use pdf-parse
        // For now, just use raw text
        content = text;
      } else {
        content = text;
      }
    } else if (textContent) {
      // Handle direct text input
      content = textContent;
      fileName = `text_${Date.now()}.txt`;
      fileType = "txt";
      fileSize = new Blob([textContent]).size;
    } else {
      return NextResponse.json(
        { error: "No file or text content provided" },
        { status: 400 }
      );
    }

    // Create knowledge file record
    const supabase = createAdminClient();
    const { data: knowledgeFile, error: dbError } = await supabase
      .from("knowledge_files")
      .insert({
        character_id: characterId,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        status: "processing",
      })
      .select()
      .single();

    if (dbError) {
      console.error("[Knowledge] DB error:", dbError);
      return NextResponse.json(
        { error: "Failed to create knowledge record" },
        { status: 500 }
      );
    }

    try {
      // Ensure embeddings client is initialized
      ensureEmbeddingsInitialized();

      // Chunk the content
      const chunks = chunkText(content, 500, 50);
      console.log(`[Knowledge] Created ${chunks.length} chunks`);

      // Generate embeddings
      const embeddings = await getEmbeddings(chunks);
      console.log(`[Knowledge] Generated ${embeddings.length} embeddings`);

      // Prepare for upsert
      const namespace = createNamespace(characterSlug);
      const vectorData = chunks.map((chunkContent, index) => ({
        id: `${knowledgeFile.id}_${index}`,
        content: chunkContent,
        embedding: embeddings[index],
        metadata: {
          characterId,
          sourceFile: fileName,
          chunkIndex: index,
        },
      }));

      // Upsert to Pinecone
      await upsertChunks(
        getPineconeClient(),
        process.env.PINECONE_INDEX!,
        namespace,
        vectorData
      );

      // Update knowledge file status
      await supabase
        .from("knowledge_files")
        .update({
          status: "completed",
          chunk_count: chunks.length,
          processed_at: new Date().toISOString(),
        })
        .eq("id", knowledgeFile.id);

      return NextResponse.json({
        success: true,
        knowledgeFileId: knowledgeFile.id,
        chunkCount: chunks.length,
        namespace,
      });
    } catch (processingError) {
      // Update status to error
      await supabase
        .from("knowledge_files")
        .update({
          status: "error",
          error_message:
            processingError instanceof Error
              ? processingError.message
              : "Unknown error",
        })
        .eq("id", knowledgeFile.id);

      throw processingError;
    }
  } catch (error) {
    console.error("[Knowledge] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to process knowledge",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove knowledge file and its vectors
export async function DELETE(request: NextRequest) {
  try {
    const adminPassword = request.headers.get("x-admin-password");
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const knowledgeFileId = searchParams.get("id");
    const characterSlug = searchParams.get("characterSlug");

    if (!knowledgeFileId || !characterSlug) {
      return NextResponse.json(
        { error: "Knowledge file ID and character slug required" },
        { status: 400 }
      );
    }

    // Get the knowledge file info
    const supabase = createAdminClient();
    const { data: knowledgeFile } = await supabase
      .from("knowledge_files")
      .select("chunk_count")
      .eq("id", knowledgeFileId)
      .single();

    if (knowledgeFile) {
      // Delete vectors from Pinecone
      const namespace = createNamespace(characterSlug);
      const index = getPineconeClient().index(process.env.PINECONE_INDEX!);
      const ns = index.namespace(namespace);

      // Delete by ID prefix
      const idsToDelete = Array.from(
        { length: knowledgeFile.chunk_count || 0 },
        (_, i) => `${knowledgeFileId}_${i}`
      );

      if (idsToDelete.length > 0) {
        await ns.deleteMany(idsToDelete);
      }
    }

    // Delete from database
    await supabase.from("knowledge_files").delete().eq("id", knowledgeFileId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Knowledge] Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete knowledge" },
      { status: 500 }
    );
  }
}
