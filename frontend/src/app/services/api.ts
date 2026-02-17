import axios from 'axios';

const API_URL = 'http://localhost:5000/api/';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests if available
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // If it's a 401 Unauthorized, clear the token
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
        }
        return Promise.reject(error);
    }
);

export const auth = {
    login: (email: string, password: string) => api.post('auth/login', { email, password }),
    register: (name: string, email: string, password: string, preferredLanguage: string) =>
        api.post('auth/register', { name, email, password, preferredLanguage }),
    logout: () => api.post('auth/logout'),
    getMe: () => api.get('auth/me'),
};

export const sign = {
    detect: (detectedSign: string, confidence: number, language: string) =>
        api.post('sign/detect', { detectedSign, confidence, language }),
    getHistory: (limit: number, offset: number) => api.get(`sign/history?limit=${limit}&offset=${offset}`),
};

export const voice = {
    transcribe: (transcript: string, language: string, durationSeconds: number) =>
        api.post('voice/transcribe', { transcript, language, durationSeconds }),
    getHistory: (limit: number, offset: number) => api.get(`voice/history?limit=${limit}&offset=${offset}`),
};

export const text = {
    sendMessage: (messageText: string, language: string) =>
        api.post('text/messages', { messageText, language }),
    getMessages: (limit: number, offset: number) => api.get(`text/messages?limit=${limit}&offset=${offset}`),
};

export const preferences = {
    get: () => api.get('preferences'),
    update: (data: any) => api.put('preferences', data),
};

export const translate = {
    text: (text: string, sourceLang: string, targetLang: string) =>
        api.post('translate', { text, sourceLang, targetLang }),
};

export default api;
