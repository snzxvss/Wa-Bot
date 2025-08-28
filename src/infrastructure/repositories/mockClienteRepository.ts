import { Cliente, ClienteCreation, ClienteUpdate } from '../../domain/cliente';
import { ClienteRepository } from '../../application/interfaces/clienteRepository';

// Implementación mock temporal - reemplazar con MySQL cuando esté listo
export class MockClienteRepository implements ClienteRepository {
  private clientes: Cliente[] = [];
  private nextId = 1;

  async findAll(): Promise<Cliente[]> {
    return this.clientes.filter(c => c.activo);
  }

  async findById(id: number): Promise<Cliente | null> {
    return this.clientes.find(c => c.id === id && c.activo) || null;
  }

  async findByTelefono(telefono: string): Promise<Cliente | null> {
    return this.clientes.find(c => c.telefono === telefono && c.activo) || null;
  }

  async create(cliente: ClienteCreation): Promise<Cliente> {
    const newCliente: Cliente = {
      id: this.nextId++,
      ...cliente,
      fechaCreacion: new Date(),
      activo: true
    };
    
    this.clientes.push(newCliente);
    return newCliente;
  }

  async update(id: number, cliente: ClienteUpdate): Promise<Cliente | null> {
    const index = this.clientes.findIndex(c => c.id === id);
    if (index === -1) return null;

    this.clientes[index] = { ...this.clientes[index], ...cliente };
    return this.clientes[index];
  }

  async delete(id: number): Promise<boolean> {
    const index = this.clientes.findIndex(c => c.id === id);
    if (index === -1) return false;

    this.clientes[index].activo = false;
    return true;
  }
}
