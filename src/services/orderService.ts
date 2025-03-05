import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

declare global {
  var io: {
    emit: (event: string, data: any) => void;
  } | undefined;
}

// Definir la estructura de un pedido
export interface Order {
  id: string;
  timestamp: number;
  status: 'new' | 'processing' | 'completed' | 'cancelled';
  customer: {
    name: string;
    idNumber: string;
    phone: string;
    address: string;
    barrio: string;
    city: string;
  };
  product: {
    id: string | number | null;
    name: string | null;
    description: string | null;
    price: number | null;
    imageUrl?: string | null;
  };
  payment: {
    total: number;
    productPrice: number;
    deliveryCost: number;
    imagePath?: string;
  };
  notes?: string;
  attendedBy?: string;
  attendedTimestamp?: number;
}

// Interface para criterios de búsqueda avanzada
export interface OrderSearchCriteria {
  status?: Order['status'];
  fromDate?: number;
  toDate?: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  productId?: string | number;
  productName?: string;
  minTotal?: number;
  maxTotal?: number;
  attendedBy?: string;
}

// Interface para resumen de ventas
export interface SalesSummary {
  totalOrders: number;
  totalRevenue: number;
  totalProductSales: number;
  totalDeliveryCost: number;
  avgOrderValue: number;
  countByStatus: {
    new: number;
    processing: number;
    completed: number;
    cancelled: number;
  };
}

// Interface para producto popular
export interface TopProduct {
  id: string | number | null;
  name: string | null;
  count: number;
  totalRevenue: number;
  imageUrl?: string | null;
}

const ordersFilePath = path.join(process.cwd(), './src/db/orders.json');

// Asegurarse de que el directorio de la base de datos existe
export const initOrdersDB = (): void => {
  const dbDir = path.dirname(ordersFilePath);
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
      logger.info(`Directorio para órdenes creado: ${dbDir}`);
    } catch (error) {
      logger.error(`Error al crear directorio para órdenes: ${error}`);
    }
  }
};

// Cargar pedidos existentes
// Cargar pedidos existentes con logs de depuración
export const loadOrders = (): Order[] => {
  try {
    const absolutePath = path.resolve(ordersFilePath);
    logger.info(`Intentando cargar órdenes desde: ${absolutePath}`);
    
    if (fs.existsSync(absolutePath)) {
      const content = fs.readFileSync(absolutePath, 'utf-8');
      logger.info(`Archivo encontrado, tamaño: ${content.length} bytes`);
      
      try {
        const orders = JSON.parse(content);
        logger.info(`Órdenes cargadas exitosamente: ${orders.length}`);
        return orders;
      } catch (parseError) {
        if (parseError instanceof Error) {
          logger.error(`Error al analizar JSON: ${parseError.message}`);
        } else {
          logger.error('Error al analizar JSON');
        }
      }
    } else {
      logger.error(`Archivo de órdenes no encontrado en: ${absolutePath}`);
    }
  } catch (error) {
    logger.error(`Error cargando órdenes: ${error}`);
  }
  
  logger.warn('Devolviendo array vacío de órdenes');
  return [];
};

// Guardar pedidos
export const saveOrders = (orders: Order[]): void => {
  try {
    initOrdersDB(); // Asegurar que el directorio existe
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
  } catch (error) {
    logger.error('Error saving orders:', error);
  }
};

// Crear nuevo pedido
export const createOrder = (orderData: Omit<Order, 'id' | 'timestamp' | 'status'>): Order => {
  const orders = loadOrders();
  const newOrder: Order = {
    id: uuidv4(),
    timestamp: Date.now(),
    status: 'new',
    ...orderData
  };
  
  orders.push(newOrder);
  saveOrders(orders);
  
  // Emitir un evento para el sistema de notificaciones
  if (global.io) {
    global.io.emit('newOrder', newOrder);
  }
  
  return newOrder;
};

// Actualizar estado del pedido
export const updateOrderStatus = (
  orderId: string, 
  status: Order['status'], 
  attendedBy?: string
): Order | null => {
  const orders = loadOrders();
  const orderIndex = orders.findIndex(order => order.id === orderId);
  
  if (orderIndex === -1) return null;
  
  orders[orderIndex].status = status;
  
  if (status === 'completed' && attendedBy) {
    orders[orderIndex].attendedBy = attendedBy;
    orders[orderIndex].attendedTimestamp = Date.now();
  }
  
  saveOrders(orders);
  
  // Emitir evento de actualización
  if (global.io) {
    global.io.emit('orderUpdated', orders[orderIndex]);
  }
  
  return orders[orderIndex];
};

// Obtener un pedido por su ID
export const getOrderById = (orderId: string): Order | null => {
  const orders = loadOrders();
  const order = orders.find(order => order.id === orderId);
  return order || null;
};

