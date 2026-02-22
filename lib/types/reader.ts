export interface BookPage {
    id: string
    pageNumber: number
    pageImageUrl: string    // URL to rendered page image (preserves PDF layout)
    content?: string         // Extracted text for search indexing only
}

export interface ReadingProgress {
    bookId: string
    currentPage: number
    percentage: number
    lastRead: Date
}

export interface Highlight {
    id: string
    bookId: string
    pageNumber: number
    paragraphIndex: number
    text: string
    color: string
    note?: string
    createdAt: Date
}

export interface Bookmark {
    id: string
    bookId: string
    pageNumber: number
    label?: string
    createdAt: Date
}
