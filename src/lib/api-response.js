export function buildSuccessResponse(data, meta = {}) {
  return {
    success: true,
    data,
    ...meta,
  };
}

export function buildErrorResponse(message, status = 400, details = null) {
  return {
    success: false,
    error: {
      message,
      status,
      details,
    },
  };
}

export function jsonSuccess(response, data, meta = {}) {
  return response.json(buildSuccessResponse(data, meta));
}

export function jsonError(response, message, status = 400, details = null) {
  return response.json(buildErrorResponse(message, status, details), { status });
}
