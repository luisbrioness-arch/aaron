import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

// En dev, Vite hace proxy de /api -> localhost:8000 (ver vite.config.ts).
// En producción, /api vive en el mismo origen que el frontend (o donde
// termine apuntando CORS_ORIGIN una vez que haya dominio confirmado —
// ver DECISIONS.md).
export const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);
