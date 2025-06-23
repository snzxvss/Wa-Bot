// src/interfaces/userManager.ts
export interface User {
  id: string;
  name: string;
  username: string;
  password: string; // Hash de la contraseña, nunca la contraseña en texto plano
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  createdAt: number;
  lastLogin?: number;
}

export interface UserLoginRequest {
  username: string;
  password: string;
}

export interface UserCreateRequest {
  name: string;
  username: string;
  password: string; 
  email: string;
  role?: 'admin' | 'operator' | 'viewer';
}

export interface UserUpdateRequest {
  name?: string;
  password?: string;
  email?: string;
  role?: 'admin' | 'operator' | 'viewer';
}

export interface TokenResponse {
  token: string;
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    role: string;
  }
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
}

export interface DiscordMessage {
  id: string;
  author: string;
  channelId: string;
  content: string;
  timestamp: number;
}

export interface BridgeConfig {
  whatsappGroupId: string;
  discordChannelId: string;
}