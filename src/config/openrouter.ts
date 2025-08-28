import dotenv from 'dotenv';

dotenv.config();

export const openRouterConfig = {
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
  defaultModel: 'meta-llama/llama-3.2-3b-instruct:free', // Modelo gratuito
  maxTokens: 1000,
  temperature: 0.7,
  siteName: 'Wa-Bot',
  siteUrl: 'https://wa-bot.local',
  
  // Modelos disponibles gratuitos
  freeModels: [
    'meta-llama/llama-3.2-3b-instruct:free',
    'meta-llama/llama-3.2-1b-instruct:free',
    'google/gemma-2-9b-it:free',
    'microsoft/phi-3-mini-128k-instruct:free',
    'huggingface/zephyr-7b-beta:free',
    'mistralai/mistral-7b-instruct:free'
  ],
  
  // Modelos premium disponibles (requieren créditos)
  premiumModels: [
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'openai/gpt-3.5-turbo',
    'anthropic/claude-3.5-sonnet',
    'google/gemini-pro-1.5',
    'meta-llama/llama-3.1-70b-instruct'
  ]
};

// Función para verificar si el modelo es gratuito
export const isFreeModel = (model: string): boolean => {
  return openRouterConfig.freeModels.includes(model);
};

// Función para obtener información del modelo
export const getModelInfo = (model: string) => {
  return {
    isFree: isFreeModel(model),
    isPremium: openRouterConfig.premiumModels.includes(model),
    isValid: [...openRouterConfig.freeModels, ...openRouterConfig.premiumModels].includes(model)
  };
};