// Obtener todos los pedidos con filtros avanzados
export const searchOrders = (criteria: OrderSearchCriteria = {}): Order[] => {
  const orders = loadOrders();
  
  return orders.filter(order => {
    // Filtrar por estado
    if (criteria.status && order.status !== criteria.status) return false;
    
    // Filtrar por rango de fechas
    if (criteria.fromDate && order.timestamp < criteria.fromDate) return false;
    if (criteria.toDate && order.timestamp > criteria.toDate) return false;
    
    // Filtrar por cliente
    if (criteria.customerId && order.customer.idNumber !== criteria.customerId) return false;
    if (criteria.customerName && !order.customer.name.toLowerCase().includes(criteria.customerName.toLowerCase())) return false;
    if (criteria.customerPhone && !order.customer.phone.includes(criteria.customerPhone)) return false;
    
    // Filtrar por producto
    if (criteria.productId && order.product.id !== criteria.productId) return false;
    if (criteria.productName && 
        (!order.product.name || !order.product.name.toLowerCase().includes(criteria.productName.toLowerCase()))) return false;
    
    // Filtrar por valor del pedido
    if (criteria.minTotal && order.payment.total < criteria.minTotal) return false;
    if (criteria.maxTotal && order.payment.total > criteria.maxTotal) return false;
    
    // Filtrar por quién atendió
    if (criteria.attendedBy && (!order.attendedBy || !order.attendedBy.toLowerCase().includes(criteria.attendedBy.toLowerCase()))) return false;
    
    return true;
  });
};

// Calcular resumen de ventas con filtros opcionales
export const getSalesSummary = (criteria: OrderSearchCriteria = {}): SalesSummary => {
  const filteredOrders = searchOrders(criteria);
  
  // Inicializar conteo por estado
  const countByStatus = {
    new: 0,
    processing: 0,
    completed: 0,
    cancelled: 0
  };
  
  // Calcular totales
  let totalRevenue = 0;
  let totalProductSales = 0;
  let totalDeliveryCost = 0;
  
  filteredOrders.forEach(order => {
    // Incrementar conteo por estado
    countByStatus[order.status]++;
    
    // Sumar valores monetarios (solo pedidos no cancelados)
    if (order.status !== 'cancelled') {
      totalRevenue += order.payment.total;
      totalProductSales += order.payment.productPrice;
      totalDeliveryCost += order.payment.deliveryCost;
    }
  });
  
  const totalOrders = filteredOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  return {
    totalOrders,
    totalRevenue,
    totalProductSales,
    totalDeliveryCost,
    avgOrderValue,
    countByStatus
  };
};

// Obtener los productos más vendidos
export const getTopProducts = (
  limit: number = 5, 
  criteria: OrderSearchCriteria = {}
): TopProduct[] => {
  const filteredOrders = searchOrders(criteria);
  
  // Crear mapa de frecuencia de productos
  const productMap: Record<string, TopProduct> = {};
  
  filteredOrders.forEach(order => {
    // Solo contar pedidos completados o en proceso
    if (order.status === 'cancelled') return;
    
    const productId = String(order.product.id); // Convertir a string para usarlo como clave
    if (!productId) return; // Ignorar productos sin ID
    
    if (!productMap[productId]) {
      productMap[productId] = {
        id: order.product.id,
        name: order.product.name,
        count: 0,
        totalRevenue: 0,
        imageUrl: order.product.imageUrl
      };
    }
    
    // Incrementar conteo y sumar ingresos
    productMap[productId].count++;
    productMap[productId].totalRevenue += order.payment.productPrice || 0;
  });
  
  // Convertir a array y ordenar
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.count - a.count || b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
  
  return topProducts;
};

// Obtener volumen de ventas por periodo
export const getSalesByTimePeriod = (
  period: 'daily' | 'weekly' | 'monthly',
  criteria: OrderSearchCriteria = {}
): { period: string, count: number, revenue: number }[] => {
  const filteredOrders = searchOrders(criteria);
  
  // Mapeo para agrupar por periodo
  const periodMap: Record<string, { count: number, revenue: number }> = {};
  
  filteredOrders.forEach(order => {
    // Ignorar pedidos cancelados
    if (order.status === 'cancelled') return;
    
    // Obtener fecha del pedido
    const orderDate = new Date(order.timestamp);
    let periodKey: string;
    
    switch (period) {
      case 'daily':
        // Formato: YYYY-MM-DD
        periodKey = orderDate.toISOString().split('T')[0];
        break;
      case 'weekly':
        // Obtener el primer día de la semana (lunes)
        const day = orderDate.getDay() || 7; // Convertir domingo (0) a 7
        const mondayDate = new Date(orderDate);
        mondayDate.setDate(mondayDate.getDate() - day + 1);
        periodKey = mondayDate.toISOString().split('T')[0];
        break;
      case 'monthly':
        // Formato: YYYY-MM
        periodKey = orderDate.toISOString().substr(0, 7);
        break;
    }
    
    if (!periodMap[periodKey]) {
      periodMap[periodKey] = { count: 0, revenue: 0 };
    }
    
    periodMap[periodKey].count++;
    periodMap[periodKey].revenue += order.payment.total;
  });
  
  // Convertir a array y ordenar por periodo
  return Object.entries(periodMap)
    .map(([period, data]) => ({ 
      period, 
      count: data.count, 
      revenue: data.revenue 
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
};

// Obtener todos los pedidos con filtros básicos (para compatibilidad)
export const getOrders = (filters?: {
  status?: Order['status'];
  fromDate?: number;
  toDate?: number;
}): Order[] => {
  return searchOrders(filters || {});
};