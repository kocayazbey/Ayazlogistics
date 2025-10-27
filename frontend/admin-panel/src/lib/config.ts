// Environment configuration for admin panel
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'https://api.ayazlogistics.com/api/v1',
  mode: import.meta.env.MODE || 'development',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  baseUrl: import.meta.env.BASE_URL || '/',
};

// Mock data mode for preview (no backend needed)
export const isMockMode = import.meta.env.VITE_MOCK_MODE === 'true';

export default config;

