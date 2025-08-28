import { LLMProvider, Mensaje, LLMResponse } from '../interfaces/llmProvider';
import { ClienteService } from './clienteService';
import { ProductoService } from './productoService';
import { PedidoService } from './pedidoService';

export class IAService {
  private conversaciones: Map<string, Mensaje[]> = new Map();

  constructor(
    private llmProvider: LLMProvider,
    private clienteService: ClienteService,
    private productoService: ProductoService,
    private pedidoService: PedidoService
  ) {}

  async procesarMensaje(
    telefono: string, 
    mensaje: string, 
    clienteNombre?: string
  ): Promise<string> {
    try {
      console.log('🔍 [IA] Analizando intención del mensaje:', mensaje);
      
      // Obtener o crear cliente
      const cliente = await this.clienteService.findOrCreateByTelefono(telefono, clienteNombre);
      
      // Obtener historial de conversación
      const historial = this.conversaciones.get(telefono) || [];
      
      // Agregar mensaje del usuario al historial
      const mensajeUsuario: Mensaje = {
        rol: 'usuario',
        contenido: mensaje,
        timestamp: new Date()
      };
      
      historial.push(mensajeUsuario);

      // PASO 1: Analizar intención del usuario
      const intencion = await this.analizarIntencion(mensaje, historial);
      console.log('🎯 [IA] Intención detectada:', intencion);

      // PASO 2: Ejecutar acciones según la intención y obtener datos reales
      const datosReales = await this.ejecutarAccion(intencion, telefono, mensaje);
      console.log('📊 [IA] Datos reales obtenidos:', datosReales);

      // PASO 3: Generar respuesta final con los datos reales
      const respuestaFinal = await this.generarRespuestaConDatos(
        cliente.nombre, 
        mensaje, 
        historial, 
        intencion, 
        datosReales
      );

      // Agregar respuesta del asistente al historial
      const mensajeAsistente: Mensaje = {
        rol: 'asistente',
        contenido: respuestaFinal,
        timestamp: new Date()
      };

      historial.push(mensajeAsistente);

      // Actualizar historial (mantener solo los últimos 10 mensajes)
      if (historial.length > 20) {
        historial.splice(0, historial.length - 20);
      }

      this.conversaciones.set(telefono, historial);

      return respuestaFinal;

    } catch (error) {
      console.error('Error procesando mensaje:', error);
      return 'Lo siento, ha ocurrido un error procesando tu mensaje. Por favor, intenta nuevamente.';
    }
  }

  async buscarProductos(query: string): Promise<string> {
    try {
      const productos = await this.productoService.searchProducts(query);
      
      if (productos.length === 0) {
        return `No encontré productos relacionados con "${query}".`;
      }

      let respuesta = `Encontré ${productos.length} producto(s) relacionado(s) con "${query}":\n\n`;
      
      productos.slice(0, 5).forEach((producto, index) => {
        respuesta += `${index + 1}. *${producto.nombre}*\n`;
        if (producto.descripcion) {
          respuesta += `   ${producto.descripcion}\n`;
        }
        respuesta += `   Precio: $${producto.precio.toLocaleString()}\n\n`;
      });

      if (productos.length > 5) {
        respuesta += `... y ${productos.length - 5} más. Puedes ser más específico para ver otros productos.`;
      }

      return respuesta;

    } catch (error) {
      console.error('Error buscando productos:', error);
      return 'Error al buscar productos. Por favor, intenta nuevamente.';
    }
  }

  async consultarPedidos(telefono: string): Promise<string> {
    try {
      const cliente = await this.clienteService.findByTelefono(telefono);
      
      if (!cliente) {
        return 'No tienes pedidos registrados aún.';
      }

      const pedidos = await this.pedidoService.findByCliente(cliente.id);
      
      if (pedidos.length === 0) {
        return 'No tienes pedidos registrados aún.';
      }

      let respuesta = `Tienes ${pedidos.length} pedido(s):\n\n`;
      
      pedidos.slice(0, 3).forEach((pedido, index) => {
        respuesta += `${index + 1}. Pedido #${pedido.id}\n`;
        respuesta += `   Estado: ${pedido.estado}\n`;
        respuesta += `   Total: $${pedido.montoTotal.toLocaleString()}\n`;
        respuesta += `   Fecha: ${pedido.fechaPedido.toLocaleDateString()}\n\n`;
      });

      if (pedidos.length > 3) {
        respuesta += `... y ${pedidos.length - 3} pedidos más.`;
      }

      return respuesta;

    } catch (error) {
      console.error('Error consultando pedidos:', error);
      return 'Error al consultar tus pedidos. Por favor, intenta nuevamente.';
    }
  }

