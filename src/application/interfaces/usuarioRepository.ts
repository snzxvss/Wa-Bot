import { Usuario, UsuarioCreation, UsuarioUpdate } from '../../domain/usuario';

export interface UsuarioRepository {
  findAll(): Promise<Usuario[]>;
  findById(id: number): Promise<Usuario | null>;
  findByEmail(email: string): Promise<Usuario | null>;
  create(usuario: UsuarioCreation): Promise<Usuario>;
  update(id: number, usuario: UsuarioUpdate): Promise<Usuario | null>;
  delete(id: number): Promise<boolean>;
}
