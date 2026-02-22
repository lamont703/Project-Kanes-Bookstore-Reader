import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createErrorResponse } from '../_shared/errors.ts'
import { handleCheckout } from './handler.ts'

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        if (req.method !== 'POST') {
            return createErrorResponse(405, 'METHOD_NOT_ALLOWED', 'Only POST requests are allowed')
        }

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return createErrorResponse(401, 'UNAUTHORIZED', 'Missing authorization header')
        }

        const body = await req.json()
        const result = await handleCheckout(authHeader, body)

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('Checkout error:', error)
        return createErrorResponse(
            error.status || 500,
            error.code || 'INTERNAL_ERROR',
            error.message
        )
    }
})
