// src/plugins/sysManager.ts
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from '../utils/logger';
import { ApiErrorResponse, EnvValueResponse } from '../interfaces/sysManager';
import { 
  getOrders, 
  updateOrderStatus,
  searchOrders,
  getSalesSummary,
  getTopProducts,
  getSalesByTimePeriod,
  getOrderById,
  OrderSearchCriteria
} from '../services/orderService';
import { 
  authenticateUser, 
  createUser, 
  updateUser, 
  deleteUser, 
  loadUsers, 
  verifyToken,
  initializeDefaultAdmin 
} from '../services/userService';
import { UserLoginRequest, UserCreateRequest, UserUpdateRequest } from '../interfaces/userManager';

// Cargar variables de entorno
dotenv.config();

export const initsysManager = async () => {
  const app = express();
  const PORT = process.env.ENV_MANAGER_PORT || 3000;
  
  // Inicializar administrador por defecto
  await initializeDefaultAdmin();
  
  // Crear servidor HTTP
  const server = http.createServer(app);
  
  // Configurar Socket.IO
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.SOCKET_IO_CORS_ORIGIN || "*",
      methods: ["GET", "POST"]
    }
  });
  
  // Hacer io disponible globalmente
  global.io = io;
  
  // Middleware
  app.use(express.json());
  app.use(cors());
  app.use(express.static(path.join(process.cwd(), 'public')));
  
  // Middleware para verificar token JWT
  const verifyJWT = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ error: 'Token no proporcionado' } as ApiErrorResponse);
      return;
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({ error: 'Token inválido o expirado' } as ApiErrorResponse);
      return;
    }
    
    // Agregar usuario decodificado a la solicitud
    (req as any).user = decoded;
    next();
  };
  
  // Socket.IO connection handling
  io.on('connection', (socket) => {
    logger.info('Cliente conectado al WebSocket: ' + socket.id);
    
    socket.on('disconnect', () => {
      logger.info('Cliente desconectado: ' + socket.id);
    });
  });
  
  // ===== ENDPOINTS DE AUTENTICACIÓN =====
  app.post('/api/auth/login', async (req: any, res: any) => {
    const { username, password } = req.body as UserLoginRequest;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' } as ApiErrorResponse);
    }
    
    try {
      const authResult = await authenticateUser(username, password);
      
      if (!authResult) {
        return res.status(401).json({ error: 'Credenciales inválidas' } as ApiErrorResponse);
      }
      
      res.json(authResult);
    } catch (error) {
      logger.error('Error en login:', error);
      res.status(500).json({ error: 'Error al iniciar sesión' } as ApiErrorResponse);
    }
  });
  
  app.get('/api/auth/verify', verifyJWT, (req: any, res: any) => {
    res.json({ valid: true, user: (req as any).user });
  });
  
  // ===== ENDPOINTS DE GESTIÓN DE USUARIOS =====
  
  // Obtener todos los usuarios (solo admins)
  app.get('/api/users', verifyJWT, (req: any, res: any) => {
    const user = (req as any).user;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Permisos insuficientes' } as ApiErrorResponse);
    }
    
    const users = loadUsers().map(({ password, ...user }) => user);
    res.json(users);
  });
  
  // Crear nuevo usuario (solo admins)
  app.post('/api/users', verifyJWT, async (req: any, res: any) => {
    const user = (req as any).user;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Permisos insuficientes' } as ApiErrorResponse);
    }
    
    const userData = req.body as UserCreateRequest;
    
    if (!userData.name || !userData.username || !userData.password || !userData.email) {
      return res.status(400).json({ 
        error: 'Todos los campos son obligatorios: nombre, usuario, contraseña y correo' 
      } as ApiErrorResponse);
    }
    
    try {
      const newUser = await createUser(userData);
      
      if (!newUser) {
        return res.status(400).json({ error: 'El nombre de usuario ya existe' } as ApiErrorResponse);
      }
      
      res.status(201).json(newUser);
    } catch (error) {
      logger.error('Error al crear usuario:', error);
      res.status(500).json({ error: 'Error al crear usuario' } as ApiErrorResponse);
    }
  });
  
  // Actualizar usuario
  app.put('/api/users/:id', verifyJWT, async (req: any, res: any) => {
    const { id } = req.params;
    const user = (req as any).user;
    const userData = req.body as UserUpdateRequest;
    
    // Solo admins pueden modificar otros usuarios
    if (id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Permisos insuficientes' } as ApiErrorResponse);
    }
    
    try {
      const updatedUser = await updateUser(id, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' } as ApiErrorResponse);
      }
      
      res.json(updatedUser);
    } catch (error) {
      logger.error('Error al actualizar usuario:', error);
      res.status(500).json({ error: 'Error al actualizar usuario' } as ApiErrorResponse);
    }
  });
  
  // Eliminar usuario (solo admins)
  app.delete('/api/users/:id', verifyJWT, (req: any, res: any) => {
    const { id } = req.params;
    const user = (req as any).user;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Permisos insuficientes' } as ApiErrorResponse);
    }
    
    // Evitar que un admin se elimine a sí mismo
    if (id === user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' } as ApiErrorResponse);
    }
    
    const success = deleteUser(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Usuario no encontrado' } as ApiErrorResponse);
    }
    
    res.json({ success: true, message: 'Usuario eliminado correctamente' });
  });
  
  // ===== ENDPOINTS EXISTENTES =====
  
  // API endpoints para variables de entorno
  app.get('/api/env', verifyJWT, (req: any, res: any) => {
    // Obtener todas las variables de entorno permitidas
    const envValues: EnvValueResponse = {
      CATALOG_PDF_URL: process.env.CATALOG_PDF_URL || '',
      QR_IMAGE_URL: process.env.QR_IMAGE_URL || '',
      PAYMENT_NUMBER: process.env.PAYMENT_NUMBER || '',
      // Añade más variables según necesites
    };
    
    res.json(envValues);
  });
  
  // Endpoints para órdenes/pedidos
  app.get('/api/orders', verifyJWT, (req: any, res: any) => {
    const filters = {
      status: req.query.status as any,
      fromDate: req.query.fromDate ? parseInt(req.query.fromDate as string) : undefined,
      toDate: req.query.toDate ? parseInt(req.query.toDate as string) : undefined
    };
    
    const orders = getOrders(filters);
    res.json(orders);
  });
  
  app.patch('/api/orders/:id/status', verifyJWT, (req: any, res: any) => {
    const { id } = req.params;
    const { status } = req.body;
    const user = (req as any).user;
    
    const updatedOrder = updateOrderStatus(id, status, user.username);
    
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Pedido no encontrado' } as ApiErrorResponse);
    }
    
    res.json(updatedOrder);
  });

  // Obtener un pedido específico por ID
  app.get('/api/orders/:id', verifyJWT, (req: any, res: any) => {
    const { id } = req.params;
    
    const order = getOrderById(id);
    
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' } as ApiErrorResponse);
    }
    
    res.json(order);
  });

  // Búsqueda avanzada de pedidos
  app.post('/api/orders/search', verifyJWT, (req: any, res: any) => {
    const criteria = req.body as OrderSearchCriteria;
    const orders = searchOrders(criteria);
    res.json(orders);
  });

  // Obtener resumen de ventas con filtros opcionales
  app.post('/api/analytics/sales-summary', verifyJWT, (req: any, res: any) => {
    const criteria = req.body as OrderSearchCriteria;
    const summary = getSalesSummary(criteria);
    res.json(summary);
  });

  // Obtener los productos más vendidos
  app.post('/api/analytics/top-products', verifyJWT, (req: any, res: any) => {
    const { limit = 5, ...criteria } = req.body;
    const topProducts = getTopProducts(limit, criteria);
    res.json(topProducts);
  });

  // Obtener ventas por período de tiempo (diario, semanal, mensual)
  app.post('/api/analytics/sales-by-period', verifyJWT, (req: any, res: any) => {
    const { period = 'daily', ...criteria } = req.body;
    
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ 
        error: 'Período inválido. Use "daily", "weekly" o "monthly"' 
      } as ApiErrorResponse);
    }
    
    const salesByPeriod = getSalesByTimePeriod(period as 'daily' | 'weekly' | 'monthly', criteria);
    res.json(salesByPeriod);
  });

  // Endpoint para obtener estadísticas generales del dashboard
  app.get('/api/analytics/dashboard', verifyJWT, (req: any, res: any) => {
    // Resumen general
    const allTimeSummary = getSalesSummary();
    
    // Ventas recientes (últimos 30 días)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentSummary = getSalesSummary({ fromDate: thirtyDaysAgo });
    
    // Productos más vendidos (top 5)
    const topProducts = getTopProducts(5);
    
    // Ventas de los últimos 7 días
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentSales = getSalesByTimePeriod('daily', { fromDate: sevenDaysAgo });
    
    res.json({
      allTime: allTimeSummary,
      recent: recentSummary,
      topProducts,
      recentSales
    });
  });
  
  // Iniciar servidor
  server.listen(PORT, () => {
    logger.info(`------------------------------------------------------------`);
    logger.info(`API SYS corriendo en el puerto: ${PORT}`);
    logger.info(`------------------------------------------------------------`);
  });
  
  // Devolver la instancia de io para usarla en otros módulos
  return io;
};

// Declaración global para TypeScript
declare global {
  var io: { emit: (event: string, data: any) => void; } | undefined;
}