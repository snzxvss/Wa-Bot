export interface Mensaje {
  rol: 'usuario' | 'asistente' | 'sistema';
  contenido: string;
  timestamp: Date;
}

export interface LLMResponse {
  contenido: string;
  tokens?: number;
  modelo?: string;
  timestamp: Date;
}

export interface LLMProvider {
  generateResponse(mensajes: Mensaje[]): Promise<LLMResponse>;
  isHealthy(): Promise<boolean>;
}
