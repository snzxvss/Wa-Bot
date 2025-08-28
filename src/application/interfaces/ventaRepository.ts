import { Venta, VentaCreation } from '../../domain/venta';

export interface VentaRepository {
  findAll(): Promise<Venta[]>;
  findById(id: number): Promise<Venta | null>;
  findByCliente(clienteId: number): Promise<Venta[]>;
  findByPedido(pedidoId: number): Promise<Venta | null>;
  findByFecha(fechaInicio: Date, fechaFin: Date): Promise<Venta[]>;
  create(venta: VentaCreation): Promise<Venta>;
  delete(id: number): Promise<boolean>;
}
