import { LLMProvider, Mensaje, LLMResponse } from '../../application/interfaces/llmProvider';
import { openaiClient, openaiConfig } from '../../config/openai';

export class OpenAIProvider implements LLMProvider {
  constructor() {
    if (!openaiClient) {
      throw new Error('OpenAI client no está configurado. Verifica OPENAI_API_KEY');
    }
  }

  async generateResponse(mensajes: Mensaje[]): Promise<LLMResponse> {
    if (!openaiClient) {
      throw new Error('OpenAI client no está configurado');
    }

    try {
      const messages = mensajes.map(mensaje => ({
        role: this.mapRole(mensaje.rol),
        content: mensaje.contenido
      }));

      const completion = await openaiClient.chat.completions.create({
        model: openaiConfig.model,
        messages: messages as any,
        max_tokens: openaiConfig.maxTokens,
        temperature: openaiConfig.temperature,
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('No se recibió respuesta del modelo');
      }

      return {
        contenido: response,
        tokens: completion.usage?.total_tokens,
        modelo: completion.model,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Error en OpenAI Provider:', error);
      throw new Error('Error generando respuesta con OpenAI');
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!openaiClient) {
      return false;
    }

    try {
      const testCompletion = await openaiClient.chat.completions.create({
        model: openaiConfig.model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      });
      
      return !!testCompletion;
    } catch (error) {
      console.error('OpenAI health check failed:', error);
      return false;
    }
  }

  private mapRole(rol: string): 'system' | 'user' | 'assistant' {
    switch (rol) {
      case 'sistema':
        return 'system';
      case 'usuario':
        return 'user';
      case 'asistente':
        return 'assistant';
      default:
        return 'user';
    }
  }
}
