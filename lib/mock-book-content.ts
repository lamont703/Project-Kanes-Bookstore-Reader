export interface BookChapter {
  id: string
  title: string
  content: string[]
}

export interface ReadingProgress {
  bookId: string
  currentChapter: number
  currentParagraph: number
  percentage: number
  lastRead: Date
}

export interface Highlight {
  id: string
  bookId: string
  chapterIndex: number
  paragraphIndex: number
  text: string
  color: string
  note?: string
  createdAt: Date
}

export interface Bookmark {
  id: string
  bookId: string
  chapterIndex: number
  paragraphIndex: number
  note?: string
  createdAt: Date
}

export const mockChapters: BookChapter[] = [
  {
    id: "1",
    title: "Chapter 1: The Awakening",
    content: [
      "The stars had always called to her. Even as a child, Zara would spend countless nights on the observation deck of the colony ship, watching the cosmos drift by in an endless tapestry of light and shadow.",
      "Her parents had been among the first to sign up for the Great Migration, leaving Earth behind for the promise of new worlds. She couldn't remember much of the old planet—just fragments of blue skies and the scent of rain. Everything else was metal corridors and recycled air.",
      "Tonight was different. The ship's AI had detected something unusual—a signal, faint but unmistakable, emanating from a nearby nebula. It was the first sign of intelligent life they'd encountered in three years of travel through the void.",
      "Captain Morrison had called an emergency meeting of the senior crew. Zara, despite being only twenty-three, had earned her place among them through her exceptional skill in xenolinguistics. If this signal was a message, she would be the one to decode it.",
      "As she made her way through the dimly lit corridors, her mind raced with possibilities. What kind of civilization could survive in the harsh radiation of a nebula? What would they have to say to a lost ship of human refugees?",
      "The conference room was already buzzing with activity when she arrived. Holographic displays showed the signal's waveform—complex, rhythmic, almost musical. It was nothing like any human language, but there was an unmistakable pattern to it.",
      "Morrison's weathered face looked more tired than usual. The weight of eight thousand souls pressed down on his shoulders daily. 'Dr. Nebula,' he said, using her nickname, 'can you make sense of this?'",
      "Zara stepped forward, her fingers dancing across the holographic interface. The signal responded, shifting and adapting to her inputs. It was alive, intelligent, and it was trying to communicate.",
      "'It's not just a signal,' she breathed. 'It's a greeting. And they've been waiting for us.'",
    ],
  },
  {
    id: "2",
    title: "Chapter 2: First Contact",
    content: [
      "The ship altered course, diving deeper into the nebula's glowing embrace. Outside the viewports, violet and blue clouds swirled in patterns that seemed almost deliberate, as if the nebula itself was alive.",
      "Zara hadn't slept in thirty-six hours. The signal had become her obsession, its patterns weaving through her dreams even in the brief moments she closed her eyes. She'd discovered something remarkable—the message wasn't just a greeting, it was an invitation.",
      "The beings called themselves the Luminari, children of the nebula, born from the energy storms that raged within. They had no physical form as humans understood it, existing as patterns of electromagnetic radiation and thought.",
      "Communication was slow, painstaking. Each exchange took hours as Zara worked to bridge the gap between human language and pure energy. But gradually, a picture emerged of a civilization older than humanity by countless millennia.",
      "The Luminari had watched civilizations rise and fall across the galaxy, never interfering, always observing. But something about humanity had caught their attention—perhaps it was our music, they suggested, or our stories. The way we carried culture across the stars even as refugees.",
    ],
  },
]
