export interface BookClubSelection {
  id: string
  month: string
  year: number
  bookId: string
  theme: string
  description: string
  discussionDate: Date
  status: "upcoming" | "current" | "past"
}

export interface BookClubSubscription {
  isActive: boolean
  startDate: Date
  nextBillingDate: Date
  memberSince: string
  booksReceived: number
}

export interface DiscussionTopic {
  id: string
  title: string
  description: string
  category: "General" | "Book Club" | "Sci-Fi" | "Fantasy" | "News"
  bookId?: string // Link to a specific cosmic volume
  isPinned: boolean
  isFeatured: boolean
  postCount: number
  memberCount: number
  lastActivity: Date
  createdAt: Date
}

export interface BookClubEvent {
  id: string
  title: string
  description: string
  date: Date
  time: string
  location: string
  type: "virtual" | "in-person"
  coverImage?: string
  attendees: number
  status: "upcoming" | "past"
}

export const mockBookClubSelections: BookClubSelection[] = [
  {
    id: "1",
    month: "January",
    year: 2025,
    bookId: "1",
    theme: "Underground Resistance",
    description:
      "Dive into the gritty underbelly of a dystopian future. This month we explore themes of resistance, identity, and the cost of freedom in 'Brute Syndicate'.",
    discussionDate: new Date("2025-01-28"),
    status: "current",
  },
  {
    id: "2",
    month: "February",
    year: 2025,
    bookId: "3",
    theme: "Skies of Legend",
    description:
      "Prepare for flight! Next month we soar through the clouds with a tale of mythical bonds and aerial adventure.",
    discussionDate: new Date("2025-02-25"),
    status: "upcoming",
  },
  {
    id: "3",
    month: "December",
    year: 2024,
    bookId: "4",
    theme: "Syndicate Wars",
    description:
      "We wrapped up the year with the explosive finale of the Somes trilogy. A discussion on power, corruption, and redemption.",
    discussionDate: new Date("2024-12-20"),
    status: "past",
  },
]

export const mockSubscription: BookClubSubscription = {
  isActive: false,
  startDate: new Date("2024-01-01"),
  nextBillingDate: new Date("2025-01-01"),
  memberSince: "January 2024",
  booksReceived: 12,
}

export const bookClubBenefits = [
  {
    title: "Official Komet T-Shirt",
    description: "Receive an exclusive Kane's Komet Book Club Membership T-Shirt as part of your welcome package.",
  },
  {
    title: "2 Free E-Books",
    description: "Select any 2 titles from the Komet Book Club Collection to instantly kickstart your digital library.",
  },
  {
    title: "Surprise Gift Item",
    description: "Unbox a mystery item like a bookmark, wristband, or tile piece in your initial membership kit.",
  },
  {
    title: "Kane Dealer Code (35% OFF)",
    description: "Get a special code that grants you 35% off all future purchases when used at checkout.",
  },
  {
    title: "$3.99/mo E-Book Access",
    description: "Enjoy ongoing access to 1 E-Komet Book per month for just $3.99/month. Cancel anytime.",
  },
  {
    title: "Community Access",
    description: "Join exclusive book club discussions and member-only events with authors and fellow readers.",
  },
]

export const mockDiscussions = [
  {
    id: "1",
    title: "The ending of 'Cosmic Drift' was mind-blowing!",
    author: { name: "AstroReader" },
    category: "Current Selection",
    stats: {
      replies: 12,
      likes: 34,
      views: 1200,
    },
    lastReply: {
      author: "GalaxyExplorer",
      time: "2h ago",
    },
  },
  {
    id: "2",
    title: "Who is your favorite character in 'Mars Biography'?",
    author: { name: "RocketMan" },
    category: "Past Selections",
    stats: {
      replies: 5,
      likes: 18,
      views: 800,
    },
    lastReply: {
      author: "StarHopper",
      time: "1d ago",
    },
  },
]

