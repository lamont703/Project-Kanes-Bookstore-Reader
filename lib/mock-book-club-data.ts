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
