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

        <div className="space-y-5">
          {/* Zoom Level */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Zoom Level</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateSetting("zoom", Math.max(50, settings.zoom - 25))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-sm w-14 text-center font-mono">{settings.zoom}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateSetting("zoom", Math.min(200, settings.zoom + 25))}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {/* Quick presets */}
            <div className="flex gap-2">
              {zoomPresets.map((preset) => (
                <Button
                  key={preset}
                  variant={settings.zoom === preset ? "default" : "outline"}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => updateSetting("zoom", preset)}
                >
                  {preset}%
                </Button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Background</label>
            <div className="flex gap-2">
              <button
                className={`w-8 h-8 rounded border-2 ${settings.theme === "dark" ? "border-primary" : "border-border"} bg-[oklch(0.12_0.08_270)]`}
                onClick={() => updateSetting("theme", "dark")}
                aria-label="Dark theme"
              />
              <button
                className={`w-8 h-8 rounded border-2 ${settings.theme === "light" ? "border-primary" : "border-border"} bg-white`}
                onClick={() => updateSetting("theme", "light")}
                aria-label="Light theme"
              />
              <button
                className={`w-8 h-8 rounded border-2 ${settings.theme === "sepia" ? "border-primary" : "border-border"} bg-[#f4ecd8]`}
                onClick={() => updateSetting("theme", "sepia")}
                aria-label="Sepia theme"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
