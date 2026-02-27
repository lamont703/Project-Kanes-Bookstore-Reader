import { addTagsToContact, createOrUpdateContact } from '../_shared/ghl-client.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * email-ops Edge Function
 * 
 * This function acts as a dispatcher for GoHighLevel email triggers.
 * Instead of sending emails directly, it adds specific tags to GHL contacts,
 * which then triggers corresponding Workflows/Automations within GoHighLevel.
 */

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { event, userId, email, metadata } = await req.json()

        if (!event || (!userId && !email)) {
            return new Response(JSON.stringify({ error: 'Missing required fields: event, and (userId or email)' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const supabase = createAdminClient()
        let ghlContactId: string | null = null
        let userEmail: string = email

        // 1. Resolve GHL Contact ID
        if (userId) {
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('email, ghl_contact_id, full_name, display_name')
                .eq('id', userId)
                .single()

            if (userError || !user) {
                throw new Error(`User not found: ${userId}`)
            }

            ghlContactId = user.ghl_contact_id
            userEmail = user.email

            // If no GHL ID yet, let's try to sync them now
            if (!ghlContactId) {
                console.log(`No GHL Contact ID for user ${userId}, syncing now...`)
                const ghlResponse = await createOrUpdateContact({
                    email: user.email,
                    name: user.full_name || user.display_name || '',
                    tags: ['app-user'],
                    source: "Kane's Komet Book Reader"
                })
                ghlContactId = ghlResponse.contact?.id

                if (ghlContactId) {
                    await supabase.from('users').update({ ghl_contact_id: ghlContactId }).eq('id', userId)
                }
            }
        }

        if (!ghlContactId) {
            // Fallback: search by email if userId not provided or sync failed
            // For this MVP, we assume ghlRequest handles the email lookup/upsert via createOrUpdateContact
            const ghlResponse = await createOrUpdateContact({ email: userEmail, tags: ['app-user'] })
            ghlContactId = ghlResponse.contact?.id
        }

        if (!ghlContactId) {
            throw new Error('Could not resolve or create GHL Contact ID')
        }

        // 2. Dispatch Tags based on Event
        let tagsToAdd: string[] = []

        switch (event) {
            case 'ORDER_CONFIRMED':
                tagsToAdd = ['order-confirmed', `order-id-${metadata?.orderId}`]
                break
            case 'WELCOME_PREMIUM':
                tagsToAdd = ['premium-welcome', 'active-subscriber']
                break
            case 'SUBSCRIPTION_CANCELLED':
                tagsToAdd = ['sub-cancelled']
                // Potentially remove 'active-subscriber' tag here too if GHL API supports removal easily
                break
            case 'USER_BANNED':
                tagsToAdd = ['user-banned']
                break
            case 'PAYMENT_FAILED':
                tagsToAdd = ['payment-failed']
                break
            default:
                console.warn(`Unknown event type: ${event}`)
                return new Response(JSON.stringify({ message: 'Unknown event type, no tags added' }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
        }

        // 3. Add Tags to GHL
        if (tagsToAdd.length > 0) {
            await addTagsToContact(ghlContactId, tagsToAdd)
            console.log(`Tags [${tagsToAdd.join(', ')}] added to GHL contact ${ghlContactId} for event ${event}`)
        }

        return new Response(JSON.stringify({ success: true, event, ghlContactId, tags: tagsToAdd }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Email Ops Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
