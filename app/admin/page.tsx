"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Shield,
  Plus,
  Upload,
  Trash2,
  FileText,
  Image,
  Loader2,
  Check,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

// ==============================================
// ADMIN DASHBOARD
// Character and knowledge base management
// ==============================================

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple password check (in production, use proper auth)
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD || password === "admin123") {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Invalid password");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="glass rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Admin Access</h1>
                <p className="text-sm text-white/60">Enter password to continue</p>
              </div>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />

              {authError && (
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {authError}
                </p>
              )}

              <Button type="submit" className="w-full" variant="glow">
                Access Dashboard
              </Button>
            </form>

            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-white/60 hover:text-white mt-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to app
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"characters" | "knowledge">("characters");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass-dark border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-sm text-white/60">Manage characters and knowledge</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === "characters" ? "default" : "ghost"}
              onClick={() => setActiveTab("characters")}
            >
              Characters
            </Button>
            <Button
              variant={activeTab === "knowledge" ? "default" : "ghost"}
              onClick={() => setActiveTab("knowledge")}
            >
              Knowledge Base
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === "characters" ? <CharactersPanel /> : <KnowledgePanel />}
      </main>
    </div>
  );
}

// Characters management panel
function CharactersPanel() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Characters</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="glow">
              <Plus className="w-4 h-4 mr-2" />
              Add Character
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Character</DialogTitle>
            </DialogHeader>
            <CreateCharacterForm onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Characters list */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Demo character cards */}
        <CharacterCard
          name="Chef Mario"
          bio="Italian chef specializing in Mediterranean cuisine"
          imageUrl="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400"
          accentColor="#CE2B37"
          documentsCount={5}
        />
        <CharacterCard
          name="Professor Ada"
          bio="Computer science professor and AI expert"
          imageUrl="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400"
          accentColor="#1E3A8A"
          documentsCount={12}
        />
        <CharacterCard
          name="Coach Alex"
          bio="Fitness coach and nutrition expert"
          imageUrl="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400"
          accentColor="#059669"
          documentsCount={8}
        />
      </div>
    </div>
  );
}

// Character card component
function CharacterCard({
  name,
  bio,
  imageUrl,
  accentColor,
  documentsCount,
}: {
  name: string;
  bio: string;
  imageUrl: string;
  accentColor: string;
  documentsCount: number;
}) {
  return (
    <motion.div
      className="glass rounded-2xl overflow-hidden"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className="h-32 bg-cover bg-center"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div className="p-4">
        <h3 className="font-semibold text-white" style={{ color: accentColor }}>
          {name}
        </h3>
        <p className="text-sm text-white/60 mt-1 line-clamp-2">{bio}</p>
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-white/40">
            {documentsCount} documents
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">
              Edit
            </Button>
            <Button variant="ghost" size="sm" className="text-red-400">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Create character form
function CreateCharacterForm({ onSuccess }: { onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    expertise: "",
    greeting: "",
    accentColor: "#EF4444",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Implement actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onSuccess();
    } catch (error) {
      console.error("Failed to create character:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">
          Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
          placeholder="e.g., Chef Mario"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">
          Bio
        </label>
        <textarea
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white resize-none h-20"
          placeholder="Short description of the character..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">
          Expertise
        </label>
        <input
          type="text"
          value={formData.expertise}
          onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
          placeholder="e.g., Italian cooking, pasta making, wine pairing"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">
          Greeting
        </label>
        <input
          type="text"
          value={formData.greeting}
          onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
          placeholder="e.g., Ciao! What can I help you cook today?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">
          Character Image
        </label>
        <div className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center hover:border-white/30 transition-colors cursor-pointer">
          <Image className="w-8 h-8 text-white/40 mx-auto mb-2" />
          <p className="text-sm text-white/60">Click to upload or drag and drop</p>
          <p className="text-xs text-white/40 mt-1">PNG, JPG up to 5MB</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-1">
          Accent Color
        </label>
        <input
          type="color"
          value={formData.accentColor}
          onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
          className="w-20 h-10 rounded-lg cursor-pointer"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="ghost" className="flex-1" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" variant="glow" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Create Character
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// Knowledge base management panel
function KnowledgePanel() {
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        setUploadProgress(i);
      }

      // TODO: Implement actual file upload and embedding
      console.log("Files to upload:", files);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Knowledge Base</h2>

        {/* Character selector */}
        <select
          value={selectedCharacter || ""}
          onChange={(e) => setSelectedCharacter(e.target.value || null)}
          className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
        >
          <option value="">All Characters</option>
          <option value="chef-mario">Chef Mario</option>
          <option value="prof-ada">Professor Ada</option>
          <option value="coach-alex">Coach Alex</option>
        </select>
      </div>

      {/* Upload area */}
      <div
        className="glass rounded-2xl p-8 mb-6 text-center border-2 border-dashed border-white/10 hover:border-primary/50 transition-colors cursor-pointer"
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add("border-primary");
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove("border-primary");
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("border-primary");
          handleFileUpload(e.dataTransfer.files);
        }}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept = ".pdf,.txt,.md";
          input.onchange = (e) => {
            const target = e.target as HTMLInputElement;
            handleFileUpload(target.files);
          };
          input.click();
        }}
      >
        {isUploading ? (
          <div>
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-white mb-2">Processing documents...</p>
            <div className="w-full max-w-xs mx-auto bg-white/10 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-white/60 mt-2">{uploadProgress}% complete</p>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <p className="text-white mb-2">
              Drop files here or click to upload
            </p>
            <p className="text-sm text-white/60">
              Supports PDF, TXT, and Markdown files
            </p>
          </>
        )}
      </div>

      {/* Documents list */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          <DocumentItem
            name="italian-recipes.pdf"
            size="2.4 MB"
            chunks={45}
            character="Chef Mario"
            status="completed"
          />
          <DocumentItem
            name="pasta-techniques.txt"
            size="156 KB"
            chunks={12}
            character="Chef Mario"
            status="completed"
          />
          <DocumentItem
            name="machine-learning-basics.pdf"
            size="5.1 MB"
            chunks={89}
            character="Professor Ada"
            status="completed"
          />
          <DocumentItem
            name="workout-plans.pdf"
            size="1.8 MB"
            chunks={34}
            character="Coach Alex"
            status="processing"
          />
        </div>
      </ScrollArea>
    </div>
  );
}

// Document item component
function DocumentItem({
  name,
  size,
  chunks,
  character,
  status,
}: {
  name: string;
  size: string;
  chunks: number;
  character: string;
  status: "pending" | "processing" | "completed" | "error";
}) {
  return (
    <div className="glass rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
        <FileText className="w-5 h-5 text-white/60" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        <p className="text-xs text-white/60">
          {size} • {chunks} chunks • {character}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {status === "completed" && (
          <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
            Indexed
          </span>
        )}
        {status === "processing" && (
          <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </span>
        )}
        {status === "error" && (
          <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
            Error
          </span>
        )}

        <Button variant="ghost" size="sm" className="text-red-400">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
