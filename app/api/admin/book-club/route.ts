import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Guard: Verify Admin Role
async function verifyAdmin() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() { },
            },
        }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const admin = createAdminClient()
    const { data } = await admin
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

    if (data?.role !== "admin") return null
    return user
}

import { sortSelections, getCurrentStatus } from "@/lib/book-club-utils"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/config'

export async function GET(request: NextRequest) {
    const adminUser = await verifyAdmin()
    if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const admin = createAdminClient()

    // Fetch all selections with book titles
    const { data: rawSelections, error } = await admin
        .from("book_club_selections")
        .select(`
            *,
            books (id, title, author, cover_image_url)
        `)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Dynamically derive status to stay in alignment with real-world calendar
    const processedSelections = (rawSelections || []).map(s => ({
        ...s,
        status: getCurrentStatus(s.month, s.year)
    }))

    const selections = sortSelections(processedSelections)
    return NextResponse.json({ selections })
}

export async function POST(request: NextRequest) {
    const adminUser = await verifyAdmin()
    if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const admin = createAdminClient()

    // 1. Calculate the correct status based on temporal logic
    const status = getCurrentStatus(body.month, body.year)

    // 2. If this is being set to 'current', demote any other 'current' selections to 'past'
    // This handles manual overrides but ensures logic stays clean
    if (status === 'current') {
        await admin
            .from('book_club_selections')
            .update({ status: 'past' })
            .eq('status', 'current')
    }

    // 3. Insert or Update (Upsert based on Month/Year unique constraint)
    const { data, error } = await admin
        .from("book_club_selections")
        .upsert({
            book_id: body.book_id,
            month: body.month,
            year: body.year,
            theme: body.theme,
            description: body.description,
            status: status,
            discussion_date: body.discussion_date || null,
            updated_at: new Date().toISOString()
        }, { onConflict: "month,year" })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ selection: data })
}

export async function DELETE(request: NextRequest) {
    const adminUser = await verifyAdmin()
    if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin
        .from("book_club_selections")
        .delete()
        .eq("id", id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
}
