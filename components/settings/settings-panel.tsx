"use client";

import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useSettingsStore, useUIStore } from "@/lib/store";
import {
  Settings,
  Volume2,
  Video,
  Hand,
  Play,
  Subtitles,
  SunMoon,
} from "lucide-react";

export function SettingsPanel() {
  const { settings, updateSettings } = useSettingsStore();
  const { isSettingsOpen, setSettingsOpen } = useUIStore();

  return (
    <Dialog open={isSettingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Voice Speed */}
          <SettingItem
            icon={Volume2}
            label="Voice Speed"
            description="Adjust how fast the character speaks"
          >
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm text-white/60">0.5x</span>
              <Slider
                value={[settings.voiceSpeed]}
                onValueChange={([value]) => updateSettings({ voiceSpeed: value })}
                min={0.5}
                max={2}
                step={0.1}
                className="flex-1"
              />
              <span className="text-sm text-white/60">2x</span>
            </div>
            <p className="text-xs text-white/40 mt-1">
              Current: {settings.voiceSpeed.toFixed(1)}x
            </p>
          </SettingItem>

          {/* Video Enabled */}
          <SettingItem
            icon={Video}
            label="Video Avatar"
            description="Show animated video of the character"
          >
            <Switch
              checked={settings.videoEnabled}
              onCheckedChange={(checked) =>
                updateSettings({ videoEnabled: checked })
              }
            />
          </SettingItem>

          {/* Push to Talk */}
          <SettingItem
            icon={Hand}
            label="Push to Talk"
            description="Hold mic button to talk instead of toggle"
          >
            <Switch
              checked={settings.pushToTalk}
              onCheckedChange={(checked) =>
                updateSettings({ pushToTalk: checked })
              }
            />
          </SettingItem>

          {/* Auto Play */}
          <SettingItem
            icon={Play}
            label="Auto Play Responses"
            description="Automatically play character responses"
          >
            <Switch
              checked={settings.autoPlay}
              onCheckedChange={(checked) =>
                updateSettings({ autoPlay: checked })
              }
            />
          </SettingItem>

          {/* Captions */}
          <SettingItem
            icon={Subtitles}
            label="Always Show Captions"
            description="Display text transcript while speaking"
          >
            <Switch
              checked={settings.captionsEnabled}
              onCheckedChange={(checked) =>
                updateSettings({ captionsEnabled: checked })
              }
            />
          </SettingItem>

          {/* High Contrast */}
          <SettingItem
            icon={SunMoon}
            label="High Contrast"
            description="Increase contrast for better visibility"
          >
            <Switch
              checked={settings.highContrast}
              onCheckedChange={(checked) =>
                updateSettings({ highContrast: checked })
              }
            />
          </SettingItem>
        </div>

        {/* Reset button */}
        <motion.button
          className="w-full py-3 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white/60 transition-colors"
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            useSettingsStore.getState().resetSettings();
          }}
        >
          Reset to Defaults
        </motion.button>
      </DialogContent>
    </Dialog>
  );
}

// Individual setting item component
function SettingItem({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-white/60" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-medium text-white">{label}</h4>
            <p className="text-xs text-white/50 mt-0.5">{description}</p>
          </div>
          {/* Only render Switch directly if it's a Switch */}
          {typeof children === "object" &&
          children !== null &&
          "type" in (children as React.ReactElement) &&
          (children as React.ReactElement).type === Switch ? (
            children
          ) : null}
        </div>
        {/* Render Slider and other content below */}
        {typeof children === "object" &&
        children !== null &&
        "type" in (children as React.ReactElement) &&
        (children as React.ReactElement).type !== Switch
          ? children
          : null}
      </div>
    </div>
  );
}
