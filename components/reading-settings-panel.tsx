"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Minus, Plus, Settings2 } from "lucide-react"
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
          <Settings2 className="w-5 h-5 text-primary" />
          READING EXPERIENCE
        </h3>

        {/* Typography */}
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

        {/* Theme */}
        <div className="space-y-4 mt-6">
          <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground block">Display Theme</label>
          <div className="flex gap-4">
            <button
              className={`flex-1 h-14 rounded-xl border-2 transition-all ${settings.theme === "dark" ? "border-primary scale-105 shadow-[0_0_15px_rgba(var(--primary),0.3)]" : "border-border/50 hover:border-border"} bg-[oklch(0.12_0.08_270)]`}
              onClick={() => updateSetting("theme", "dark")}
              aria-label="Dark theme"
            />
            <button
              className={`flex-1 h-14 rounded-xl border-2 transition-all ${settings.theme === "light" ? "border-primary scale-105 shadow-[0_0_15px_rgba(var(--primary),0.3)]" : "border-border/50 hover:border-border"} bg-white`}
              onClick={() => updateSetting("theme", "light")}
              aria-label="Light theme"
            />
            <button
              className={`flex-1 h-14 rounded-xl border-2 transition-all ${settings.theme === "sepia" ? "border-primary scale-105 shadow-[0_0_15px_rgba(var(--primary),0.3)]" : "border-border/50 hover:border-border"} bg-[#f4ecd8]`}
              onClick={() => updateSetting("theme", "sepia")}
              aria-label="Sepia theme"
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