  private async buildSystemContext(clienteNombre: string): Promise<string> {
    try {
      // Obtener productos disponibles (máximo 10 para no sobrecargar el contexto)
      const productosDisponibles = await this.productoService.findAll().then(productos => 
        productos.slice(0, 10)
      );

      let contextoProdutos = '';
      if (productosDisponibles.length > 0) {
        contextoProdutos = '\n\n**PRODUCTOS DISPONIBLES:**\n';
        productosDisponibles.forEach((producto, index) => {
          contextoProdutos += `${index + 1}. ${producto.nombre} - $${producto.precio.toLocaleString()}`;
          if (producto.descripcion) {
            contextoProdutos += ` (${producto.descripcion})`;
          }
          contextoProdutos += `\n`;
        });
        contextoProdutos += '\n**IMPORTANTE:** Solo menciona estos productos que realmente tenemos disponibles. No inventes productos que no están en esta lista.';
      } else {
        contextoProdutos = '\n\n**NOTA:** Actualmente no hay productos cargados en el sistema. Informa al cliente que se están actualizando los productos y que consulte más tarde.';
      }

      return `Eres un asistente virtual de ventas para ${process.env.NAMEBUSINESS || 'nuestra tienda'}. 
Tu nombre es WaBot y estás aquí para ayudar a ${clienteNombre} con:

1. Consultas sobre productos (precios, disponibilidad, características)
2. Búsqueda de productos específicos
3. Información sobre pedidos existentes
4. Proceso de compra y pedidos
5. Información general de la tienda

${contextoProdutos}

Instrucciones IMPORTANTES:
- Sé amable, profesional y servicial
- Responde de manera concisa pero completa
- SOLO menciona productos que están en la lista de productos disponibles
- Si te preguntan por productos que no están en la lista, explica que no los tenemos disponibles
- Para búsquedas de productos, usa SOLAMENTE los productos de la lista anterior
- Si el usuario quiere hacer un pedido, explica el proceso paso a paso
- Usa emojis moderadamente para hacer las respuestas más amigables
- Si no tienes información específica, ofrece alternativas o sugiere contactar soporte

Información de contacto:
- Número de pagos: ${process.env.PAYMENT_NUMBER || 'No configurado'}

Responde siempre en español y mantén un tono conversacional amigable.`;
    } catch (error) {
      console.error('Error obteniendo contexto del sistema:', error);
      
      return `Eres un asistente virtual de ventas para ${process.env.NAMEBUSINESS || 'nuestra tienda'}. 
Tu nombre es WaBot y estás aquí para ayudar a ${clienteNombre}.

Instrucciones:
- No inventes productos o información que no tienes

Número de contacto: ${process.env.PAYMENT_NUMBER || 'No configurado'}
Responde siempre en español y mantén un tono conversacional amigable.`;
    }
  }

  limpiarConversacion(telefono: string): void {
    this.conversaciones.delete(telefono);
  }

  async verificarSaludLLM(): Promise<boolean> {
    try {
      return await this.llmProvider.isHealthy();
    } catch (error) {
      console.error('Error verificando salud del LLM:', error);
      return false;
    }
  }

  // PASO 1: Analizar intención del usuario
  private async analizarIntencion(mensaje: string, historial: Mensaje[]): Promise<string> {
    try {
      // Contexto del historial reciente
      const historialTexto = historial.slice(-4).map(m => `${m.rol}: ${m.contenido}`).join('\n');

      const prompt = `Eres un experto analizando intenciones de clientes en una tienda virtual.

CONTEXTO DE LA CONVERSACIÓN:
${historialTexto}

MENSAJE ACTUAL: "${mensaje}"

Analiza la intención del cliente considerando tanto el mensaje actual como el contexto de la conversación.

INTENCIONES POSIBLES:
- CONSULTAR_PRODUCTOS: Quiere ver productos, catálogo, qué hay disponible (ejemplos: "productos", "qué tienes", "catálogo", "disponible", "mostrar productos")
- BUSCAR_PRODUCTO: Busca algo específico (ejemplos: "camiseta", "zapatos", "busco X")
- CONSULTAR_PEDIDOS: Pregunta por sus pedidos (ejemplos: "mis pedidos", "estado pedido")
- HACER_PEDIDO: Quiere comprar (ejemplos: "comprar", "quiero X", "precio de")
- SALUDO: Saludo o despedida (ejemplos: "hola", "buenos días", "gracias")
- INFORMACION: Info de la tienda (ejemplos: "horarios", "contacto", "ubicación")

REGLAS:
- Si dice "productos", "disponible", "tienes", "catálogo" → CONSULTAR_PRODUCTOS
- Si menciona un producto específico → BUSCAR_PRODUCTO  
- Si es saludo/despedida → SALUDO
- Para pedidos/compras → CONSULTAR_PEDIDOS o HACER_PEDIDO
- Para info de tienda → INFORMACION

Responde SOLO la intención:`;

      const respuesta = await this.llmProvider.generateResponse([{
        rol: 'usuario',
        contenido: prompt,
        timestamp: new Date()
      }]);

      const intencion = respuesta.contenido.trim().toUpperCase().replace(/[^A-Z_]/g, '');
      console.log(`🎯 [IA] Intención procesada: "${intencion}"`);
      return intencion;
    } catch (error) {
      console.error('Error analizando intención:', error);
      return 'CONSULTAR_PRODUCTOS'; // Default seguro
    }
  }

