export interface PedidoItem {
  productoId: number;
  cantidad: number;
  precio: number;
}

export interface Pedido {
  id: number;
  clienteId: number;
  items: PedidoItem[];
  montoTotal: number;
  estado: 'PENDIENTE' | 'CONFIRMADO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';
  fechaPedido: Date;
  fechaActualizacion: Date;
}

export interface PedidoCreation {
  clienteId: number;
  items: PedidoItem[];
  montoTotal: number;
}

export interface PedidoUpdate {
  estado?: 'PENDIENTE' | 'CONFIRMADO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';
}
