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
        console.error(`GHL Error Response: ${errorText}`)
        throw new Error(`GHL API error: ${response.status} ${errorText}`)
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

    // 1. First attempt: Search by email
    console.log(`Searching for existing GHL contact by email: ${contact.email}`)
    let existingContact = await lookupContactByEmail(contact.email)

    // 2. Second attempt: If no email match, search by phone
    if (!existingContact && contact.phone) {
        console.log(`No email match, searching by phone: ${contact.phone}`)
        existingContact = await lookupContactByPhone(contact.phone)
    }

    const performUpdate = async (id: string, data: GHLContact, isRetry = false): Promise<{ contact: any }> => {
        try {
            console.log(`Attempting to update GHL contact: ${id}${isRetry ? ' (Retry)' : ''}`)
            const result = await updateContact(id, data)
            return { contact: result.contact || result }
        } catch (error: any) {
            // Handle the specific "Duplicate Contact" error
            if (error.message.includes('400') && error.message.includes('duplicated contacts')) {
                try {
                    const errorJson = JSON.parse(error.message.replace('GHL API error: 400 ', ''))
                    const conflictingId = errorJson.meta?.contactId
                    const matchingField = errorJson.meta?.matchingField // e.g., "phone"

                    console.warn(`Conflict detected on field: ${matchingField}. Target ID: ${id}, Suggested ID: ${conflictingId}`)

                    // Create a sanitized copy of the data without the conflicting field
                    const sanitizedData = { ...data }
                    if (matchingField && matchingField in sanitizedData) {
                        delete (sanitizedData as any)[matchingField]
                    }

                    // If it's already a retry, or if it's a circular reference (A -> B -> A), or if GHL has no suggestion:
                    // Just update the record we are currently on WITHOUT the bad field.
                    if (isRetry || !conflictingId || conflictingId === id) {
                        console.log(`Bypassing further conflict; forced update on ${id} (removed ${matchingField})`)
                        const finalResult = await updateContact(id, sanitizedData)
                        return { contact: finalResult.contact || finalResult }
                    }

                    // Otherwise, we try to move to the suggested ID GHL prefers for this data.
                    return await performUpdate(conflictingId, sanitizedData, true)
                } catch (parseError) {
                    console.error('Failed to resolve GHL conflict via retry', parseError)
                }
            }
            throw error // Re-throw if we can't handle it
        }
    }

    if (existingContact) {
        return await performUpdate(existingContact.id, contact)
    }

    // 3. If no existing contact found, try to create
    console.log(`No existing GHL contact found. Creating new for ${contact.email}`)
    try {
        return await ghlRequest('/contacts/', {
            method: 'POST',
            body: JSON.stringify({
                ...contact,
                locationId,
            }),
        })
    } catch (error: any) {
        // Even if lookup failed, the POST might fail because GHL is faster at finding duplicates
        if (error.message.includes('400') && error.message.includes('duplicated contacts')) {
            try {
                const errorJson = JSON.parse(error.message.replace('GHL API error: 400 ', ''))
                const conflictingId = errorJson.meta?.contactId
                const matchingField = errorJson.meta?.matchingField

                if (conflictingId) {
                    console.warn(`POST failed; conflict ${conflictingId} on ${matchingField}. Updating that record...`)
                    const sanitizedData = { ...contact }
                    if (matchingField && matchingField in sanitizedData) {
                        delete (sanitizedData as any)[matchingField]
                    }
                    return await performUpdate(conflictingId, sanitizedData)
                }
            } catch (p) { }
        }
        throw error
    }
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
