import { LLMProvider, Mensaje, LLMResponse } from '../../application/interfaces/llmProvider';
import { openRouterConfig } from '../../config/openrouter';
import dotenv from 'dotenv';

dotenv.config();

export class OpenRouterProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl = openRouterConfig.baseUrl;
  private model = openRouterConfig.defaultModel;

  constructor() {
    if (!openRouterConfig.apiKey) {
      throw new Error('OPENROUTER_API_KEY no está configurada');
    }
    this.apiKey = openRouterConfig.apiKey;
  }

  async generateResponse(mensajes: Mensaje[]): Promise<LLMResponse> {
    try {
      const messages = mensajes.map(mensaje => ({
        role: this.mapRole(mensaje.rol),
        content: mensaje.contenido
      }));

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': openRouterConfig.siteUrl,
          'X-Title': openRouterConfig.siteName,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          max_tokens: openRouterConfig.maxTokens,
          temperature: openRouterConfig.temperature,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No se recibió respuesta del modelo');
      }

      return {
        contenido: content.trim(),
        tokens: data.usage?.total_tokens,
        modelo: this.model,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Error en OpenRouter Provider:', error);
      
      if (error instanceof Error) {
        throw new Error(`Error generando respuesta con OpenRouter: ${error.message}`);
      }
      
      throw new Error('Error desconocido generando respuesta con OpenRouter');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const testResponse = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': openRouterConfig.siteUrl,
          'X-Title': openRouterConfig.siteName,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      });

      return testResponse.ok;
    } catch (error) {
      console.error('OpenRouter health check failed:', error);
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

  // Método para cambiar modelo si necesitas usar otro
  setModel(model: string): void {
    this.model = model;
  }

  // Modelos gratuitos disponibles en OpenRouter
  static getFreeModels(): string[] {
    return openRouterConfig.freeModels;
  }

  // Obtener modelo actual
  getCurrentModel(): string {
    return this.model;
  }

  // Obtener información del modelo actual
  getModelInfo() {
    return {
      model: this.model,
      isFree: openRouterConfig.freeModels.includes(this.model),
      isPremium: openRouterConfig.premiumModels.includes(this.model)
    };
  }
}
