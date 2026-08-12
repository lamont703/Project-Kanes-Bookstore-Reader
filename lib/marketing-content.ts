import { promises as fs } from "fs"
import path from "path"

/**
 * Loader for the marketing content imported from the old GoHighLevel site.
 * See scripts/marketing-import/ for how content/marketing/*.json is produced.
 *
 * Server-only: these pages are Server Components and prerender at build time.
 */

export type MarketingBlock =
    | { type: "heading"; level: number; text: string }
    | { type: "text"; text: string }
    | { type: "image"; src: string; alt: string; role?: string }

export interface MarketingPage {
    slug: string
    source: string
    captured: string
    blocks: MarketingBlock[]
    /** Assets that 404 on the source site — already broken there, kept for the record. */
    broken_on_source: string[]
}

export async function getMarketingPage(slug: string): Promise<MarketingPage> {
    const file = path.join(process.cwd(), "content", "marketing", `${slug}.json`)
    return JSON.parse(await fs.readFile(file, "utf8")) as MarketingPage
}

export interface MerchProduct {
    name: string
    price: number | null
    image: string
    buyable: boolean
}

/**
 * The merchandise inventory scraped from /morefunk.
 *
 * This is migration input, NOT page content. The live /morefunk page reads
 * products from the database, which admin manages on the kometz host. Use this
 * only to seed that catalog.
 */
export async function getImportedMerch(): Promise<MerchProduct[]> {
    const file = path.join(process.cwd(), "content", "marketing", "morefunk-products.json")
    const doc = JSON.parse(await fs.readFile(file, "utf8"))
    return doc.products as MerchProduct[]
}
