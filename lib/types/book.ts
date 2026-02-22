export type BookFormat = "ebook" | "paper_book" | "komet_card"

export interface Book {
    id: string
    title: string
    author: string
    illustrator?: string
    coverImage: string
    price: number // Default price (usually ebook)
    genre: string
    description: string
    variants: {
        id?: string   // book_variants.id (UUID from Supabase)
        format: BookFormat
        price: number
        available: boolean
    }[]
}

export const GENRES = [
    "All",
    "Crime",
    "Children",
    "PTP",
    "Spiritual",
    "Adult",
    "Sports",
    "Self-Help",
    "Cooking",
]
