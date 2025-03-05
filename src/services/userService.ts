// src/services/userService.ts
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, UserCreateRequest, UserUpdateRequest, TokenResponse } from '../interfaces/userManager';
import { logger } from '../utils/logger';

const usersFilePath = path.join(process.cwd(), './src/db/users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'default';
const SALT_ROUNDS = 10;

// Cargar usuarios existentes
export const loadUsers = (): User[] => {
  try {
    if (fs.existsSync(usersFilePath)) {
      return JSON.parse(fs.readFileSync(usersFilePath, 'utf-8'));
    }
  } catch (error) {
    logger.error('Error loading users:', error);
  }
  return [];
};

// Guardar usuarios
export const saveUsers = (users: User[]): void => {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
  } catch (error) {
    console.log('Error saving users:', error);
  }
};

// Crear usuario admin por defecto si no existe ninguno
export const initializeDefaultAdmin = async (): Promise<void> => {
  const users = loadUsers();
  if (users.length === 0) {
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(defaultAdminPassword, SALT_ROUNDS);
    
    users.push({
      id: uuidv4(),
      name: 'Administrador',
      username: 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@admin.com',
      password: hashedPassword,
      role: 'admin',
      createdAt: Date.now()
    });
    
    saveUsers(users);
    logger.info('Usuario administrador por defecto creado');
  }
};

// Encontrar usuario por nombre de usuario
export const findUserByUsername = (username: string): User | undefined => {
  const users = loadUsers();
  return users.find(user => user.username.toLowerCase() === username.toLowerCase());
};

// Crear nuevo usuario
export const createUser = async (userData: UserCreateRequest): Promise<User | null> => {
  const users = loadUsers();
  
  // Comprobar si el usuario ya existe
  if (users.some(user => user.username.toLowerCase() === userData.username.toLowerCase())) {
    return null;
  }
  
  // Encriptar contraseña
  const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);
  
  const newUser: User = {
    id: uuidv4(),
    name: userData.name,
    username: userData.username.toLowerCase(),
    email: userData.email,
    password: hashedPassword,
    role: userData.role || 'viewer',
    createdAt: Date.now()
  };
  
  users.push(newUser);
  saveUsers(users);
  
  // Devolver copia sin contraseña
  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword as any;
};

// Actualizar usuario
export const updateUser = async (userId: string, userData: UserUpdateRequest): Promise<User | null> => {
  const users = loadUsers();
  const index = users.findIndex(user => user.id === userId);
  
  if (index === -1) return null;
  
  // Actualizar campos
  if (userData.name) users[index].name = userData.name;
  if (userData.email) users[index].email = userData.email;
  if (userData.role) users[index].role = userData.role;
  
  // Si hay nueva contraseña, encriptarla
  if (userData.password) {
    users[index].password = await bcrypt.hash(userData.password, SALT_ROUNDS);
  }
  
  saveUsers(users);
  
  // Devolver copia sin contraseña
  const { password, ...userWithoutPassword } = users[index];
  return userWithoutPassword as any;
};

// Eliminar usuario
export const deleteUser = (userId: string): boolean => {
  const users = loadUsers();
  const initialLength = users.length;
  const filteredUsers = users.filter(user => user.id !== userId);
  
  if (filteredUsers.length === initialLength) {
    return false;
  }
  
  saveUsers(filteredUsers);
  return true;
};

// Autenticar usuario y generar token
export const authenticateUser = async (username: string, password: string): Promise<TokenResponse | null> => {
  const user = findUserByUsername(username);
  
  if (!user) return null;
  
  const isPasswordValid = await bcrypt.compare(password, user.password);
  
  if (!isPasswordValid) return null;
  
  // Actualizar último login
  const users = loadUsers();
  const index = users.findIndex(u => u.id === user.id);
  users[index].lastLogin = Date.now();
  saveUsers(users);
  
  // Generar token JWT
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  // Devolver token y datos del usuario (sin contraseña)
  const { password: _, ...userWithoutPassword } = user;
  return {
    token,
    user: userWithoutPassword as any
  };
};

// Verificar token JWT
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};