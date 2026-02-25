
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkSelections() {
    const { data, error } = await supabase
        .from('book_club_selections')
        .select('*, books(*)')

    if (error) {
        console.error('Error fetching selections:', error)
        return
    }

    console.log('Selections found:', data.length)
    data.forEach(s => {
        console.log(`- Selection: ${s.title}, Book: ${s.books?.title || 'None'}`)
    })
}

checkSelections()
