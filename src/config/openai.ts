import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Solo crear el cliente si la API key está presente
let openaiClient: OpenAI | null = null;

if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export { openaiClient };

export const openaiConfig = {
  model: 'gpt-3.5-turbo',
  maxTokens: 1000,
  temperature: 0.7,
};
