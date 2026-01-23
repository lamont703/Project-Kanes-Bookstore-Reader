import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { mockEvents } from "@/lib/mock-book-club-data"
import { Calendar, Clock, MapPin, Users, Check, Video } from "lucide-react"
import { SiteHeader } from "@/components/site-header"

export default function EventsPage() {
  const upcomingEvents = mockEvents.filter((e) => e.status === "upcoming")
  const pastEvents = mockEvents.filter((e) => e.status === "past")

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-5xl md:text-6xl tracking-wider mb-2">
            <span className="text-primary">KOMET</span> <span className="text-secondary">MEETUPS</span>
          </h1>
          <p className="text-lg text-muted-foreground">Connect with the community at our virtual and physical events</p>
        </div>

        {/* Upcoming Events */}
        <section className="mb-12">
          <h2 className="font-display text-3xl tracking-wider mb-6">UPCOMING EVENTS</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {upcomingEvents.map((event) => (
              <Card
                key={event.id}
                className="p-6 bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-colors"
              >
                <div className="mb-4">
                  <p className="text-sm font-medium text-primary">
                    {event.date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                  <h3 className="font-display text-2xl tracking-wide mt-1">{event.title}</h3>
                </div>
                <p className="text-muted-foreground mb-4 text-sm leading-relaxed">{event.description}</p>
                <div className="space-y-3 text-sm border-t border-border pt-4">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Clock className="w-4 h-4 text-secondary" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    {event.type === "virtual" ? (
                      <Video className="w-4 h-4 text-secondary" />
                    ) : (
                      <MapPin className="w-4 h-4 text-secondary" />
                    )}
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Users className="w-4 h-4 text-secondary" />
                    <span>{event.attendees} going</span>
                  </div>
                </div>
                <div className="mt-6">
                  <Button className="w-full">
                    <Check className="w-4 h-4 mr-2" />
                    RSVP Now
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Past Events */}
        <section>
          <h2 className="font-display text-3xl tracking-wider mb-6">PAST EVENTS</h2>
          <div className="space-y-4">
            {pastEvents.map((event) => (
              <Card
                key={event.id}
                className="p-4 bg-card/50 backdrop-blur border-border flex flex-col sm:flex-row items-center justify-between"
              >
                <div>
                  <p className="text-sm text-muted-foreground">
                    {event.date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                  <h3 className="font-display text-xl tracking-wide mt-1">{event.title}</h3>
                </div>
                <Button variant="outline" className="mt-4 sm:mt-0 bg-transparent">
                  View Recording
                </Button>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
