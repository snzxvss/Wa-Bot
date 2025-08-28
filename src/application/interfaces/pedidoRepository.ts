import { Pedido, PedidoCreation, PedidoUpdate } from '../../domain/pedido';

export interface PedidoRepository {
  findAll(): Promise<Pedido[]>;
  findById(id: number): Promise<Pedido | null>;
  findByCliente(clienteId: number): Promise<Pedido[]>;
  findByEstado(estado: string): Promise<Pedido[]>;
  create(pedido: PedidoCreation): Promise<Pedido>;
  update(id: number, pedido: PedidoUpdate): Promise<Pedido | null>;
  delete(id: number): Promise<boolean>;
}
