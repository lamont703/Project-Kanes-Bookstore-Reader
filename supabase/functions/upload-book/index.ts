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
        // 1. Authenticate (Admin only check happens in handler)
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            console.error("[upload-book] Missing Authorization header");
            return createErrorResponse(
                ErrorCodes.UNAUTHORIZED,
                "Missing authorization header"
            );
        }

        const tokenPrefix = authHeader.substring(0, 15);
        console.log(`[upload-book] Request received. Auth prefix: ${tokenPrefix}...`);

        // 2. Only POST allowed
        if (req.method !== "POST") {
            return createErrorResponse(
                405,
                "METHOD_NOT_ALLOWED",
                "Only POST method is allowed"
            );
        }

        // 3. Parse multipart form data
        let formData: FormData;
        try {
            formData = await req.formData();
        } catch (formError: any) {
            console.error(`[upload-book] FormData parsing failed: ${formError.message}`);
            return createErrorResponse(
                ErrorCodes.VALIDATION_ERROR,
                `Failed to parse form data: ${formError.message}`
            );
        }

        const result = await handleUploadBook(authHeader, formData);

        return new Response(JSON.stringify(result), {
            status: 201,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: any) {
        console.error(`[upload-book] Uncaught Error: ${error.message}`);
        // Ensure we maintain the status code if provided in the error object
        const status = error.status || 500;
        const code = error.code || "INTERNAL_ERROR";

        return createErrorResponse(status, code, error.message);
    }
});
