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

export const mockUserStats: UserStats = {
  booksOwned: 4,
  booksRead: 1,
  currentStreak: 7,
  totalReadingTime: 1240,
  favoriteGenre: "Science Fiction",
}
