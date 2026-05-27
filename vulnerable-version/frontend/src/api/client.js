import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export function extractApiError(error, fallback = 'Something went wrong.') {
  if (error && error.response && error.response.data) {
    const data = error.response.data;
    if (typeof data.error === 'string') {
      return data.error;
    }
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors[0];
    }
  }
  if (error && error.message) {
    return error.message;
  }
  return fallback;
}

export default apiClient;