  // PASO 2: Ejecutar acciones según la intención
  private async ejecutarAccion(intencion: string, telefono: string, mensaje: string): Promise<any> {
    console.log(`🔧 [IA] Ejecutando acción para intención: ${intencion}`);
    
    try {
      // Mapear intenciones similares
      if (intencion.includes('CONSULTAR') && intencion.includes('PRODUCTO')) {
        intencion = 'CONSULTAR_PRODUCTOS';
      } else if (intencion.includes('PRODUCTO') || intencion.includes('CATALOG')) {
        intencion = 'CONSULTAR_PRODUCTOS';
      }

      switch (intencion) {
        case 'CONSULTAR_PRODUCTOS':
          const todosProductos = await this.productoService.findAll();
          console.log(`📦 [IA] Productos encontrados: ${todosProductos.length}`);
          return {
            tipo: 'productos',
            productos: todosProductos,
            mensaje: `Se encontraron ${todosProductos.length} productos en total`
          };

        case 'BUSCAR_PRODUCTO':
          const terminosBusqueda = this.extraerTerminosBusqueda(mensaje);
          const productosEncontrados = await this.productoService.searchProducts(terminosBusqueda);
          console.log(`🔍 [IA] Búsqueda "${terminosBusqueda}": ${productosEncontrados.length} productos`);
          return {
            tipo: 'busqueda',
            productos: productosEncontrados,
            terminos: terminosBusqueda,
            mensaje: `Búsqueda: "${terminosBusqueda}" - ${productosEncontrados.length} productos encontrados`
          };

        case 'CONSULTAR_PEDIDOS':
          const cliente = await this.clienteService.findByTelefono(telefono);
          if (!cliente) {
            return {
              tipo: 'pedidos',
              pedidos: [],
              mensaje: 'Cliente no encontrado'
            };
          }
          const pedidos = await this.pedidoService.findByCliente(cliente.id);
          return {
            tipo: 'pedidos',
            pedidos: pedidos,
            mensaje: `Se encontraron ${pedidos.length} pedidos`
          };

        case 'HACER_PEDIDO':
          return {
            tipo: 'proceso_pedido',
            mensaje: 'Iniciando proceso de pedido'
          };

        case 'INFORMACION':
          return {
            tipo: 'informacion',
            info: {
              nombre: process.env.NAMEBUSINESS || 'Nuestra tienda',
              telefono: process.env.PAYMENT_NUMBER || 'No configurado',
              horarios: 'Lunes a Viernes 9:00 AM - 6:00 PM'
            },
            mensaje: 'Información general de la tienda'
          };

        case 'SALUDO':
          return {
            tipo: 'saludo',
            mensaje: 'Saludo o conversación general'
          };

        default:
          // Si no coincide con nada, asumir que quiere ver productos
          console.log(`⚠️  [IA] Intención desconocida "${intencion}", asumiendo CONSULTAR_PRODUCTOS`);
          const productosDefault = await this.productoService.findAll();
          return {
            tipo: 'productos',
            productos: productosDefault,
            mensaje: `Mostrando productos disponibles (intención: ${intencion})`
          };
      }
    } catch (error) {
      console.error('Error ejecutando acción:', error);
      return {
        tipo: 'error',
        mensaje: 'Error al procesar la consulta'
      };
    }
  }

