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
