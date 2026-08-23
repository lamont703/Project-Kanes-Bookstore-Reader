import Link from "next/link"
import { FileText, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { listPages } from "@/lib/page-editor"

/** Admin list of editable marketing pages. */
export const dynamic = "force-dynamic"

function when(value: string | null) {
    if (!value) return "never"
    return new Date(value).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

export default async function AdminPagesPage() {
    const pages = await listPages()

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="font-display text-3xl tracking-wide md:text-4xl">Site Pages</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Edit the copy, images and layout of the public site. Changes stay in a draft
                    until you publish them.
                </p>
            </div>

            {pages.length === 0 ? (
                <Card className="p-10 text-center text-muted-foreground">
                    No editable pages found. If this is a fresh database, run
                    <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                        scripts/seed-page-content.py
                    </code>
                    against it.
                </Card>
            ) : (
                <div className="space-y-3">
                    {pages.map((page) => (
                        <Card key={page.slug} className="flex flex-wrap items-center gap-4 p-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <FileText className="size-5 text-primary" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <h2 className="font-semibold">{page.title}</h2>
                                <p className="text-xs text-muted-foreground">
                                    /{page.slug === "home" ? "" : page.slug} · last published {when(page.publishedAt)}
                                </p>
                            </div>

                            {page.hasDraftChanges ? (
                                <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] uppercase text-yellow-500">
                                    Unpublished changes
                                </span>
                            ) : (
                                <span className="rounded-full bg-green-600/15 px-2 py-0.5 text-[10px] uppercase text-green-500">
                                    Published
                                </span>
                            )}

                            <Button asChild variant="outline" size="sm">
                                <Link href={`/admin/pages/${page.slug}`}>
                                    <Pencil className="mr-1 size-3" /> Edit
                                </Link>
                            </Button>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
