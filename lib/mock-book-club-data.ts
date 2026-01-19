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

export const mockBookClubSelections: BookClubSelection[] = [
  {
    id: "1",
    month: "January",
    year: 2025,
    bookId: "1",
    theme: "Space Exploration",
    description:
      "Start the new year with an epic journey through the cosmos. This month's selection explores themes of discovery, adventure, and the human spirit's quest to explore the unknown.",
    discussionDate: new Date("2025-01-28"),
    status: "current",
  },
  {
    id: "2",
    month: "February",
    year: 2025,
    bookId: "3",
    theme: "Love Across Galaxies",
    description:
      "February brings us a heartwarming tale of connection and romance that transcends space and time. Perfect for Valentine's season.",
    discussionDate: new Date("2025-02-25"),
    status: "upcoming",
  },
  {
    id: "3",
    month: "December",
    year: 2024,
    bookId: "4",
    theme: "Science & Wonder",
    description:
      "We explored the mysteries of the universe through the lens of cutting-edge science and accessible storytelling.",
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
    title: "1 Curated Book Monthly",
    description: "Receive a carefully selected book delivered to your digital library on the 1st of each month.",
  },
  {
    title: "Access to All Past Selections",
    description: "Read any book from our entire book club history at no additional cost.",
  },
  {
    title: "Exclusive Author Q&As",
    description: "Join live discussions with authors and connect with fellow readers in our community.",
  },
  {
    title: "Member-Only Discounts",
    description: "Get 20% off all additional book purchases from our cosmic library.",
  },
  {
    title: "Early Access to New Releases",
    description: "Be the first to read upcoming releases before they hit the general market.",
  },
  {
    title: "Cancel Anytime",
    description: "No commitment required. Cancel your subscription whenever you want, no questions asked.",
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

export const mockEvents = [
  {
    id: 1,
    title: "Live Q&A with 'Cosmic Drift' Author",
    date: "February 15, 2025",
    time: "7:00 PM EST",
    type: "virtual",
    location: "Zoom",
    description: "Join us for an exclusive live Q&A session with the author of our current book club selection, 'Cosmic Drift'.",
    attendees: 128,
    status: "upcoming",
  },
  {
    id: 2,
    title: "Sci-Fi Writing Workshop",
    date: "March 5, 2025",
    time: "2:00 PM EST",
    type: "virtual",
    location: "Google Meet",
    description: "Hone your world-building and character development skills in this interactive workshop for aspiring sci-fi writers.",
    attendees: 45,
    status: "upcoming",
  },
  {
    id: 3,
    title: "December Book Club Wrap-up",
    date: "December 28, 2024",
    time: "8:00 PM EST",
    type: "virtual",
    location: "Zoom",
    description: "A casual chat to discuss our thoughts on the December book selection and celebrate a year of reading.",
    attendees: 76,
    status: "past",
  },
]
