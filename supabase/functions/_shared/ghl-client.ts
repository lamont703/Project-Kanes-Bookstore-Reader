// supabase/functions/_shared/ghl-client.ts

export interface GHLContact {
    firstName?: string
    lastName?: string
    name?: string
    email: string
    phone?: string
    address1?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
    tags?: string[]
    source?: string
    customFields?: Array<{ id: string; value: string | string[] }>
}

export const ghlRequest = async (path: string, options: RequestInit = {}) => {
    const apiKey = Deno.env.get('GHL_API_KEY')

    if (!apiKey) {
        throw new Error('GHL_API_KEY is not set')
    }

    const url = `https://services.leadconnectorhq.com${path}`
    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
            ...options.headers,
        },
    })

    if (!response.ok) {
        const errorText = await response.text()
        // Throw the raw error text so the caller can parse it if needed
        throw new Error(`GHL_API_ERROR:${response.status}:${errorText}`)
    }

    return response.json()
}

export const lookupContactByEmail = async (email: string) => {
    const locationId = Deno.env.get('GHL_LOCATION_ID')
    if (!locationId) {
        throw new Error('GHL_LOCATION_ID is not set')
    }

    // GHL V2 Search Contacts by email
    const response = await ghlRequest(`/contacts/?locationId=${locationId}&query=${encodeURIComponent(email)}`, {
        method: 'GET'
    })

    // The API might return multiple if duplicates exist, but we take the first match
    return response.contacts?.find((c: any) => c.email.toLowerCase() === email.toLowerCase()) || null
}

export const lookupContactByPhone = async (phone: string) => {
    const locationId = Deno.env.get('GHL_LOCATION_ID')
    if (!locationId) {
        throw new Error('GHL_LOCATION_ID is not set')
    }

    // Clean phone number (remove non-digits for search)
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 5) return null

    const response = await ghlRequest(`/contacts/?locationId=${locationId}&query=${encodeURIComponent(phone)}`, {
        method: 'GET'
    })

    // Find a match that has a similar phone number
    return response.contacts?.find((c: any) => {
        const cPhone = (c.phone || '').replace(/\D/g, '')
        return cPhone.includes(cleanPhone) || cleanPhone.includes(cPhone)
    }) || null
}

export const createOrUpdateContact = async (contact: GHLContact) => {
    const locationId = Deno.env.get('GHL_LOCATION_ID')
    if (!locationId) {
        throw new Error('GHL_LOCATION_ID is not set')
    }

    // 1. Search for existing contacts by both email and phone
    const [emailMatch, phoneMatch] = await Promise.all([
        lookupContactByEmail(contact.email),
        contact.phone ? lookupContactByPhone(contact.phone) : Promise.resolve(null)
    ])

    let targetContactId = emailMatch?.id || phoneMatch?.id
    const sanitizedData = { ...contact }

    // 2. Resolve internal GHL conflicts before sending the request
    if (emailMatch && phoneMatch && emailMatch.id !== phoneMatch.id) {
        console.warn(`[ghl-client] Conflict Detected: Email matches GHL ${emailMatch.id}, but Phone matches GHL ${phoneMatch.id}. Prioritizing Email match.`)
        // We prioritize the email match. To avoid a 400 error from GHL, we must remove the conflicting phone number.
        delete sanitizedData.phone
        targetContactId = emailMatch.id
    }

    const performSave = async (id?: string) => {
        try {
            if (id) {
                console.log(`[ghl-client] Updating existing contact: ${id}`)
                const result = await updateContact(id, sanitizedData)
                return { contact: result.contact || result }
            } else {
                console.log(`[ghl-client] Creating new contact for: ${contact.email}`)
                return await ghlRequest('/contacts/', {
                    method: 'POST',
                    body: JSON.stringify({ ...sanitizedData, locationId }),
                })
            }
        } catch (error: any) {
            if (error.message.startsWith('GHL_API_ERROR:400')) {
                const errorBody = error.message.split('GHL_API_ERROR:400:')[1]
                try {
                    const json = JSON.parse(errorBody)
                    // If GHL still finds a duplicate we missed (e.g. race condition), log it cleanly
                    if (json.message?.includes('duplicated')) {
                        console.warn(`[ghl-client] GHL still reports a duplicate on ${json.meta?.matchingField}. ID: ${json.meta?.contactId || 'Unknown'}`)
                        // If it's a create (no id), and GHL found an ID for us, try one update
                        if (!id && json.meta?.contactId) {
                            const newSanatized = { ...sanitizedData }
                            if (json.meta.matchingField) delete (newSanatized as any)[json.meta.matchingField]
                            const retryResult = await updateContact(json.meta.contactId, newSanatized)
                            return { contact: retryResult.contact || retryResult }
                        }
                    }
                } catch (e) {
                    console.error('[ghl-client] Failed to parse GHL error body', e)
                }
                console.error(`[ghl-client] GHL 400 Error: ${errorBody}`)
            }
            throw error
        }
    }

    return await performSave(targetContactId)
}

export const updateContact = async (contactId: string, contact: Partial<GHLContact>) => {
    return ghlRequest(`/contacts/${contactId}`, {
        method: 'PUT',
        body: JSON.stringify(contact),
    })
}

export const addTagsToContact = async (contactId: string, tags: string[]) => {
    return ghlRequest(`/contacts/${contactId}/tags`, {
        method: 'POST',
        body: JSON.stringify({ tags }),
    })
}
