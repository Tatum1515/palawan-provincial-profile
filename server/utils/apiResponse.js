const DEFAULT_MESSAGES = {
    400: "The request could not be processed.",
    401: "Authentication is required.",
    403: "You are not authorized to perform this action.",
    404: "The requested resource was not found.",
    409: "The request conflicts with the current resource state.",
    422: "The submitted data is invalid.",
    429: "Too many requests. Please try again later.",
    500: "Internal server error.",
};

const CODE_BY_STATUS = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
    500: "INTERNAL_SERVER_ERROR",
};

export const statusCode = (status) => {
    const parsed = Number(status);
    return Number.isInteger(parsed) && parsed >= 400 && parsed <= 599 ? parsed : 500;
};

export const defaultErrorCode = (status) =>
    CODE_BY_STATUS[statusCode(status)] || "API_ERROR";

export const defaultErrorMessage = (status) =>
    DEFAULT_MESSAGES[statusCode(status)] || DEFAULT_MESSAGES[500];

export const sendApiError = (
    res,
    status,
    message,
    { code, details, meta } = {},
) => {
    const resolvedStatus = statusCode(status);
    const body = {
        success: false,
        code: code || defaultErrorCode(resolvedStatus),
        message: message || defaultErrorMessage(resolvedStatus),
    };

    // Keep backwards compatibility for existing frontend code that still
    // reads `error`, while making `message` the canonical API field.
    body.error = body.message;

    if (details !== undefined) body.details = details;
    if (meta !== undefined) body.meta = meta;

    return res.status(resolvedStatus).json(body);
};

export const sendApiSuccess = (
    res,
    data,
    { status = 200, message, meta } = {},
) => {
    const body = { success: true };
    if (message) body.message = message;
    if (data !== undefined) body.data = data;
    if (meta !== undefined) body.meta = meta;
    return res.status(status).json(body);
};

export const normalizeApiError = (error) => {
    const response = error?.response;
    const status = statusCode(response?.status || 500);
    const payload = response?.data;
    return {
        status,
        code: payload?.code || defaultErrorCode(status),
        message:
            payload?.message ||
            payload?.error ||
            error?.message ||
            defaultErrorMessage(status),
        details: payload?.details,
        meta: payload?.meta,
    };
};
