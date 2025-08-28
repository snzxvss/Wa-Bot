import { Cliente, ClienteCreation, ClienteUpdate } from '../../domain/cliente';
import { ClienteRepository } from '../interfaces/clienteRepository';

export class ClienteService {
  constructor(private clienteRepository: ClienteRepository) {}

  async findAll(): Promise<Cliente[]> {
    return await this.clienteRepository.findAll();
  }

  async findById(id: number): Promise<Cliente | null> {
    return await this.clienteRepository.findById(id);
  }

  async findByTelefono(telefono: string): Promise<Cliente | null> {
    return await this.clienteRepository.findByTelefono(telefono);
  }

  async create(clienteData: ClienteCreation): Promise<Cliente> {
    // Verificar que no exista un cliente con el mismo teléfono
    const existingCliente = await this.clienteRepository.findByTelefono(clienteData.telefono);
    if (existingCliente) {
      throw new Error('Ya existe un cliente con ese número de teléfono');
    }

    return await this.clienteRepository.create(clienteData);
  }

  async update(id: number, clienteData: ClienteUpdate): Promise<Cliente | null> {
    // Si se está actualizando el teléfono, verificar que no exista otro con el mismo
    if (clienteData.telefono) {
      const existingCliente = await this.clienteRepository.findByTelefono(clienteData.telefono);
      if (existingCliente && existingCliente.id !== id) {
        throw new Error('Ya existe un cliente con ese número de teléfono');
      }
    }

    return await this.clienteRepository.update(id, clienteData);
  }

  async delete(id: number): Promise<boolean> {
    return await this.clienteRepository.delete(id);
  }

  async findOrCreateByTelefono(telefono: string, nombre?: string): Promise<Cliente> {
    let cliente = await this.clienteRepository.findByTelefono(telefono);
    
    if (!cliente) {
      cliente = await this.clienteRepository.create({
        nombre: nombre || `Cliente ${telefono}`,
        telefono
      });
    }

    return cliente;
  }
}
