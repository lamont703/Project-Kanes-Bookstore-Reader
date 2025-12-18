"use client"

import type { Highlight, Bookmark, ReadingProgress } from "./mock-book-content"

const STORAGE_KEYS = {
  HIGHLIGHTS: "komet-highlights",
  BOOKMARKS: "komet-bookmarks",
  PROGRESS: "komet-progress",
  SETTINGS: "komet-reading-settings",
}

export interface ReadingSettings {
  fontSize: number
  fontFamily: string
  lineHeight: number
  theme: "light" | "dark" | "sepia"
  textAlign: "left" | "justify"
}

export const defaultSettings: ReadingSettings = {
  fontSize: 18,
  fontFamily: "serif",
  lineHeight: 1.8,
  theme: "dark",
  textAlign: "justify",
}

// Highlights
export function saveHighlight(highlight: Highlight) {
  const highlights = getHighlights()
  highlights.push(highlight)
  localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(highlights))
}

export function getHighlights(bookId?: string): Highlight[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(STORAGE_KEYS.HIGHLIGHTS)
  const highlights = stored ? JSON.parse(stored) : []
  return bookId ? highlights.filter((h: Highlight) => h.bookId === bookId) : highlights
}

export function deleteHighlight(id: string) {
  const highlights = getHighlights().filter((h) => h.id !== id)
  localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(highlights))
}

// Bookmarks
export function saveBookmark(bookmark: Bookmark) {
  const bookmarks = getBookmarks()
  bookmarks.push(bookmark)
  localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks))
}

export function getBookmarks(bookId?: string): Bookmark[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(STORAGE_KEYS.BOOKMARKS)
  const bookmarks = stored ? JSON.parse(stored) : []
  return bookId ? bookmarks.filter((b: Bookmark) => b.bookId === bookId) : bookmarks
}

export function deleteBookmark(id: string) {
  const bookmarks = getBookmarks().filter((b) => b.id !== id)
  localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks))
}

// Reading Progress
export function saveProgress(progress: ReadingProgress) {
  const allProgress = getAllProgress()
  const index = allProgress.findIndex((p) => p.bookId === progress.bookId)
  if (index >= 0) {
    allProgress[index] = progress
  } else {
    allProgress.push(progress)
  }
  localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(allProgress))
}

export function getProgress(bookId: string): ReadingProgress | null {
  if (typeof window === "undefined") return null
  const allProgress = getAllProgress()
  return allProgress.find((p) => p.bookId === bookId) || null
}

export function getAllProgress(): ReadingProgress[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(STORAGE_KEYS.PROGRESS)
  return stored ? JSON.parse(stored) : []
}

// Reading Settings
export function saveSettings(settings: ReadingSettings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
}

export function getSettings(): ReadingSettings {
  if (typeof window === "undefined") return defaultSettings
  const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS)
  return stored ? JSON.parse(stored) : defaultSettings
}
