export interface BookClubSelection {
    id: string
    month: string
    year: number
    bookId: string
    theme: string
    description: string
    discussionDate: Date
    discussionId?: string
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
    category: "General" | "Book Club" | "News" | "Crime" | "Children" | "PTP" | "Spiritual" | "Adult" | "Sports" | "Self-Help" | "Cooking"
    bookId?: string
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
    isPublic?: boolean
}
