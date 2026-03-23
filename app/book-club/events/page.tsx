import { Card } from "@/components/ui/card"
import { Calendar, Clock, MapPin, Users, Video, Globe, Crown } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { RsvpModal } from "./rsvp-modal"
import { createClient } from "@/lib/supabase/server"
import Image from "next/image"
import { isEventPast } from "@/lib/book-club-utils"

export default async function EventsPage() {
  const supabase = await createClient()

  // Fetch events — RLS handles visibility (public events for guests, all for premium)
  const { data: events, error } = await supabase
    .from("book_club_events")
    .select("*")
    .order("date", { ascending: true })

  if (error) console.error("Error fetching events:", error)

  const eventList = events ?? []
  const upcomingEvents = eventList.filter(e => !isEventPast(e.date))
  const pastEvents = eventList.filter(e => isEventPast(e.date))

  // Fetch the current user and their RSVPs (if logged in)
  const { data: { user } } = await supabase.auth.getUser()
  let userRsvpEventIds: Set<string> = new Set()

  if (user) {
    const eventIds = eventList.map(e => e.id)
    if (eventIds.length > 0) {
      const { data: rsvps } = await supabase
        .from("event_rsvps")
        .select("event_id")
        .eq("user_id", user.id)
        .in("event_id", eventIds)
      for (const r of rsvps ?? []) {
        userRsvpEventIds.add(r.event_id)
      }
    }
  }

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
        {upcomingEvents.length > 0 && (
          <section className="mb-12">
            <h2 className="font-display text-3xl tracking-wider mb-6">UPCOMING EVENTS</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {upcomingEvents.map((event) => (
                <Card
                  key={event.id}
                  className="p-0 bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-colors h-full flex flex-col overflow-hidden group"
                >
                  {event.cover_image_url && (
                    <div className="relative w-full h-48 overflow-hidden">
                      <Image 
                        src={event.cover_image_url} 
                        alt={event.title} 
                        fill 
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                  )}
                  <div className="p-6 flex flex-col flex-1">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-medium text-primary">
                        {new Date(event.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                      {event.is_public ? (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-green-400 bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20 flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" /> Public
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5" /> Members Only
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-2xl tracking-wide mt-1">{event.title}</h3>
                  </div>
                  <p className="text-muted-foreground mb-4 text-sm leading-relaxed">{event.description}</p>
                  <div className="space-y-3 text-sm border-t border-border pt-4 mt-auto">
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
                      <span>{event.attendee_count} going</span>
                    </div>
                  </div>
                  <div className="mt-6">
                    <RsvpModal
                      eventId={event.id}
                      eventTitle={event.title}
                      isPublic={event.is_public}
                      currentUser={user}
                      alreadyRsvped={userRsvpEventIds.has(event.id)}
                    />
                  </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <section className="mb-12">
            <h2 className="font-display text-3xl tracking-wider mb-6 text-muted-foreground">PAST EVENTS</h2>
            <div className="grid md:grid-cols-2 gap-6 opacity-70">
              {pastEvents.map((event) => (
                <Card
                  key={event.id}
                  className="p-0 bg-card/30 border-border/50 h-full flex flex-col overflow-hidden"
                >
                  {event.cover_image_url && (
                    <div className="relative w-full h-40 overflow-hidden grayscale opacity-60">
                      <Image 
                        src={event.cover_image_url} 
                        alt={event.title} 
                        fill 
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                  )}
                  <div className="p-6 flex flex-col flex-1">
                  <div className="mb-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      {new Date(event.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                    <h3 className="font-display text-2xl tracking-wide mt-1 text-muted-foreground">{event.title}</h3>
                  </div>
                  <p className="text-muted-foreground/70 mb-4 text-sm leading-relaxed">{event.description}</p>
                  <div className="space-y-2 text-sm border-t border-border/30 pt-4 mt-auto">
                    <div className="flex items-center gap-3 text-muted-foreground/70">
                      <Clock className="w-4 h-4" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground/70">
                      {event.type === "virtual" ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground/70">
                      <Users className="w-4 h-4" />
                      <span>{event.attendee_count} attended</span>
                    </div>
                  </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {eventList.length === 0 && (
          <div className="text-center py-24 text-muted-foreground">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <h3 className="font-display text-3xl tracking-wide uppercase mb-2">Clear Galactic Skies</h3>
            <p className="max-w-sm mx-auto">No events scheduled yet. Check back soon for upcoming Komet meetups.</p>
          </div>
        )}
      </div>
    </div>
  )
}
