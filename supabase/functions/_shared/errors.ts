export interface AppError {
    code: string;
    message: string;
    details?: Array<{ field: string; issue: string }>;
}

/**
 * Create a standardized JSON error response.
 * 
 * Supports two calling conventions:
 * 1. createErrorResponse(httpStatus, code, message, details?)
 * 2. createErrorResponse(ErrorCode, message, httpStatusOverride?)
 *    where ErrorCode is { status, code }
 */
export function createErrorResponse(
    statusOrErrorCode: number | { status: number; code: string },
    codeOrMessage: string,
    messageOrStatus?: string | number,
    details?: Array<{ field: string; issue: string }>
): Response {
    let httpStatus: number;
    let code: string;
    let message: string;
    let errorDetails = details;

    if (typeof statusOrErrorCode === "object") {
        // Overload 2: createErrorResponse(ErrorCode, message, httpStatusOverride?)
        httpStatus = typeof messageOrStatus === "number" ? messageOrStatus : statusOrErrorCode.status;
        code = statusOrErrorCode.code;
        message = codeOrMessage;
    } else {
        // Overload 1: createErrorResponse(httpStatus, code, message, details?)
        httpStatus = statusOrErrorCode;
        code = codeOrMessage;
        message = (messageOrStatus as string) || "An error occurred";
    }

    const body: { error: AppError } = {
        error: { code, message, ...(errorDetails && { details: errorDetails }) },
    };

    return new Response(JSON.stringify(body), {
        status: httpStatus,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, x-anon-key, content-type',
        },
    });
}

export const ErrorCodes = {
    VALIDATION_ERROR: { status: 400, code: 'VALIDATION_ERROR' },
    UNAUTHORIZED: { status: 401, code: 'UNAUTHORIZED' },
    FORBIDDEN: { status: 403, code: 'FORBIDDEN' },
    NOT_FOUND: { status: 404, code: 'NOT_FOUND' },
    CONFLICT: { status: 409, code: 'CONFLICT' },
    BUSINESS_RULE_VIOLATION: { status: 422, code: 'BUSINESS_RULE_VIOLATION' },
    RATE_LIMITED: { status: 429, code: 'RATE_LIMITED' },
    INTERNAL_ERROR: { status: 500, code: 'INTERNAL_ERROR' },
} as const;
