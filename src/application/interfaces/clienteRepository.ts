import { Cliente, ClienteCreation, ClienteUpdate } from '../../domain/cliente';

export interface ClienteRepository {
  findAll(): Promise<Cliente[]>;
  findById(id: number): Promise<Cliente | null>;
  findByTelefono(telefono: string): Promise<Cliente | null>;
  create(cliente: ClienteCreation): Promise<Cliente>;
  update(id: number, cliente: ClienteUpdate): Promise<Cliente | null>;
  delete(id: number): Promise<boolean>;
}
