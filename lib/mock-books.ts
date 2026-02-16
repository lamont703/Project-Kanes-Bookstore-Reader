export type BookFormat = "ebook" | "paper_book" | "komet_card"

export interface Book {
  id: string
  title: string
  author: string
  coverImage: string
  price: number // Default price (usually ebook)
  genre: string
  description: string
  variants: {
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

export const mockBooks: Book[] = [
  {
    id: "1",
    title: "Brute Syndicate",
    author: "Caleb V. Kaine",
    coverImage: "/Brute Syndicate 1 Cover.webp",
    price: 14.99,
    genre: "Science Fiction",
    description:
      "In a world ruled by corporate syndicates, one brute fights for the little guy. A hard-hitting, neon-soaked adventure.",
    variants: [
      { format: "ebook", price: 14.99, available: true },
      { format: "paper_book", price: 29.99, available: true },
      { format: "komet_card", price: 9.99, available: true },
    ],
  },
  {
    id: "2",
    title: "The Void Between",
    author: "Marcus Stone",
    coverImage: "/dark-mystery-book-cover.jpg",
    price: 12.99,
    genre: "Mystery",
    description: "A gripping tale of murder and intrigue set in the depths of space, where no one can hear you scream.",
    variants: [
      { format: "ebook", price: 12.99, available: true },
      { format: "paper_book", price: 24.99, available: true },
      { format: "komet_card", price: 9.99, available: true },
    ],
  },
  {
    id: "3",
    title: "Flying With The Chrysiridiarhipheus",
    author: "Caleb V. Kaine",
    coverImage: "/Flying With The Chrysiridiarhipheus 1 Cover.webp",
    price: 15.99,
    genre: "Fantasy",
    description:
      "A young pilot bonds with a legendary Chrysiridiarhipheus to save their floating world from plummeting into the abyss.",
    variants: [
      { format: "ebook", price: 15.99, available: true },
      { format: "paper_book", price: 34.99, available: true },
      { format: "komet_card", price: 12.99, available: true },
    ],
  },
  {
    id: "4",
    title: "Somes 3",
    author: "Caleb V. Kaine",
    coverImage: "/Somes 3 Cover.webp",
    price: 18.99,
    genre: "Science Fiction",
    description:
      "The thrilling conclusion to the Somes trilogy. Boundaries dissolve as the syndicate faces its final, most devastating threat.",
    variants: [
      { format: "ebook", price: 18.99, available: true },
      { format: "paper_book", price: 39.99, available: true },
      { format: "komet_card", price: 14.99, available: true },
    ],
  },
  {
    id: "5",
    title: "Nebula Nightmares",
    author: "Raven Dark",
    coverImage: "/horror-thriller-book-cover.jpg",
    price: 11.99,
    genre: "Horror",
    description: "Terror lurks in the nebula's shadows as a crew discovers they're not alone in the cosmic void.",
    variants: [
      { format: "ebook", price: 11.99, available: true },
      { format: "paper_book", price: 21.99, available: true },
      { format: "komet_card", price: 8.99, available: true },
    ],
  },
  {
    id: "6",
    title: "The Quantum Thief",
    author: "Alex Quantum",
    coverImage: "/thriller-heist-book-cover.jpg",
    price: 15.99,
    genre: "Thriller",
    description: "A high-stakes heist across multiple dimensions where reality itself is the ultimate prize.",
    variants: [
      { format: "ebook", price: 15.99, available: true },
      { format: "paper_book", price: 32.99, available: true },
      { format: "komet_card", price: 12.99, available: true },
    ],
  },
  {
    id: "7",
    title: "Realm of Infinite Skies",
    author: "Aria Windwalker",
    coverImage: "/epic-fantasy-book-cover.jpg",
    price: 16.99,
    genre: "Fantasy",
    description: "An epic fantasy saga where magic and technology collide in a world suspended between dimensions.",
    variants: [
      { format: "ebook", price: 16.99, available: true },
      { format: "paper_book", price: 36.99, available: true },
      { format: "komet_card", price: 15.99, available: true },
    ],
  },
  {
    id: "8",
    title: "Echoes of Mars",
    author: "Commander Sarah Chen",
    coverImage: "/mars-biography-book-cover.jpg",
    price: 17.99,
    genre: "Biography",
    description: "The incredible true story of humanity's first Mars colony and the pioneers who made it possible.",
    variants: [
      { format: "ebook", price: 17.99, available: true },
      { format: "paper_book", price: 38.99, available: true },
      { format: "komet_card", price: 16.99, available: true },
    ],
  },
]
