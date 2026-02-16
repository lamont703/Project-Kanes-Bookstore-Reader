"use client"

import { useState } from "react"
import { Book, BookFormat } from "@/lib/mock-books"
import { AddToCartButton } from "@/components/add-to-cart-button"
import { Tablet, Book as BookIcon, CreditCard } from "lucide-react"

interface BookPurchaseSectionProps {
    book: Book
}

export function BookPurchaseSection({ book }: BookPurchaseSectionProps) {
    const [selectedFormat, setSelectedFormat] = useState<BookFormat>("ebook")

    const currentVariant = book.variants.find((v) => v.format === selectedFormat) || book.variants[0]

    return (
        <div className="border-t border-border pt-6">
            <div className="mb-6">
                <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
                    Select Format
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {book.variants.map((v) => (
                        <button
                            key={v.format}
                            onClick={() => setSelectedFormat(v.format)}
                            disabled={!v.available}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${selectedFormat === v.format
                                    ? "border-secondary bg-secondary/5 shadow-[0_0_15px_rgba(var(--secondary),0.1)]"
                                    : "border-border bg-card/30 hover:border-primary/50"
                                } ${!v.available ? "opacity-40 cursor-not-allowed" : ""}`}
                        >
                            <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedFormat === v.format ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                                    }`}
                            >
                                {v.format === "ebook" && <Tablet className="w-5 h-5" />}
                                {v.format === "paper_book" && <BookIcon className="w-5 h-5" />}
                                {v.format === "komet_card" && <CreditCard className="w-5 h-5" />}
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-sm uppercase tracking-tight">
                                    {v.format === "ebook" ? "E-Book" : v.format === "paper_book" ? "Paper Book" : "Komet Card"}
                                </div>
                                <div className="text-lg font-display text-secondary">${v.price}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-baseline gap-2 mb-6">
                <span className="font-display text-5xl text-secondary">${currentVariant.price}</span>
                <span className="text-muted-foreground">
                    {selectedFormat === "ebook" ? "Instant Digital Access" : "Physical Item (Shipped)"}
                </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <AddToCartButton
                    book={{
                        id: book.id,
                        title: book.title,
                        price: currentVariant.price,
                        coverImage: book.coverImage || "/placeholder.svg",
                        format: selectedFormat,
                    }}
                    disabled={!currentVariant.available}
                />
            </div>
        </div>
    )
}
