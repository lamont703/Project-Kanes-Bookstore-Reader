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

// Mock page data — placeholder images representing rendered PDF pages
export const mockPages: BookPage[] = [
  {
    id: "page-1",
    pageNumber: 1,
    pageImageUrl: "/mock-pages/page-1.svg",
    content: "The stars had always called to her. Even as a child, Zara would spend countless nights on the observation deck of the colony ship, watching the cosmos drift by in an endless tapestry of light and shadow. Her parents had been among the first to sign up for the Great Migration, leaving Earth behind for the promise of new worlds.",
  },
  {
    id: "page-2",
    pageNumber: 2,
    pageImageUrl: "/mock-pages/page-2.svg",
    content: "Tonight was different. The ship's AI had detected something unusual—a signal, faint but unmistakable, emanating from a nearby nebula. It was the first sign of intelligent life they'd encountered in three years of travel through the void. Captain Morrison had called an emergency meeting of the senior crew.",
  },
  {
    id: "page-3",
    pageNumber: 3,
    pageImageUrl: "/mock-pages/page-3.svg",
    content: "As she made her way through the dimly lit corridors, her mind raced with possibilities. What kind of civilization could survive in the harsh radiation of a nebula? The conference room was already buzzing with activity when she arrived. Holographic displays showed the signal's waveform—complex, rhythmic, almost musical.",
  },
  {
    id: "page-4",
    pageNumber: 4,
    pageImageUrl: "/mock-pages/page-4.svg",
    content: "Morrison's weathered face looked more tired than usual. The weight of eight thousand souls pressed down on his shoulders daily. 'Dr. Nebula,' he said, using her nickname, 'can you make sense of this?' Zara stepped forward, her fingers dancing across the holographic interface.",
  },
  {
    id: "page-5",
    pageNumber: 5,
    pageImageUrl: "/mock-pages/page-5.svg",
    content: "'It's not just a signal,' she breathed. 'It's a greeting. And they've been waiting for us.' The room fell silent. For the first time in three years, there was something more than empty space ahead of them.",
  },
  {
    id: "page-6",
    pageNumber: 6,
    pageImageUrl: "/mock-pages/page-6.svg",
    content: "The ship altered course, diving deeper into the nebula's glowing embrace. Outside the viewports, violet and blue clouds swirled in patterns that seemed almost deliberate, as if the nebula itself was alive. Zara hadn't slept in thirty-six hours.",
  },
  {
    id: "page-7",
    pageNumber: 7,
    pageImageUrl: "/mock-pages/page-7.svg",
    content: "The beings called themselves the Luminari, children of the nebula, born from the energy storms that raged within. They had no physical form as humans understood it, existing as patterns of electromagnetic radiation and thought.",
  },
  {
    id: "page-8",
    pageNumber: 8,
    pageImageUrl: "/mock-pages/page-8.svg",
    content: "Communication was slow, painstaking. Each exchange took hours as Zara worked to bridge the gap between human language and pure energy. But gradually, a picture emerged of a civilization older than humanity by countless millennia.",
  },
  {
    id: "page-9",
    pageNumber: 9,
    pageImageUrl: "/mock-pages/page-9.svg",
    content: "The Luminari had watched civilizations rise and fall across the galaxy, never interfering, always observing. But something about humanity had caught their attention—perhaps it was our music, they suggested, or our stories.",
  },
  {
    id: "page-10",
    pageNumber: 10,
    pageImageUrl: "/mock-pages/page-10.svg",
    content: "The way we carried culture across the stars even as refugees. They saw in humanity not just survivors, but storytellers—and that, they said, was the rarest thing in the universe.",
  },
]
