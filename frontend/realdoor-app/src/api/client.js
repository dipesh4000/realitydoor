import axios from 'axios';

const localApiBase = `${window.location.protocol}//${window.location.hostname}:8000/api`;

export const API_BASE = import.meta.env.VITE_API_URL || localApiBase;

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 30000,
});

export const ensureSession = async () => (await api.get('/session')).data;
