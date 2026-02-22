import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createOrUpdateContact } from '../_shared/ghl-client.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload = await req.json()
        console.log('GHL Sync Payload Received:', JSON.stringify(payload, null, 2))

        // Webhook payload from Supabase
        const { record, type } = payload

        if (type !== 'INSERT' && type !== 'UPDATE') {
            return new Response(JSON.stringify({ message: 'Skipping non-insert/update event' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        if (!record || !record.email) {
            return new Response(JSON.stringify({ error: 'Missing record or email' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // Sync to GHL
        // Use firstName/lastName if available, or fall back to display_name splitting
        const ghlResponse = await createOrUpdateContact({
            email: record.email as string,
            firstName: (record.first_name || record.display_name?.split(' ')[0] || '') as string,
            lastName: (record.last_name || record.display_name?.split(' ').slice(1).join(' ') || '') as string,
            name: (record.full_name || record.display_name || '') as string,
            phone: (record.phone || undefined) as string | undefined,
            address1: (record.mailing_address || undefined) as string | undefined, // Added mailing address sync
            tags: ['app-user'],
            source: "Kane's Komet Book Reader"
        })

        console.log('GHL Sync Success:', JSON.stringify(ghlResponse))

        // If we got a new contact ID, update it in our DB
        if (ghlResponse.contact?.id && record.id && !record.ghl_contact_id) {
            const supabase = createAdminClient()
            const { error: updateError } = await supabase
                .from('users')
                .update({ ghl_contact_id: ghlResponse.contact.id })
                .eq('id', record.id)

            if (updateError) {
                console.error('Error updating ghl_contact_id in DB:', updateError)
            }
        }

        return new Response(JSON.stringify({ success: true, ghlContactId: ghlResponse.contact?.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        console.error('GHL Sync Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
