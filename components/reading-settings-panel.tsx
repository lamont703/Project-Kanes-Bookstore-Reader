"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Minus, Plus, ZoomIn } from "lucide-react"
import type { ReadingSettings } from "@/lib/reading-storage"

interface ReadingSettingsPanelProps {
  settings: ReadingSettings
  onSettingsChange: (settings: ReadingSettings) => void
}

export function ReadingSettingsPanel({ settings, onSettingsChange }: ReadingSettingsPanelProps) {
  const updateSetting = <K extends keyof ReadingSettings>(key: K, value: ReadingSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  const zoomPresets = [75, 100, 125, 150]

  return (
    <Card className="p-6 space-y-6 bg-card/80 backdrop-blur">
      <div>
        <h3 className="font-display text-xl tracking-wide mb-4 flex items-center gap-2">
          <ZoomIn className="w-5 h-5" />
          PAGE SETTINGS
        </h3>

        {/* View Mode Toggle */}
        <div className="space-y-3">
          <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Reading Mode</label>
          <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
            <Button
              variant={settings.viewMode === "original" ? "default" : "ghost"}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => updateSetting("viewMode", "original")}
            >
              ORIGINAL PDF
            </Button>
            <Button
              variant={settings.viewMode === "text" ? "default" : "ghost"}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => updateSetting("viewMode", "text")}
            >
              REFLOWABLE TEXT
            </Button>
          </div>
        </div>

        {/* Zoom Level (Only in Original View) */}
        {settings.viewMode === "original" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Zoom Level</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateSetting("zoom", Math.max(50, settings.zoom - 10))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-sm w-12 text-center font-mono">{settings.zoom}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateSetting("zoom", Math.min(200, settings.zoom + 10))}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Typography (Only in Text View) */}
        {settings.viewMode === "text" && (
          <div className="space-y-5 py-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Text Size</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateSetting("fontSize", Math.max(12, settings.fontSize - 2))}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-sm w-12 text-center font-mono">{settings.fontSize}px</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateSetting("fontSize", Math.min(32, settings.fontSize + 2))}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Font Family</label>
              <div className="flex gap-2">
                {(["serif", "sans", "mono"] as const).map((font) => (
                  <Button
                    key={font}
                    variant={settings.fontFamily === font ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs capitalize"
                    onClick={() => updateSetting("fontFamily", font)}
                  >
                    {font}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Theme */}
        <div className="space-y-3">
          <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground block">Background</label>
          <div className="flex gap-4">
            <button
              className={`flex-1 h-12 rounded-xl border-2 transition-all ${settings.theme === "dark" ? "border-primary scale-105" : "border-border/50"} bg-[oklch(0.12_0.08_270)]`}
              onClick={() => updateSetting("theme", "dark")}
              aria-label="Dark theme"
            />
            <button
              className={`flex-1 h-12 rounded-xl border-2 transition-all ${settings.theme === "light" ? "border-primary scale-105" : "border-border/50"} bg-white`}
              onClick={() => updateSetting("theme", "light")}
              aria-label="Light theme"
            />
            <button
              className={`flex-1 h-12 rounded-xl border-2 transition-all ${settings.theme === "sepia" ? "border-primary scale-105" : "border-border/50"} bg-[#f4ecd8]`}
              onClick={() => updateSetting("theme", "sepia")}
              aria-label="Sepia theme"
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
