import { toast } from 'sonner';

/**
 * Parses an API error object and returns the main message, status code, error code,
 * and a normalized object of field errors (supporting both snake_case & camelCase field names).
 *
 * @param {any} err - Error from Axios call
 * @param {string} fallbackMsg - Default error message if non provided
 * @returns {{ message: string, code: string, status: number, errors: Record<string, string> }}
 */
export function parseApiError(err, fallbackMsg = 'Terjadi kesalahan pada sistem') {
  const responseData = err?.response?.data;
  const status = err?.response?.status;
  const code = responseData?.code || 'UNKNOWN_ERROR';
  const message = responseData?.message || err?.message || fallbackMsg;
  const rawErrors = responseData?.errors || {};

  const normalizedErrors = {};

  if (rawErrors && typeof rawErrors === 'object') {
    Object.entries(rawErrors).forEach(([key, val]) => {
      if (!val) return;
      normalizedErrors[key] = val;

      if (key.includes('_')) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        normalizedErrors[camelKey] = val;
      }
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      normalizedErrors[snakeKey] = val;
    });
  }

  return {
    message,
    code,
    status,
    errors: normalizedErrors,
  };
}

/**
 * Handles API error by firing a Toast notification with the main error message
 * and returning the parsed error details including field errors.
 *
 * @param {any} err - Error from Axios call
 * @param {string} fallbackMsg - Default error message
 * @param {boolean} showToast - Whether to display toast notification (default: true)
 * @returns {{ message: string, code: string, status: number, errors: Record<string, string> }}
 */
export function handleApiError(err, fallbackMsg = 'Gagal memproses permintaan', showToast = true) {
  const parsed = parseApiError(err, fallbackMsg);
  if (showToast) {
    toast.error(parsed.message);
  }
  return parsed;
}
