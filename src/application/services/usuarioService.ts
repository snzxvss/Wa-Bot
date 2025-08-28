import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Usuario, UsuarioCreation, UsuarioUpdate } from '../../domain/usuario';
import { UsuarioRepository } from '../interfaces/usuarioRepository';

export class UsuarioService {
  constructor(private usuarioRepository: UsuarioRepository) {}

  async findAll(): Promise<Usuario[]> {
    return await this.usuarioRepository.findAll();
  }

  async findById(id: number): Promise<Usuario | null> {
    return await this.usuarioRepository.findById(id);
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    return await this.usuarioRepository.findByEmail(email);
  }

  async create(usuarioData: UsuarioCreation): Promise<Usuario> {
    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(usuarioData.password, 10);
    
    const usuario: UsuarioCreation = {
      ...usuarioData,
      password: hashedPassword
    };

    return await this.usuarioRepository.create(usuario);
  }

  async update(id: number, usuarioData: UsuarioUpdate): Promise<Usuario | null> {
    // Si se está actualizando la contraseña, hacer hash
    if (usuarioData.password) {
      usuarioData.password = await bcrypt.hash(usuarioData.password, 10);
    }

    return await this.usuarioRepository.update(id, usuarioData);
  }

  async delete(id: number): Promise<boolean> {
    return await this.usuarioRepository.delete(id);
  }

  async login(email: string, password: string): Promise<{ token: string; usuario: Omit<Usuario, 'password'> } | null> {
    const usuario = await this.usuarioRepository.findByEmail(email);
    
    if (!usuario || !usuario.activo) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, usuario.password);
    
    if (!isValidPassword) {
      return null;
    }

    const token = jwt.sign(
      { 
        id: usuario.id, 
        email: usuario.email, 
        permisoId: usuario.permisoId 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    const { password: _, ...usuarioSinPassword } = usuario;

    return {
      token,
      usuario: usuarioSinPassword
    };
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    } catch (error) {
      return null;
    }
  }
}
