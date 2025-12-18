"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Minus, Plus, Type, AlignLeft, AlignJustify } from "lucide-react"
import type { ReadingSettings } from "@/lib/reading-storage"

interface ReadingSettingsPanelProps {
  settings: ReadingSettings
  onSettingsChange: (settings: ReadingSettings) => void
}

export function ReadingSettingsPanel({ settings, onSettingsChange }: ReadingSettingsPanelProps) {
  const updateSetting = <K extends keyof ReadingSettings>(key: K, value: ReadingSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  return (
    <Card className="p-6 space-y-6 bg-card/80 backdrop-blur">
      <div>
        <h3 className="font-display text-xl tracking-wide mb-4 flex items-center gap-2">
          <Type className="w-5 h-5" />
          TEXT SETTINGS
        </h3>

        {/* Font Size */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Font Size</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSetting("fontSize", Math.max(12, settings.fontSize - 2))}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-sm w-12 text-center">{settings.fontSize}px</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSetting("fontSize", Math.min(32, settings.fontSize + 2))}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Font Family */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Font Family</label>
            <select
              className="bg-background border border-border rounded-md px-3 py-1 text-sm"
              value={settings.fontFamily}
              onChange={(e) => updateSetting("fontFamily", e.target.value as any)}
            >
              <option value="serif">Serif</option>
              <option value="sans">Sans Serif</option>
              <option value="mono">Monospace</option>
            </select>
          </div>

          {/* Line Height */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Line Height</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSetting("lineHeight", Math.max(1.2, settings.lineHeight - 0.2))}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-sm w-12 text-center">{settings.lineHeight.toFixed(1)}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSetting("lineHeight", Math.min(2.5, settings.lineHeight + 0.2))}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Text Align */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Alignment</label>
            <div className="flex gap-2">
              <Button
                variant={settings.textAlign === "left" ? "default" : "outline"}
                size="sm"
                onClick={() => updateSetting("textAlign", "left")}
              >
                <AlignLeft className="w-4 h-4" />
              </Button>
              <Button
                variant={settings.textAlign === "justify" ? "default" : "outline"}
                size="sm"
                onClick={() => updateSetting("textAlign", "justify")}
              >
                <AlignJustify className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Theme */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Theme</label>
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
