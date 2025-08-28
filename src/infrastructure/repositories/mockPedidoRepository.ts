import { Pedido, PedidoCreation, PedidoUpdate } from '../../domain/pedido';
import { PedidoRepository } from '../../application/interfaces/pedidoRepository';

// Implementación mock temporal - reemplazar con MySQL cuando esté listo
export class MockPedidoRepository implements PedidoRepository {
  private pedidos: Pedido[] = [];
  private nextId = 1;

  async findAll(): Promise<Pedido[]> {
    return this.pedidos;
  }

  async findById(id: number): Promise<Pedido | null> {
    return this.pedidos.find(p => p.id === id) || null;
  }

  async findByCliente(clienteId: number): Promise<Pedido[]> {
    return this.pedidos.filter(p => p.clienteId === clienteId);
  }

  async findByEstado(estado: string): Promise<Pedido[]> {
    return this.pedidos.filter(p => p.estado === estado);
  }

  async create(pedido: PedidoCreation): Promise<Pedido> {
    const newPedido: Pedido = {
      id: this.nextId++,
      ...pedido,
      estado: 'PENDIENTE',
      fechaPedido: new Date(),
      fechaActualizacion: new Date()
    };
    
    this.pedidos.push(newPedido);
    return newPedido;
  }

  async update(id: number, pedido: PedidoUpdate): Promise<Pedido | null> {
    const index = this.pedidos.findIndex(p => p.id === id);
    if (index === -1) return null;

    this.pedidos[index] = { 
      ...this.pedidos[index], 
      ...pedido,
      fechaActualizacion: new Date()
    };
    return this.pedidos[index];
  }

  async delete(id: number): Promise<boolean> {
    const index = this.pedidos.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.pedidos.splice(index, 1);
    return true;
  }
}
