import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createErrorResponse, ErrorCodes } from "../_shared/errors.ts";
import { handleUploadBook } from "./handler.ts";

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Authenticate (Admin only)
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return createErrorResponse(
                ErrorCodes.UNAUTHORIZED.status,
                ErrorCodes.UNAUTHORIZED.code,
                "Missing authorization header"
            );
        }

        // Only POST allowed
        if (req.method !== "POST") {
            return createErrorResponse(
                405,
                "METHOD_NOT_ALLOWED",
                "Only POST method is allowed"
            );
        }

        // Parse multipart form data (for book file and metadata)
        const formData = await req.formData();
        const result = await handleUploadBook(authHeader, formData);

        return new Response(JSON.stringify(result), {
            status: 201,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: any) {
        console.error(`[upload-book] Error: ${error.message}`);
        return createErrorResponse(
            error.status || 500,
            error.code || "INTERNAL_ERROR",
            error.message
        );
    }
});
