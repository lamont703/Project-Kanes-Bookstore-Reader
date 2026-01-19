import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BookClubSelectionCard } from "@/components/book-club-selection-card"
import { mockBooks } from "@/lib/mock-books"
import { mockBookClubSelections, mockSubscription, bookClubBenefits } from "@/lib/mock-book-club-data"
import { Sparkles, Star, Check, Users, Calendar, BookOpen, Crown } from "lucide-react"
import Link from "next/link"

export default function BookClubPage() {
  const currentSelection = mockBookClubSelections.find((s) => s.status === "current")
  const upcomingSelections = mockBookClubSelections.filter((s) => s.status === "upcoming")
  const pastSelections = mockBookClubSelections.filter((s) => s.status === "past")

  const currentBook = currentSelection ? mockBooks.find((b) => b.id === currentSelection.bookId) : null

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-2xl tracking-wider text-primary">KOMET</span>
            </Link>

            <nav className="flex items-center gap-6">
              <Link href="/browse" className="text-sm hover:text-primary transition-colors">
                Browse
              </Link>
              <Link href="/book-club" className="text-sm font-medium text-primary">
                Book Club
              </Link>
              <Link href="/book-club/discussions" className="text-sm hover:text-primary transition-colors">
                Discussions
              </Link>
              <Link href="/book-club/events" className="text-sm hover:text-primary transition-colors">
                Events
              </Link>
              <Link href="/dashboard" className="text-sm hover:text-primary transition-colors">
                My Library
              </Link>
              <Link href="/admin" className="text-sm hover:text-primary transition-colors">
                Admin
              </Link>
              <Button size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(127,255,0,0.1),transparent_50%)]" />

        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 bg-primary/20 text-primary border border-primary/30 px-4 py-2 rounded-full">
              <Crown className="w-4 h-4" />
              <span className="text-sm font-medium">PREMIUM MEMBERSHIP</span>
            </div>

            <h1 className="font-display text-6xl md:text-8xl tracking-wider leading-none text-balance">
              <span className="text-secondary">KOMET</span> <span className="text-primary">BOOK CLUB</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Join thousands of cosmic readers exploring curated selections, exclusive discussions, and unlimited access
              to our entire book club library.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-6xl text-primary">$12</span>
                <span className="text-xl text-muted-foreground">/month</span>
              </div>
            </div>

            {!mockSubscription.isActive ? (
              <Button size="lg" className="text-lg px-10 animate-pulse-glow">
                <Star className="w-5 h-5 mr-2" />
                Subscribe Now
              </Button>
            ) : (
              <div className="inline-flex items-center gap-2 bg-secondary/20 text-secondary border border-secondary/30 px-6 py-3 rounded-lg">
                <Check className="w-5 h-5" />
                <span className="font-medium">Active Member Since {mockSubscription.memberSince}</span>
              </div>
            )}

            <p className="text-sm text-muted-foreground">Cancel anytime. First book free!</p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Current Selection */}
        {currentSelection && currentBook && (
          <section className="mb-16">
            <div className="mb-8">
              <h2 className="font-display text-4xl md:text-5xl tracking-wider mb-2">
                <span className="text-primary">THIS MONTH'S</span> SELECTION
              </h2>
              <p className="text-lg text-muted-foreground">Start reading and join the discussion</p>
            </div>
            <BookClubSelectionCard selection={currentSelection} book={currentBook} />
          </section>
        )}

        {/* Benefits Grid */}
        <section className="mb-16">
          <div className="mb-8 text-center">
            <h2 className="font-display text-4xl md:text-5xl tracking-wider mb-2">
              <span className="text-secondary">MEMBERSHIP</span> BENEFITS
            </h2>
            <p className="text-lg text-muted-foreground">Everything you get as a Komet Book Club member</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookClubBenefits.map((benefit, index) => (
              <Card
                key={index}
                className="p-6 bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg tracking-wide mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="mb-16">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-8 text-center bg-card/50 backdrop-blur border-primary/30">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <p className="font-display text-5xl tracking-wide mb-2">12K+</p>
              <p className="text-muted-foreground">Active Members</p>
            </Card>

            <Card className="p-8 text-center bg-card/50 backdrop-blur border-secondary/30">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-secondary" />
              </div>
              <p className="font-display text-5xl tracking-wide mb-2">150+</p>
              <p className="text-muted-foreground">Books Curated</p>
            </Card>

            <Card className="p-8 text-center bg-card/50 backdrop-blur border-primary/30">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              <p className="font-display text-5xl tracking-wide mb-2">3 Years</p>
              <p className="text-muted-foreground">Running Strong</p>
            </Card>
          </div>
        </section>

        {/* Upcoming Selections */}
        {upcomingSelections.length > 0 && (
          <section className="mb-16">
            <div className="mb-8">
              <h2 className="font-display text-4xl md:text-5xl tracking-wider mb-2">
                <span className="text-secondary">COMING</span> SOON
              </h2>
              <p className="text-lg text-muted-foreground">Get excited for these upcoming selections</p>
            </div>
            <div className="space-y-6">
              {upcomingSelections.map((selection) => {
                const book = mockBooks.find((b) => b.id === selection.bookId)
                return book ? <BookClubSelectionCard key={selection.id} selection={selection} book={book} /> : null
              })}
            </div>
          </section>
        )}

        {/* Past Selections */}
        {pastSelections.length > 0 && (
          <section className="mb-16">
            <div className="mb-8">
              <h2 className="font-display text-4xl md:text-5xl tracking-wider mb-2">
                <span className="text-primary">PAST</span> SELECTIONS
              </h2>
              <p className="text-lg text-muted-foreground">Members have unlimited access to all past picks</p>
            </div>
            <div className="space-y-6">
              {pastSelections.map((selection) => {
                const book = mockBooks.find((b) => b.id === selection.bookId)
                return book ? <BookClubSelectionCard key={selection.id} selection={selection} book={book} /> : null
              })}
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section>
          <Card className="p-12 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30">
            <div className="text-center space-y-6 max-w-3xl mx-auto">
              <h2 className="font-display text-5xl md:text-6xl tracking-wider">
                <span className="text-primary">JOIN THE</span>
                <br />
                <span className="text-secondary">COSMIC COMMUNITY</span>
              </h2>

              <p className="text-xl text-muted-foreground leading-relaxed">
                Start your literary journey across the galaxy today. Cancel anytime, no commitments, just great books
                and amazing discussions.
              </p>

              <div className="flex items-baseline justify-center gap-2 mb-4">
                <span className="font-display text-6xl text-primary">$12</span>
                <span className="text-xl text-muted-foreground">/month</span>
              </div>

              <Button size="lg" className="text-lg px-10">
                <Star className="w-5 h-5 mr-2" />
                Start Your Membership
              </Button>

              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground pt-4">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>First book free</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Cancel anytime</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Instant access</span>
                </div>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}
