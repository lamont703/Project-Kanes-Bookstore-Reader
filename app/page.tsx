import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BookOpen, Star, Rocket, Zap } from "lucide-react"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import Image from "next/image"

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Cosmic background effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(127,255,0,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(255,215,0,0.08),transparent_50%)]" />

        <div className="container relative mx-auto px-4 py-16 md:py-24">
          {/* Header removed */}

          {/* Hero Content */}
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-block">
              <div className="bg-primary/10 text-primary border border-primary/30 px-4 py-2 rounded-full text-sm font-medium">
                THE FUNKIEST BOOKSTORE IN THE UNIVERSE
              </div>
            </div>

            <h1 className="font-display text-6xl md:text-8xl lg:text-9xl tracking-wider leading-none text-balance">
              <span className="text-primary">READ</span> <span className="text-secondary">KOMET</span>{" "}
              <span className="text-foreground">BOOKS</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
              Discover mind-bending reads, join our intergalactic book club, and explore stories from across the cosmos.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-lg px-8 animate-pulse-glow" asChild>
                <Link href="/browse">
                  <Rocket className="w-5 h-5 mr-2" />
                  Start Reading
                </Link>
              </Button>

            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-20">
            <Card className="p-6 bg-card/50 backdrop-blur border-primary/20 hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-2xl tracking-wide mb-2">KOMET LIBRARY</h3>
              <p className="text-muted-foreground leading-relaxed">
                Access thousands of books from every genre. Purchase individual titles or subscribe to our book club.
              </p>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur border-secondary/20 hover:border-secondary/50 transition-colors">
              <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-display text-2xl tracking-wide mb-2">POWER READING</h3>
              <p className="text-muted-foreground leading-relaxed">
                Highlight, bookmark, take notes, and customize your reading experience like never before.
              </p>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur border-primary/20 hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-2xl tracking-wide mb-2">BOOK CLUB</h3>
              <p className="text-muted-foreground leading-relaxed">
                Get 1 curated book monthly, join discussions, and connect with fellow Komet readers.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-5xl md:text-6xl tracking-wider mb-4">
              <span className="text-secondary">HOW IT</span> <span className="text-primary">WORKS</span>
            </h2>
            <p className="text-xl text-muted-foreground">Three simple steps to Komet enlightenment</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto text-primary-foreground font-display text-3xl">
                1
              </div>
              <h3 className="font-display text-2xl tracking-wide">CHOOSE YOUR PATH</h3>
              <p className="text-muted-foreground leading-relaxed">
                Browse our library and purchase books individually, or subscribe to our monthly book club for curated
                selections.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto text-secondary-foreground font-display text-3xl">
                2
              </div>
              <h3 className="font-display text-2xl tracking-wide">READ & EXPLORE</h3>
              <p className="text-muted-foreground leading-relaxed">
                Use our powerful reader with highlights, bookmarks, notes, and customizable text settings for the
                perfect experience.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto text-primary-foreground font-display text-3xl">
                3
              </div>
              <h3 className="font-display text-2xl tracking-wide">CONNECT</h3>
              <p className="text-muted-foreground leading-relaxed">
                Join discussions, share your thoughts, and connect with other readers in our vibrant Komet community.
              </p>
            </div>
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/YyXjhz49RRIC60sTREka/media/661ea792d03e91ccb4968534.png"
                alt="Kane's Komets Logo"
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg object-contain"
              />
              <span className="font-display text-2xl tracking-wider text-primary">KANE'S KOMETS</span>
            </div>

            <div className="flex gap-8 text-sm text-muted-foreground">
              <Link href="/about" className="hover:text-primary transition-colors">
                About
              </Link>
              <Link href="/contact" className="hover:text-primary transition-colors">
                Contact
              </Link>
              <Link href="/terms" className="hover:text-primary transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">
                Privacy
              </Link>
            </div>

            <p className="text-sm text-muted-foreground">© 2025 Kane's Komets Book Club. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