  // PASO 3: Generar respuesta final con datos reales
  private async generarRespuestaConDatos(
    clienteNombre: string,
    mensajeOriginal: string,
    historial: Mensaje[],
    intencion: string,
    datosReales: any
  ): Promise<string> {
    try {
      let contextoDatos = '';
      let tipoRespuesta = 'general';
      
      switch (datosReales.tipo) {
        case 'productos':
          tipoRespuesta = 'productos';
          if (datosReales.productos.length > 0) {
            contextoDatos = 'PRODUCTOS DISPONIBLES:\n';
            datosReales.productos.forEach((producto: any, index: number) => {
              contextoDatos += `${index + 1}. ${producto.nombre} - $${producto.precio.toLocaleString()}`;
              if (producto.descripcion) {
                contextoDatos += ` (${producto.descripcion})`;
              }
              contextoDatos += '\n';
            });
          } else {
            contextoDatos = 'No hay productos disponibles.';
          }
          break;

        case 'busqueda':
          tipoRespuesta = 'busqueda';
          if (datosReales.productos.length > 0) {
            contextoDatos = `RESULTADOS PARA "${datosReales.terminos}":\n`;
            datosReales.productos.forEach((producto: any, index: number) => {
              contextoDatos += `${index + 1}. ${producto.nombre} - $${producto.precio.toLocaleString()}`;
              if (producto.descripcion) {
                contextoDatos += ` (${producto.descripcion})`;
              }
              contextoDatos += '\n';
            });
          } else {
            contextoDatos = `No se encontraron productos para "${datosReales.terminos}".`;
          }
          break;

        case 'saludo':
          tipoRespuesta = 'saludo';
          contextoDatos = 'Es un saludo inicial o conversación amigable.';
          break;

        default:
          contextoDatos = 'Sin datos específicos disponibles.';
      }

      // Contexto del historial para mantener continuidad
      const historialReciente = historial.slice(-3).map(m => `${m.rol}: ${m.contenido}`).join('\n');

      const prompt = `Eres WaBot de ${process.env.NAMEBUSINESS || 'Mi Tienda'}. Responde de forma BREVE y NATURAL.

HISTORIAL RECIENTE:
${historialReciente}

MENSAJE ACTUAL: "${mensajeOriginal}"
INTENCIÓN: ${intencion}
TIPO DE RESPUESTA: ${tipoRespuesta}

DATOS REALES:
${contextoDatos}

INSTRUCCIONES CRÍTICAS:
- Respuesta MUY BREVE (máximo 2-3 líneas)
- USA SOLO los datos reales proporcionados
- NO inventes productos o información
- Mantén continuidad con la conversación
- Sé natural y amigable
- Si es saludo, saluda brevemente
- Si pide productos, muestra los productos reales disponibles
- Si no hay datos, di que no hay información disponible

Respuesta breve:`;

      const respuesta = await this.llmProvider.generateResponse([{
        rol: 'usuario',
        contenido: prompt,
        timestamp: new Date()
      }]);

      let respuestaFinal = respuesta.contenido.trim();
      
      // Asegurar que las respuestas de productos sean breves y útiles
      if (tipoRespuesta === 'productos' && datosReales.productos.length > 0) {
        const productosResumen = datosReales.productos.slice(0, 3).map((p: any) => 
          `• ${p.nombre} - $${p.precio.toLocaleString()}`
        ).join('\n');
        
        if (respuestaFinal.length > 200) {
          respuestaFinal = `Tenemos ${datosReales.productos.length} productos disponibles:\n\n${productosResumen}`;
          if (datosReales.productos.length > 3) {
            respuestaFinal += `\n... y ${datosReales.productos.length - 3} más. ¿Te interesa alguno?`;
          }
        }
      }

      return respuestaFinal;

    } catch (error) {
      console.error('Error generando respuesta con datos:', error);
      return 'Disculpa, hubo un error. ¿Puedes intentar de nuevo?';
    }
  }

  // Método auxiliar para extraer términos de búsqueda
  private extraerTerminosBusqueda(mensaje: string): string {
    // Remover palabras comunes y extraer términos relevantes
    const palabrasComunes = ['qué', 'que', 'hay', 'tienes', 'tienen', 'disponible', 'productos', 'producto', 'busco', 'quiero', 'necesito', 'me', 'interesa'];
    const palabras = mensaje.toLowerCase().split(' ');
    const terminosRelevantes = palabras.filter(palabra => 
      palabra.length > 2 && !palabrasComunes.includes(palabra)
    );
    return terminosRelevantes.join(' ') || mensaje;
  }
}
