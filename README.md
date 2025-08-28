# Wa-Bot - WhatsApp Business Bot con Arquitectura Limpia

Un bot de WhatsApp empresarial desarrollado con TypeScript que implementa **Arquitectura Limpia/Hexagonal** e integración con modelos de Inteligencia Artificial (OpenAI/Gemini).

## 🏗️ Arquitectura del Proyecto

### Arquitectura Limpia (Clean/Hexagonal Architecture)

El proyecto sigue los principios de la Arquitectura Limpia, separando el código en capas independientes:

1. **Capa de Dominio** (`src/domain/`): Entidades del negocio y reglas de dominio
2. **Capa de Aplicación** (`src/application/`): Casos de uso, servicios e interfaces  
3. **Capa de Infraestructura** (`src/infrastructure/`): Adaptadores externos, controladores, repositorios
4. **Capa de Configuración** (`src/config/`): Configuraciones de frameworks y herramientas

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- MySQL 8.0+
- Cuenta de OpenAI o Google (para IA)

### Instalación

1. **Instalar dependencias**
```bash
npm install
```

2. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

3. **Configurar base de datos**
```bash
mysql -u root -p < database/setup.sql
```

4. **Ejecutar en desarrollo**
```bash
npm run dev
```

5. **Ejecutar en producción**
```bash
npm run build
npm start
```

## 🤖 Integración de Inteligencia Artificial

### Proveedores Soportados
- **OpenAI** (GPT-3.5, GPT-4)
- **Google Gemini** (gemini-pro)

### Configuración en .env
```env
OPENAI_API_KEY=tu-api-key-de-openai
GEMINI_API_KEY=tu-api-key-de-gemini
```

## 📱 Funcionalidades del Bot

### Comandos Disponibles
- `/productos [búsqueda]` - Buscar productos
- `/pedidos` - Ver pedidos del cliente  
- `/ayuda` - Mostrar comandos disponibles

### Capacidades de IA
- Conversaciones naturales en español
- Búsqueda inteligente de productos
- Consulta de pedidos
- Asistencia en proceso de compra

## 🌐 API REST

### Health Check
```bash
GET http://localhost:3000/health
```

### Autenticación
```bash
POST http://localhost:3000/api/usuarios/login
```

## 🏗️ Arquitectura Implementada

El proyecto implementa una **Arquitectura Limpia** completa con:

- ✅ Separación en capas independientes
- ✅ Inversión de dependencias  
- ✅ Patrón Repository
- ✅ Servicios de aplicación
- ✅ Proveedores de IA intercambiables
- ✅ Middlewares de autenticación
- ✅ Validación de datos
- ✅ Manejo de errores centralizado
- ✅ Configuración por variables de entorno

## 📊 Modelos de Dominio

- **Usuario**: Cuentas del sistema con roles
- **Cliente**: Información de clientes finales
- **Producto**: Catálogo de productos
- **Inventario**: Stock por bodega
- **Pedido**: Órdenes de venta
- **Venta**: Transacciones completadas

---

**Wa-Bot** - Potenciando negocios con WhatsApp e Inteligencia Artificial 🚀
