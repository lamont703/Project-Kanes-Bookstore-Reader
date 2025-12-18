import { Card } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  accentColor?: "primary" | "secondary"
}

export function StatCard({ title, value, subtitle, icon: Icon, accentColor = "primary" }: StatCardProps) {
  const colorClasses = {
    primary: "bg-primary/20 text-primary",
    secondary: "bg-secondary/20 text-secondary",
  }

  return (
    <Card className="p-6 bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="font-display text-4xl tracking-wide mb-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[accentColor]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  )
}
