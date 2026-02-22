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

export const createOrUpdateContact = async (contact: GHLContact) => {
    const locationId = Deno.env.get('GHL_LOCATION_ID')
    if (!locationId) {
        throw new Error('GHL_LOCATION_ID is not set')
    }

    return ghlRequest('/contacts/', {
        method: 'POST',
        body: JSON.stringify({
            ...contact,
            locationId,
        }),
    })
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
