import { corsHeaders } from '../_shared/cors.ts'
import { createOrUpdateContact, ghlRequest, lookupContactByEmail } from '../_shared/ghl-client.ts'

/**
 * Supabase Auth's "Send Email" hook, delivered through GoHighLevel.
 *
 * Supabase calls this instead of sending mail itself, so authentication email —
 * today just the password reset — goes out on the same GHL sending domain as
 * everything else the app sends, and lands in the contact's conversation history
 * with it. There is no SMTP involved: GHL does not issue outbound SMTP
 * credentials, and its API is the connection it does offer.
 *
 * Unlike email-ops, which only tags a contact and lets a GHL workflow decide
 * what to say, this composes and sends the message directly. It has to: the body
 * contains a one-time link that exists for this send only, so there is nothing a
 * pre-built workflow could template from.
 *
 * ── Security ───────────────────────────────────────────────────────────────
 * This endpoint mints password-reset emails, so an unauthenticated caller who
 * could reach it could mail a reset link for any address to that address at
 * will. It is deployed with --no-verify-jwt because Supabase authenticates hooks
 * with a Standard Webhooks signature rather than a JWT, which makes verifying
 * that signature the only thing standing in the way. Every request is rejected
 * unless it carries a valid one over a recent timestamp.
 */

/** Reject anything older than this, so a captured request cannot be replayed. */
const MAX_SKEW_SECONDS = 5 * 60

function base64ToBytes(b64: string): Uint8Array {
    const binary = atob(b64)
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
    return out
}

function bytesToBase64(bytes: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)))
}

/** Length-independent compare, so a mismatch leaks nothing through timing. */
function safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    return diff === 0
}

/**
 * Standard Webhooks verification, as Supabase signs hook requests.
 *
 * Signed content is "<id>.<timestamp>.<body>", HMAC-SHA256 with the secret, and
 * the header may carry several space-separated versioned signatures during a
 * secret rotation — any one matching is enough.
 */
