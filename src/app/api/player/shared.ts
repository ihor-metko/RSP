/**
 * Shared constants for API proxy routes
 */

/**
 * Headers that are safe to forward to internal APIs
 * These headers don't contain sensitive information
 */
export const SAFE_HEADERS_TO_FORWARD = [
  'accept',
  'accept-language',
  'user-agent',
] as const;

/**
 * Utility function to create a Headers object with only safe headers
 * from the original request
 */
export function getSafeHeaders(request: Request): Headers {
  const safeHeaders = new Headers();
  
  SAFE_HEADERS_TO_FORWARD.forEach(headerName => {
    const headerValue = request.headers.get(headerName);
    if (headerValue) {
      safeHeaders.set(headerName, headerValue);
    }
  });
  
  return safeHeaders;
}
