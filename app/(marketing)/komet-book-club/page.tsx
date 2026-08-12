import type { Metadata } from "next"
import { ContentBlocks } from "@/components/marketing/content-blocks"
import { getMarketingPage } from "@/lib/marketing-content"
import { apexUrl, kometzUrl } from "@/lib/hosts"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
    title: "Komet Book Club | Kane's Komet Bookstore",
    description:
        "Join Kane's Komet Book Club. Members receive a membership tee, a book bundle, a surprise gift, and an automatic Kane Dealer code for 35% off at checkout.",
    alternates: { canonical: apexUrl("/komet-book-club") },
}

export default async function KometBookClubPage() {
    const page = await getMarketingPage("komet-book-club")
    return (
        <div className="container mx-auto max-w-4xl px-4 py-12 md:py-20">
            <ContentBlocks blocks={page.blocks} />

            {/* Joining, paying, and membership all live on the app host. */}
            <div className="mt-12 rounded-xl border border-primary/30 bg-primary/10 p-8 text-center">
                <h2 className="font-display text-3xl uppercase tracking-wider">Ready To Join?</h2>
                <p className="mt-2 text-muted-foreground">
                    Membership, bundles, and checkout all happen in the Komet Book Club.
                </p>
                <Button asChild size="lg" className="mt-6 ">
                    <a href={kometzUrl("/book-club")}>Enter the Book Club</a>
                </Button>
            </div>
        </div>
    )
}
