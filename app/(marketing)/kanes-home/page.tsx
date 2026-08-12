import type { Metadata } from "next"

import { HomeSections } from "@/components/marketing/home-sections"
import { apexUrl } from "@/lib/hosts"

/**
 * Marketing homepage for kanesbookstore.com.
 *
 * Reached by a rewrite from "/" in proxy.ts. The body is shared with
 * app/page.tsx via HomeSections — only the chrome differs, supplied here by the
 * session-free marketing layout.
 */
export const metadata: Metadata = {
    title: "Kane's Komet Bookstore — The Funkiest Bookstore in the Universe",
    description:
        "Kane's Komet Bookstore sells creative literature and art through Komet books and merch. Join the Komet Book Club for bundles, a membership tee, and 35% off as a Kane Dealer.",
    alternates: { canonical: apexUrl("/") },
}

export default function KanesHomePage() {
    return <HomeSections />
}
