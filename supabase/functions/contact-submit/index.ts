import { createOrUpdateContact, ghlRequest } from '../_shared/ghl-client.ts'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Contact form submissions from the marketing host (kanesbookstore.com).
 *
 * The old GoHighLevel site had a native lead-capture form; this replaces it.
 * Submissions land in GHL as a contact tagged `website-contact`, with the
 * message attached as a note so it is readable in the CRM timeline.
 *
 * Public by design — no auth. The apex never creates a session, so this cannot
 * require one. Note the abuse surface: rate limiting is left to the platform.
 */

interface ContactPayload {
    name?: string
    email?: string
    phone?: string
    message?: string
    /** Honeypot: real users never fill this. */
    website?: string
}

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
    })

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405)
    }

    let payload: ContactPayload
    try {
        payload = await req.json()
    } catch {
        return json({ error: 'Invalid JSON body' }, 400)
    }

    // Silently accept honeypot hits so bots get no signal.
    if (payload.website) {
        return json({ ok: true })
    }

    const name = (payload.name ?? '').trim()
    const email = (payload.email ?? '').trim().toLowerCase()
    const phone = (payload.phone ?? '').trim()
    const message = (payload.message ?? '').trim()

    if (!name) return json({ error: 'Name is required' }, 400)
    if (!EMAIL.test(email)) return json({ error: 'A valid email is required' }, 400)
    if (!message) return json({ error: 'Message is required' }, 400)
    if (message.length > 5000) return json({ error: 'Message is too long' }, 400)

    const parts = name.split(/\s+/)
    const firstName = parts[0] ?? ''
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : ''

    try {
        const result = await createOrUpdateContact({
            email,
            firstName,
            lastName,
            name,
            phone: phone || undefined,
            tags: ['website-contact'],
            source: "kanesbookstore.com contact form",
        })

        // createOrUpdateContact returns the GHL envelope; the id location varies
        // between create and update responses.
        const contactId: string | undefined =
            result?.contact?.id ?? result?.id ?? result?.contactId

        if (contactId) {
            // Attach the message as a note. A failure here must not fail the
            // submission — the contact itself is the thing we cannot lose.
            try {
                await ghlRequest(`/contacts/${contactId}/notes`, {
                    method: 'POST',
                    body: JSON.stringify({ body: message }),
                })
            } catch (noteError) {
                console.error('Contact saved but note failed:', String(noteError))
            }
        } else {
            console.error('No contact id in GHL response; message not attached as note')
        }

        return json({ ok: true })
    } catch (error) {
        console.error('contact-submit failed:', String(error))
        return json({ error: 'Could not send your message. Please try again.' }, 502)
    }
})