async function verifySignature(req: Request, rawBody: string, secret: string): Promise<string | null> {
    const id = req.headers.get('webhook-id')
    const timestamp = req.headers.get('webhook-timestamp')
    const signature = req.headers.get('webhook-signature')

    if (!id || !timestamp || !signature) return 'missing webhook signature headers'

    const sent = Number(timestamp)
    if (!Number.isFinite(sent)) return 'bad webhook timestamp'
    if (Math.abs(Math.floor(Date.now() / 1000) - sent) > MAX_SKEW_SECONDS) {
        return 'webhook timestamp outside the accepted window'
    }

    // Supabase stores the secret as "v1,whsec_<base64>"; the key is the base64.
    const keyMaterial = base64ToBytes(secret.replace(/^v1,\s*/, '').replace(/^whsec_/, ''))
    const key = await crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    )
    const mac = await crypto.subtle.sign(
        'HMAC',
        key,
        new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`),
    )
    const expected = bytesToBase64(mac)

    const offered = signature.split(' ').map((part) => part.split(',')[1] ?? '')
    return offered.some((candidate) => safeEqual(candidate, expected))
        ? null
        : 'webhook signature did not match'
}

interface HookPayload {
    user: { id: string; email: string; user_metadata?: Record<string, unknown> }
    email_data: {
        token_hash: string
        redirect_to: string
        email_action_type: string
        site_url: string
    }
}

/**
 * Wording per action type. Only recovery is in use today; the rest are honest
 * defaults.
 *
 * Written with real characters, not HTML entities. `subject` is delivered as
 * plain text, so an &rsquo; there reaches the inbox as those eight literal
 * characters; the curly quote below is correct in the subject and in the HTML
 * body alike.
 */
function compose(actionType: string, actionUrl: string, name: string) {
    const greeting = name ? `Hi ${name},` : 'Hi,'

    if (actionType === 'recovery') {
        return {
            subject: 'Reset your Kane’s Kometz password',
            heading: 'Reset your password',
            body: `${greeting} someone asked to reset the password on your Kane’s Kometz account. Use the button below to choose a new one. The link works once and expires in an hour.`,
            cta: 'Set a new password',
            footer: 'If this was not you, ignore this email — your password stays as it is.',
        }
    }
    if (actionType === 'email_change' || actionType === 'email_change_new') {
        return {
            subject: 'Confirm your new email address',
            heading: 'Confirm your email',
            body: `${greeting} confirm this address to finish changing the email on your Kane’s Kometz account.`,
            cta: 'Confirm email',
            footer: 'If this was not you, ignore this email — nothing changes.',
        }
    }
    return {
        subject: 'Confirm your Kane’s Kometz account',
        heading: 'Confirm your account',
        body: `${greeting} use the button below to continue.`,
        cta: 'Continue',
        footer: 'If this was not you, ignore this email.',
    }
}

function renderHtml(c: ReturnType<typeof compose>, actionUrl: string): string {
    // Inline styles and a table: email clients strip stylesheets, and the plain
    // URL is repeated because some clients will not render the button.
    return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0d0d0d;font-family:Helvetica,Arial,sans-serif;color:#f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#161616;border:1px solid #2a2a2a;border-radius:12px;padding:32px;">
        <tr><td>
          <h1 style="margin:0 0 16px;font-size:24px;letter-spacing:1px;text-transform:uppercase;color:#e5322d;">${c.heading}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#cfcfcf;">${c.body}</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#e5322d;">
            <a href="${actionUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">${c.cta}</a>
          </td></tr></table>
          <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#8a8a8a;">Or paste this into your browser:<br><span style="color:#cfcfcf;word-break:break-all;">${actionUrl}</span></p>
          <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#8a8a8a;">${c.footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    const rawBody = await req.text()

    const secret = Deno.env.get('AUTH_EMAIL_HOOK_SECRET')
    if (!secret) {
        console.error('[auth-email] AUTH_EMAIL_HOOK_SECRET is not set; refusing to send')
        return new Response(
            JSON.stringify({ error: { http_code: 500, message: 'Email hook is not configured' } }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }

    const signatureProblem = await verifySignature(req, rawBody, secret)
    if (signatureProblem) {
        console.error(`[auth-email] rejected: ${signatureProblem}`)
        return new Response(
            JSON.stringify({ error: { http_code: 401, message: 'Unauthorized' } }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }

    try {
        const payload = JSON.parse(rawBody) as HookPayload
        const { user, email_data } = payload

        // The same URL Supabase's own templates build as {{ .ConfirmationURL }}.
        // Going through /auth/v1/verify is what marks the token used, so the link
        // stays single-use exactly as it would have been.
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const actionUrl =
            `${supabaseUrl}/auth/v1/verify` +
            `?token=${encodeURIComponent(email_data.token_hash)}` +
            `&type=${encodeURIComponent(email_data.email_action_type)}` +
            `&redirect_to=${encodeURIComponent(email_data.redirect_to || email_data.site_url)}`

        const meta = user.user_metadata ?? {}
        const firstName = String(meta.first_name ?? meta.full_name ?? meta.display_name ?? '')
            .split(' ')[0]

        const content = compose(email_data.email_action_type, actionUrl, firstName)

        // GHL sends to a contact, so one has to exist. Reusing the shared client
        // means a member who already has a contact keeps it rather than gaining a
        // duplicate. No tags: this is transactional, and tagging would feed the
        // marketing automations.
        let contact = await lookupContactByEmail(user.email)
        if (!contact) {
            const created = await createOrUpdateContact({ email: user.email, source: 'auth-email' })
            contact = created.contact ?? created
        }
        if (!contact?.id) throw new Error(`Could not resolve a GHL contact for ${user.email}`)

        await ghlRequest('/conversations/messages', {
            method: 'POST',
            body: JSON.stringify({
                type: 'Email',
                contactId: contact.id,
                subject: content.subject,
                html: renderHtml(content, actionUrl),
                emailTo: user.email,
            }),
        })

        console.log(`[auth-email] sent ${email_data.email_action_type} to contact ${contact.id}`)
        return new Response(JSON.stringify({}), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (e) {
        // Returning an error tells Supabase the send failed, which surfaces to the
        // caller instead of pretending an email is on its way. The message is
        // logged in full but kept generic in the response: this one is echoed to
        // whoever typed the address into the reset form.
        console.error('[auth-email] send failed:', e instanceof Error ? e.message : e)
        return new Response(
            JSON.stringify({
                error: { http_code: 502, message: 'Could not send the email. Please try again shortly.' },
            }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})
