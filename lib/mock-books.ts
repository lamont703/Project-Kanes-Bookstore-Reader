export interface Book {
  id: string
  title: string
  author: string
  coverImage: string
  price: number
  genre: string
  description: string
  rating: number
  pageCount: number
  publishedYear: number
  isbn: string
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
    title: "Cosmic Wanderers",
    author: "Zara Nebula",
    coverImage: "/cosmic-sci-fi-book-cover.jpg",
    price: 14.99,
    genre: "Science Fiction",
    description:
      "Journey through the cosmos with a band of intergalactic explorers as they uncover ancient secrets hidden among the stars.",
    rating: 4.7,
    pageCount: 412,
    publishedYear: 2024,
    isbn: "978-0-123456-78-9",
  },
  {
    id: "2",
    title: "The Void Between",
    author: "Marcus Stone",
    coverImage: "/dark-mystery-book-cover.jpg",
    price: 12.99,
    genre: "Mystery",
    description: "A gripping tale of murder and intrigue set in the depths of space, where no one can hear you scream.",
    rating: 4.5,
    pageCount: 356,
    publishedYear: 2023,
    isbn: "978-0-123456-78-8",
  },
  {
    id: "3",
    title: "Stellar Dreams",
    author: "Luna Silver",
    coverImage: "/romantic-fantasy-book-cover.jpg",
    price: 13.99,
    genre: "Romance",
    description:
      "Love blooms across galaxies in this heartwarming story of two souls destined to meet among the stars.",
    rating: 4.8,
    pageCount: 384,
    publishedYear: 2024,
    isbn: "978-0-123456-78-7",
  },
  {
    id: "4",
    title: "Dark Matter Chronicles",
    author: "Dr. Elena Voss",
    coverImage: "/science-non-fiction-book-cover.jpg",
    price: 18.99,
    genre: "Non-Fiction",
    description:
      "An accessible exploration of the universe's greatest mysteries, from black holes to the nature of reality itself.",
    rating: 4.6,
    pageCount: 502,
    publishedYear: 2023,
    isbn: "978-0-123456-78-6",
  },
  {
    id: "5",
    title: "Nebula Nightmares",
    author: "Raven Dark",
    coverImage: "/horror-thriller-book-cover.jpg",
    price: 11.99,
    genre: "Horror",
    description: "Terror lurks in the nebula's shadows as a crew discovers they're not alone in the cosmic void.",
    rating: 4.4,
    pageCount: 298,
    publishedYear: 2024,
    isbn: "978-0-123456-78-5",
  },
  {
    id: "6",
    title: "The Quantum Thief",
    author: "Alex Quantum",
    coverImage: "/thriller-heist-book-cover.jpg",
    price: 15.99,
    genre: "Thriller",
    description: "A high-stakes heist across multiple dimensions where reality itself is the ultimate prize.",
    rating: 4.9,
    pageCount: 445,
    publishedYear: 2024,
    isbn: "978-0-123456-78-4",
  },
  {
    id: "7",
    title: "Realm of Infinite Skies",
    author: "Aria Windwalker",
    coverImage: "/epic-fantasy-book-cover.jpg",
    price: 16.99,
    genre: "Fantasy",
    description: "An epic fantasy saga where magic and technology collide in a world suspended between dimensions.",
    rating: 4.7,
    pageCount: 628,
    publishedYear: 2023,
    isbn: "978-0-123456-78-3",
  },
  {
    id: "8",
    title: "Echoes of Mars",
    author: "Commander Sarah Chen",
    coverImage: "/mars-biography-book-cover.jpg",
    price: 17.99,
    genre: "Biography",
    description: "The incredible true story of humanity's first Mars colony and the pioneers who made it possible.",
    rating: 4.8,
    pageCount: 512,
    publishedYear: 2024,
    isbn: "978-0-123456-78-2",
  },
]
