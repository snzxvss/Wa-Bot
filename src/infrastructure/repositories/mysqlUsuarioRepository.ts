import { Usuario, UsuarioCreation, UsuarioUpdate } from '../../domain/usuario';
import { UsuarioRepository } from '../../application/interfaces/usuarioRepository';
import { AppDataSource } from '../../config/db';

export class MySQLUsuarioRepository implements UsuarioRepository {
  private connection = AppDataSource;

  async findAll(): Promise<Usuario[]> {
    try {
      const query = `
        SELECT u.*, p.nombre as permisoNombre 
        FROM usuarios u 
        LEFT JOIN permisos p ON u.permisoId = p.id 
        WHERE u.activo = true
        ORDER BY u.fechaCreacion DESC
      `;
      
      const result = await this.connection.query(query);
      return result;
    } catch (error) {
      throw new Error(`Error obteniendo usuarios: ${error}`);
    }
  }

  async findById(id: number): Promise<Usuario | null> {
    try {
      const query = `
        SELECT u.*, p.nombre as permisoNombre 
        FROM usuarios u 
        LEFT JOIN permisos p ON u.permisoId = p.id 
        WHERE u.id = ? AND u.activo = true
      `;
      
      const result = await this.connection.query(query, [id]);
      return result[0] || null;
    } catch (error) {
      throw new Error(`Error obteniendo usuario por ID: ${error}`);
    }
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    try {
      const query = `
        SELECT u.*, p.nombre as permisoNombre 
        FROM usuarios u 
        LEFT JOIN permisos p ON u.permisoId = p.id 
        WHERE u.email = ? AND u.activo = true
      `;
      
      const result = await this.connection.query(query, [email]);
      return result[0] || null;
    } catch (error) {
      throw new Error(`Error obteniendo usuario por email: ${error}`);
    }
  }

  async create(usuario: UsuarioCreation): Promise<Usuario> {
    try {
      const query = `
        INSERT INTO usuarios (nombre, email, password, permisoId, fechaCreacion, activo)
        VALUES (?, ?, ?, ?, NOW(), true)
      `;
      
      const result = await this.connection.query(query, [
        usuario.nombre,
        usuario.email,
        usuario.password,
        usuario.permisoId
      ]);
      
      const insertId = (result as any).insertId;
      const newUsuario = await this.findById(insertId);
      
      if (!newUsuario) {
        throw new Error('Error creando usuario');
      }
      
      return newUsuario;
    } catch (error) {
      throw new Error(`Error creando usuario: ${error}`);
    }
  }

  async update(id: number, usuario: UsuarioUpdate): Promise<Usuario | null> {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];

      if (usuario.nombre !== undefined) {
        setClauses.push('nombre = ?');
        values.push(usuario.nombre);
      }
      
      if (usuario.email !== undefined) {
        setClauses.push('email = ?');
        values.push(usuario.email);
      }
      
      if (usuario.password !== undefined) {
        setClauses.push('password = ?');
        values.push(usuario.password);
      }
      
      if (usuario.permisoId !== undefined) {
        setClauses.push('permisoId = ?');
        values.push(usuario.permisoId);
      }
      
      if (usuario.activo !== undefined) {
        setClauses.push('activo = ?');
        values.push(usuario.activo);
      }

      if (setClauses.length === 0) {
        return await this.findById(id);
      }

      values.push(id);

      const query = `
        UPDATE usuarios 
        SET ${setClauses.join(', ')} 
        WHERE id = ?
      `;
      
      await this.connection.query(query, values);
      return await this.findById(id);
    } catch (error) {
      throw new Error(`Error actualizando usuario: ${error}`);
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const query = 'UPDATE usuarios SET activo = false WHERE id = ?';
      const result = await this.connection.query(query, [id]);
      return (result as any).affectedRows > 0;
    } catch (error) {
      throw new Error(`Error eliminando usuario: ${error}`);
    }
  }
}
