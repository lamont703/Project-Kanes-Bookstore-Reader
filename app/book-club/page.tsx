"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BookClubSelectionCard } from "@/components/book-club-selection-card"
import { mockBooks } from "@/lib/mock-books"
import { mockBookClubSelections, mockSubscription, bookClubBenefits } from "@/lib/mock-book-club-data"
import { Star, Check, Crown } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { SiteHeader } from "@/components/site-header"
import { SubscriptionModal } from "@/components/subscription-modal"

const bundleBooks = [
  { id: "b1", title: "Somes 3", cover: "/Somes 3 Cover.webp" },
  { id: "b2", title: "Somes 1", cover: "/Somes 1 Cover.webp" },
  { id: "b3", title: "Flying With The Chrysiridiarhipheus 1", cover: "/Flying With The Chrysiridiarhipheus 1 Cover.webp" },
  { id: "b4", title: "Brute Syndicate 5", cover: "/Brute Syndicate 5 Cover.webp" },
  { id: "b5", title: "Brute Syndicate 1", cover: "/Brute Syndicate 1 Cover.webp" },
]

export default function BookClubPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMember, setIsMember] = useState(mockSubscription.isActive)

  useEffect(() => {
    const localMember = localStorage.getItem("komet_subscription_active")
    if (localMember === "true") {
      setIsMember(true)
    }
  }, [])

  const currentSelection = mockBookClubSelections.find((s) => s.status === "current")
  const upcomingSelections = mockBookClubSelections.filter((s) => s.status === "upcoming")
  const pastSelections = mockBookClubSelections.filter((s) => s.status === "past")

  const currentBook = currentSelection ? mockBooks.find((b) => b.id === currentSelection.bookId) : null

  return (
    <div className="min-h-screen">
      {/* Header */}
      <SiteHeader />

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
              Join thousands of Komet readers exploring curated selections, exclusive discussions, and unlimited access
              to our entire book club library.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-6xl text-primary">$12</span>
                <span className="text-xl text-muted-foreground">/month</span>
              </div>
            </div>

            {!isMember ? (
              <Button size="lg" className="text-lg px-10 animate-pulse-glow" onClick={() => setIsModalOpen(true)}>
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


        {/* Collection Display */}
        <section className="mb-16">
          <div className="mb-8 text-center">
            <h2 className="font-display text-4xl md:text-5xl tracking-wider mb-2">
              <span className="text-secondary">THE</span> COLLECTION
            </h2>
            <p className="text-lg text-muted-foreground">Select any 2 from these exclusive titles to start your journey</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {bundleBooks.map((book) => (
              <div key={book.id} className="group relative">
                <div className="aspect-[2/3] relative rounded-lg overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-primary/20 bg-secondary/10">
                  <Image
                    src={book.cover}
                    alt={book.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <p className="text-white text-xs font-bold text-center w-full">{book.title}</p>
                  </div>
                </div>
              </div>
            ))}
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
        {/* Final CTA - Hide if member */}
        {!isMember && (
          <section>
            <Card className="p-12 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30">
              <div className="text-center space-y-6 max-w-3xl mx-auto">
                <h2 className="font-display text-5xl md:text-6xl tracking-wider">
                  <span className="text-primary">JOIN THE</span>
                  <br />
                  <span className="text-secondary">KOMET COMMUNITY</span>
                </h2>

                <p className="text-xl text-muted-foreground leading-relaxed">
                  Start your literary journey across the galaxy today. Cancel anytime, no commitments, just great books
                  and amazing discussions.
                </p>

                <div className="flex items-baseline justify-center gap-2 mb-4">
                  <span className="font-display text-6xl text-primary">$12</span>
                  <span className="text-xl text-muted-foreground">/month</span>
                </div>

                <Button size="lg" className="text-lg px-10" onClick={() => setIsModalOpen(true)}>
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
        )}
      </div>
      <SubscriptionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
