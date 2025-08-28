export interface VentaItem {
  productoId: number;
  cantidad: number;
  precio: number;
  subtotal: number;
}

export interface Venta {
  id: number;
  pedidoId: number;
  clienteId: number;
  items: VentaItem[];
  montoTotal: number;
  metodoPago?: string;
  referenciaPago?: string;
  fechaVenta: Date;
}

export interface VentaCreation {
  pedidoId: number;
  clienteId: number;
  items: VentaItem[];
  montoTotal: number;
  metodoPago?: string;
  referenciaPago?: string;
}
