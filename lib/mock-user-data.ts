export interface UserLibraryBook {
  bookId: string
  purchaseDate: Date
  lastRead?: Date
  progress: number
  status: "not-started" | "reading" | "finished"
}

export interface UserStats {
  booksOwned: number
  booksRead: number
  currentStreak: number
  totalReadingTime: number // in minutes
  favoriteGenre: string
}

// Mock user library
export const mockUserLibrary: UserLibraryBook[] = [
  {
    bookId: "1",
    purchaseDate: new Date("2024-12-01"),
    lastRead: new Date("2024-12-18"),
    progress: 45,
    status: "reading",
  },
  {
    bookId: "3",
    purchaseDate: new Date("2024-11-15"),
    lastRead: new Date("2024-12-10"),
    progress: 100,
    status: "finished",
  },
  {
    bookId: "6",
    purchaseDate: new Date("2024-12-05"),
    lastRead: new Date("2024-12-15"),
    progress: 23,
    status: "reading",
  },
  {
    bookId: "7",
    purchaseDate: new Date("2024-10-20"),
    progress: 0,
    status: "not-started",
  },
]

export interface UserOrder {
  id: string
  date: Date
  total: number
  status: "delivered" | "shipped" | "processing"
  items: {
    title: string
    quantity: number
    price: number
  }[]
}

export const mockUserStats: UserStats = {
  booksOwned: 4,
  booksRead: 1,
  currentStreak: 7,
  totalReadingTime: 1240,
  favoriteGenre: "Science Fiction",
}

export const mockOrders: UserOrder[] = [
  {
    id: "ORD-7742",
    date: new Date("2025-01-15"),
    total: 42.97,
    status: "delivered",
    items: [
      { title: "Somes 3", quantity: 1, price: 14.99 },
      { title: "Brute Syndicate 1", quantity: 2, price: 13.99 },
    ]
  },
  {
    id: "ORD-9921",
    date: new Date("2024-12-10"),
    total: 19.99,
    status: "delivered",
    items: [
      { title: "Flying With The Chrysiridiarhipheus 1", quantity: 1, price: 19.99 },
    ]
  },
  {
    id: "ORD-2031",
    date: new Date("2025-02-01"),
    total: 29.98,
    status: "processing",
    items: [
      { title: "The Cosmic Drift", quantity: 2, price: 14.99 }
    ]
  }
]

