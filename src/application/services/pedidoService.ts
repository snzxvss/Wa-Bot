import { Pedido, PedidoCreation, PedidoUpdate, PedidoItem } from '../../domain/pedido';
import { PedidoRepository } from '../interfaces/pedidoRepository';
import { ProductoRepository } from '../interfaces/productoRepository';
import { InventarioRepository } from '../interfaces/inventarioRepository';

export class PedidoService {
  constructor(
    private pedidoRepository: PedidoRepository,
    private productoRepository: ProductoRepository,
    private inventarioRepository?: InventarioRepository // Hacer opcional por ahora
  ) {}

  async findAll(): Promise<Pedido[]> {
    return await this.pedidoRepository.findAll();
  }

  async findById(id: number): Promise<Pedido | null> {
    return await this.pedidoRepository.findById(id);
  }

  async findByCliente(clienteId: number): Promise<Pedido[]> {
    return await this.pedidoRepository.findByCliente(clienteId);
  }

  async findByEstado(estado: string): Promise<Pedido[]> {
    return await this.pedidoRepository.findByEstado(estado);
  }

  async create(pedidoData: PedidoCreation): Promise<Pedido> {
    // Validar que todos los productos existen y calcular el total
    let montoTotal = 0;
    
    for (const item of pedidoData.items) {
      const producto = await this.productoRepository.findById(item.productoId);
      if (!producto || !producto.activo) {
        throw new Error(`Producto con ID ${item.productoId} no encontrado o inactivo`);
      }
      
      // Verificar stock disponible (solo si hay repositorio de inventario)
      if (this.inventarioRepository) {
        const inventarios = await this.inventarioRepository.findByProducto(item.productoId);
        const stockTotal = inventarios.reduce((total, inv) => total + inv.cantidad, 0);
        
        if (stockTotal < item.cantidad) {
          throw new Error(`Stock insuficiente para ${producto.nombre}. Disponible: ${stockTotal}, Solicitado: ${item.cantidad}`);
        }
      }
      
      montoTotal += item.precio * item.cantidad;
    }

    const pedido: PedidoCreation = {
      ...pedidoData,
      montoTotal
    };

    return await this.pedidoRepository.create(pedido);
  }

  async update(id: number, pedidoData: PedidoUpdate): Promise<Pedido | null> {
    return await this.pedidoRepository.update(id, pedidoData);
  }

  async delete(id: number): Promise<boolean> {
    return await this.pedidoRepository.delete(id);
  }

  async confirmarPedido(id: number): Promise<Pedido | null> {
    return await this.pedidoRepository.update(id, { estado: 'CONFIRMADO' });
  }

  async cancelarPedido(id: number): Promise<Pedido | null> {
    return await this.pedidoRepository.update(id, { estado: 'CANCELADO' });
  }

  async marcarComoEnviado(id: number): Promise<Pedido | null> {
    return await this.pedidoRepository.update(id, { estado: 'ENVIADO' });
  }

  async marcarComoEntregado(id: number): Promise<Pedido | null> {
    return await this.pedidoRepository.update(id, { estado: 'ENTREGADO' });
  }
}
