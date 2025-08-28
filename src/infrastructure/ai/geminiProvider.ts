import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, Mensaje, LLMResponse } from '../../application/interfaces/llmProvider';
import dotenv from 'dotenv';

dotenv.config();

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY no está configurada');
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async generateResponse(mensajes: Mensaje[]): Promise<LLMResponse> {
    try {
      // Convertir mensajes al formato de Gemini
      const prompt = this.buildPrompt(mensajes);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error('No se recibió respuesta del modelo');
      }

      return {
        contenido: text,
        modelo: 'gemini-pro',
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Error en Gemini Provider:', error);
      throw new Error('Error generando respuesta con Gemini');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('test');
      const response = await result.response;
      return !!response.text();
    } catch (error) {
      console.error('Gemini health check failed:', error);
      return false;
    }
  }

  private buildPrompt(mensajes: Mensaje[]): string {
    let prompt = '';

    for (const mensaje of mensajes) {
      switch (mensaje.rol) {
        case 'sistema':
          prompt += `Instrucciones del sistema: ${mensaje.contenido}\n\n`;
          break;
        case 'usuario':
          prompt += `Usuario: ${mensaje.contenido}\n\n`;
          break;
        case 'asistente':
          prompt += `Asistente: ${mensaje.contenido}\n\n`;
          break;
      }
    }

    return prompt.trim();
  }
}
