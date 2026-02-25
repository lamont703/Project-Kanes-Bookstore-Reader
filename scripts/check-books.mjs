
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkBooks() {
    const { data, error } = await supabase
        .from('books')
        .select('id, title, status, is_book_club_eligible')

    if (error) {
        console.error('Error fetching books:', error)
        return
    }

    console.log('Books found:', data.length)
    data.forEach(book => {
        console.log(`- ${book.title} (ID: ${book.id}): Status=${book.status}, Eligible=${book.is_book_club_eligible}`)
    })

    const eligible = data.filter(b => b.is_book_club_eligible && b.status === 'published')
    console.log('\nEligible and Published Books:', eligible.length)
}

checkBooks()