export const mockDiscussionTopics: DiscussionTopic[] = [
  {
    id: "topic-1",
    title: "Official: 'Cosmic Drift' Discussion",
    description: "The primary forge for all deep-dives into our January selection. Share your theories, favorite quotes, and ending reactions.",
    category: "Book Club",
    bookId: "1",
    isPinned: true,
    isFeatured: true,
    postCount: 154,
    memberCount: 840,
    lastActivity: new Date("2025-01-18T20:30:00"),
    createdAt: new Date("2025-01-01T10:00:00"),
  },
  {
    id: "topic-2",
    title: "The Great Filter: News & Updates",
    description: "Stay updated with the latest transmissions from Komet HQ. New features, server updates, and galactic announcements.",
    category: "News",
    isPinned: true,
    isFeatured: false,
    postCount: 42,
    memberCount: 1200,
    lastActivity: new Date("2025-01-15T14:20:00"),
    createdAt: new Date("2024-11-20T09:00:00"),
  },
  {
    id: "topic-3",
    title: "Quantum Mechanics in Hard Sci-Fi",
    description: "A specialized room for discussing the scientific accuracy of quantum tropes in our favorite volumes.",
    category: "Sci-Fi",
    isPinned: false,
    isFeatured: true,
    postCount: 89,
    memberCount: 320,
    lastActivity: new Date("2025-01-17T11:45:00"),
    createdAt: new Date("2024-12-15T15:30:00"),
  },
  {
    id: "topic-4",
    title: "Member Introductions",
    description: "New to the sector? Broadcast your arrival here and tell us about your favorite star systems and genres.",
    category: "General",
    isPinned: false,
    isFeatured: false,
    postCount: 560,
    memberCount: 2100,
    lastActivity: new Date("2025-01-18T18:00:00"),
    createdAt: new Date("2024-01-01T00:00:00"),
  },
]

export const mockEvents: BookClubEvent[] = [
  {
    id: "event-1",
    title: "Live Q&A with 'Cosmic Drift' Author",
    date: new Date("2025-02-15"),
    time: "7:00 PM EST",
    type: "virtual",
    location: "https://zoom.us/j/cosmic-drift",
    description: "Join us for an exclusive live Q&A session with the author of our current book club selection, 'Cosmic Drift'. We will explore the inspirations behind the Void Walkers and the scientific theories that shaped the ending.",
    coverImage: "/cosmic-sci-fi-book-cover.jpg",
    attendees: 128,
    status: "upcoming",
  },
  {
    id: "event-2",
    title: "Sci-Fi Writing Workshop: World Building",
    date: new Date("2025-03-05"),
    time: "2:00 PM EST",
    type: "virtual",
    location: "https://meet.google.com/sci-fi-workshop",
    description: "Hone your world-building and character development skills in this interactive workshop for aspiring sci-fi writers. Learn how to create believable alien ecosystems and complex space-faring societies.",
    coverImage: "/thriller-heist-book-cover.jpg",
    attendees: 45,
    status: "upcoming",
  },
  {
    id: "event-3",
    title: "December Book Club Wrap-up",
    date: new Date("2024-12-28"),
    time: "8:00 PM EST",
    type: "virtual",
    location: "https://zoom.us/j/wrap-up-2024",
    description: "A casual chat to discuss our thoughts on the December book selection and celebrate a year of reading across the stars. We'll also preview the 2025 reading list.",
    coverImage: "/dark-mystery-book-cover.jpg",
    attendees: 76,
    status: "past",
  },
  {
    id: "event-4",
    title: "Cosmic Librarian Meetup",
    date: new Date("2025-01-25"),
    time: "6:00 PM EST",
    type: "in-person",
    location: "Komet HQ Central Hub",
    description: "Local readers gather for a night of physical book swapping and synth-wave music. Bring your favorites to share!",
    coverImage: "/romantic-fantasy-book-cover.jpg",
    attendees: 32,
    status: "upcoming",
  },
]
