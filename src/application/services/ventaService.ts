import { Venta, VentaCreation } from '../../domain/venta';
import { VentaRepository } from '../interfaces/ventaRepository';
import { PedidoService } from './pedidoService';
import { InventarioService } from './inventarioService';

export class VentaService {
  constructor(
    private ventaRepository: VentaRepository,
    private pedidoService: PedidoService,
    private inventarioService: InventarioService
  ) {}

  async findAll(): Promise<Venta[]> {
    return await this.ventaRepository.findAll();
  }

  async findById(id: number): Promise<Venta | null> {
    return await this.ventaRepository.findById(id);
  }

  async findByCliente(clienteId: number): Promise<Venta[]> {
    return await this.ventaRepository.findByCliente(clienteId);
  }

  async findByPedido(pedidoId: number): Promise<Venta | null> {
    return await this.ventaRepository.findByPedido(pedidoId);
  }

  async findByFecha(fechaInicio: Date, fechaFin: Date): Promise<Venta[]> {
    return await this.ventaRepository.findByFecha(fechaInicio, fechaFin);
  }

  async create(ventaData: VentaCreation): Promise<Venta> {
    // Verificar que el pedido existe y está confirmado
    const pedido = await this.pedidoService.findById(ventaData.pedidoId);
    
    if (!pedido) {
      throw new Error('Pedido no encontrado');
    }

    if (pedido.estado !== 'CONFIRMADO') {
      throw new Error('El pedido debe estar confirmado para generar una venta');
    }

    // Verificar que no existe una venta para este pedido
    const existingVenta = await this.ventaRepository.findByPedido(ventaData.pedidoId);
    if (existingVenta) {
      throw new Error('Ya existe una venta para este pedido');
    }

    // Reducir stock de productos (asumiendo bodega principal con ID 1)
    for (const item of ventaData.items) {
      await this.inventarioService.reducirStock(item.productoId, 1, item.cantidad);
    }

    // Crear la venta
    const venta = await this.ventaRepository.create(ventaData);

    // Marcar el pedido como entregado
    await this.pedidoService.marcarComoEntregado(ventaData.pedidoId);

    return venta;
  }

  async delete(id: number): Promise<boolean> {
    // Nota: eliminar una venta es una operación delicada
    // En un sistema real, probablemente solo se marcaría como anulada
    return await this.ventaRepository.delete(id);
  }

  async getVentasPorPeriodo(fechaInicio: Date, fechaFin: Date): Promise<{
    ventas: Venta[];
    totalVentas: number;
    montoTotal: number;
  }> {
    const ventas = await this.findByFecha(fechaInicio, fechaFin);
    
    return {
      ventas,
      totalVentas: ventas.length,
      montoTotal: ventas.reduce((total, venta) => total + venta.montoTotal, 0)
    };
  }

  async getReporteVentas(año: number, mes?: number): Promise<{
    ventasPorMes: { [mes: string]: number };
    montoTotalPorMes: { [mes: string]: number };
    totalAño: number;
  }> {
    const fechaInicio = new Date(año, mes ? mes - 1 : 0, 1);
    const fechaFin = new Date(año, mes ? mes : 12, 0, 23, 59, 59, 999);

    const ventas = await this.findByFecha(fechaInicio, fechaFin);

    const reporte = {
      ventasPorMes: {} as { [mes: string]: number },
      montoTotalPorMes: {} as { [mes: string]: number },
      totalAño: 0
    };

    ventas.forEach(venta => {
      const mesVenta = venta.fechaVenta.getMonth() + 1;
      const mesKey = mesVenta.toString().padStart(2, '0');

      if (!reporte.ventasPorMes[mesKey]) {
        reporte.ventasPorMes[mesKey] = 0;
        reporte.montoTotalPorMes[mesKey] = 0;
      }

      reporte.ventasPorMes[mesKey]++;
      reporte.montoTotalPorMes[mesKey] += venta.montoTotal;
      reporte.totalAño += venta.montoTotal;
    });

    return reporte;
  }
}
