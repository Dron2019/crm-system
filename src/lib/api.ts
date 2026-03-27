import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const csrfCookieUrl = import.meta.env.VITE_CSRF_COOKIE_URL || '/sanctum/csrf-cookie';

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
  withXSRFToken: true,
});

// CSRF cookie must be fetched before login/register
export async function getCsrfCookie(): Promise<void> {
  await axios.get(csrfCookieUrl, { withCredentials: true });
}

export default api;
