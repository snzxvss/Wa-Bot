import { WASocket } from "baileys";
import { FormattedMessage } from "../utils/message";
import fs from 'fs';
import path from 'path';
import fetchSpreadsheetData from '../services/spreadsheetServices.js';
import dotenv from 'dotenv';
import { logger } from "../utils/logger";
import { loadSessions, saveSessions, normalizeText, delay, sessions } from '../plugins/utils';
import axios from 'axios';
import { createOrder } from '../services/orderService';

dotenv.config();

// Estados de la conversación
type StageType = 'confirmation' | 'payment' | 'product' | 'new';

type FormState = {
  stage: 'basicName' | 'basicId' | 'basicConfirmation' | 'addressBarrio' | 'addressAddress' | 'addressCity' | 'finalConfirmation';
  name?: string;
  idNumber?: string;
  address?: string;
  barrio?: string;
  city?: string;
  deliveryCost?: number;
  mapImagePath?: string;
};

type AwaitingType = {
  [key: string]: boolean | FormState;
};

type ProductDataType = {
  ID?: string | number | null;
  Nombre?: string | null;
  Descripción?: string | null;
  Precio?: number | null;
  Stock?: number | null;
  ImagenURL?: string | null;
};

type SelectedProductType = {
  [key: string]: ProductDataType;
};

type FormData = {
  [key: string]: {
    name?: string;
    idNumber?: string;
    address?: string;
    barrio?: string;
    city?: string;
    deliveryCost?: number;
  };
};

// Declaración global para acceso compartido a las variables
declare global {
  var awaitingConfirmation: AwaitingType;
  var selectedProduct: SelectedProductType;
  var formData: FormData;
  var awaitingPayment: { [key: string]: boolean };
  var awaitingProduct: { [key: string]: boolean };
}

// Inicialización de variables globales
globalThis.awaitingConfirmation = globalThis.awaitingConfirmation || {};
globalThis.selectedProduct = globalThis.selectedProduct || {};
globalThis.formData = globalThis.formData || {};
globalThis.awaitingPayment = globalThis.awaitingPayment || {};
globalThis.awaitingProduct = globalThis.awaitingProduct || {};

// Variables locales para acceso rápido
let awaitingConfirmation = globalThis.awaitingConfirmation;
let selectedProduct = globalThis.selectedProduct;
let formData = globalThis.formData;
let awaitingPayment = globalThis.awaitingPayment;
let awaitingProduct = globalThis.awaitingProduct;
let productsMode = false;

const MessageHandler = async (bot: WASocket, message: FormattedMessage) => {
  // Evitar responder a mensajes del propio bot
  if (message.key.fromMe) {
    return;
  }

  const sender = message.key.remoteJid!;
  let stage: StageType = 'new';

  if (awaitingConfirmation[sender]) stage = 'confirmation';
  else if (awaitingPayment[sender]) stage = 'payment';
  else if (awaitingProduct[sender]) stage = 'product';

  logger.info(`Estado actual para ${sender}: ${stage}`);

  switch (stage) {
    case 'confirmation': {
      const formState = awaitingConfirmation[sender];
      
      if (formState !== true && typeof formState === 'object') {
        if (formState.stage === 'basicName') {
            formState.name = message.content?.trim() || "";
            formState.stage = 'basicId';
            await bot.sendMessage(sender, { text: "Por favor, ingresa tu número de identificación:" });
            return;
        }
        else if (formState.stage === 'basicId') {
            formState.idNumber = message.content?.trim() || "";
            formState.stage = 'basicConfirmation';
            const basicInfo = `• *Nombre:* ${formState.name}\n• *Identificación:* ${formState.idNumber}`;
            await bot.sendMessage(sender, { 
                text: `Confirma tu información básica:\n${basicInfo}\nResponde *si* para confirmar o *no* para reingresar.` 
            });
            return;
        } else if (formState.stage === 'basicConfirmation') {
          if (message.content === 'si' || message.content === 'Si' || message.content === 'SI' || message.content === 'sI') {
            formState.stage = 'addressBarrio';
            await bot.sendMessage(sender, { text: "Por favor, ingresa tu barrio:" });
            return;
          } else if (message.content === 'no' || message.content === 'No' || message.content === 'NO' || message.content === 'nO') {
            formState.stage = 'basicName';
            await bot.sendMessage(sender, { text: "Reiniciemos. Por favor, ingresa tu nombre completo:" });
            return;
          } else {
            await bot.sendMessage(sender, { text: "❌ Por favor responde solo *si* o *no*." });
            return;
          }
        } else if (formState.stage === 'addressBarrio') {
          formState.barrio = message.content?.trim() || "";
          formState.stage = 'addressAddress';
          await bot.sendMessage(sender, { text: "Por favor, ingresa tu dirección completa:" });
          return;
        }  else if (formState.stage === 'addressAddress') {
          formState.address = message.content?.trim() || "";
          formState.stage = 'addressCity';
          await bot.sendMessage(sender, { text: "Por favor, ingresa tu ciudad:" });
          return;
        } else if (formState.stage === 'addressCity') {
          formState.city = message.content?.trim() || "";
          try {
            const response = await axios.post(`${process.env.API_LOCATION}/calculate`, {
              direccion: formState.address,
              barrio: formState.barrio,
              ciudad: formState.city
            }, {
              headers: { 'Content-Type': 'application/json' }
            });
            
            // Axios automáticamente convierte la respuesta JSON
            const result = response.data;
            formState.deliveryCost = result.costo;
            formState.mapImagePath = result.imagen;
            
            // Descargar imagen usando axios
            const imageUrl = process.env.API_LOCATION + result.imagen;
            const resImage = await axios.get(imageUrl, {
              responseType: 'arraybuffer' // Importante: asegura que obtenemos los datos binarios
            });
            
            // El buffer de la imagen está disponible en resImage.data
            const imageBuffer = resImage.data;
            
            await bot.sendMessage(sender, { 
              image: Buffer.from(imageBuffer), 
              caption: "Esta es la ubicación encontrada para tu dirección." 
            });
            
            formState.stage = 'finalConfirmation';
            
            let finalMsg = "_*Por favor confirma que la siguiente información es correcta:*_\n\n";
            finalMsg += `• *Nombre:* ${formState.name}\n`;
            finalMsg += `• *Identificación:* ${formState.idNumber}\n`;
            finalMsg += `• *Barrio:* ${formState.barrio}\n`;
            finalMsg += `• *Dirección:* ${formState.address}\n`;
            finalMsg += `• *Ciudad:* ${formState.city}\n`;
            
            const product = selectedProduct[sender];
            if (product) {
              const formattedPrice = product.Precio
                ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(product.Precio)
                : 'N/A';
              const formattedDelivery = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(result.costo);
              let total = product.Precio ? product.Precio + result.costo : result.costo;
              const formattedTotal = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(total);
              
              finalMsg += "\n\t_*Información del producto*_\n\n";
              finalMsg += `• *Producto:* ${product.Nombre}\n`;
              finalMsg += `• *Valor del producto:* ${formattedPrice}\n`;
              finalMsg += `• *Valor del domicilio:* ${formattedDelivery}\n`;
              finalMsg += `• *Total a pagar:* ${formattedTotal}\n`;
            }
            
            finalMsg += "\nResponde *si* para confirmar o *no* para cancelar y volver a empezar.";
            await bot.sendMessage(sender, { text: finalMsg });
            return;
          } catch (err: any) {
            // Mejorar el manejo de errores con axios
            console.error("Error al calcular el costo de envío:", 
              err.response ? `Status: ${err.response.status}, Datos: ${JSON.stringify(err.response.data)}` : err.message);
            await bot.sendMessage(sender, { text: "Ocurrió un error calculando el costo de envío. Por favor, intenta nuevamente." });
            return;
          }
        } else if (formState.stage === 'finalConfirmation') {
          if (message.content === 'si' || message.content === 'Si' || message.content === 'SI' || message.content === 'sI') {
            formData[sender] = { 
              name: formState.name,
              idNumber: formState.idNumber,
              barrio: formState.barrio,
              address: formState.address,
              city: formState.city,
              deliveryCost: formState.deliveryCost
            };
            
            const product = selectedProduct[sender];
            const formattedPrice = (product && product.Precio)
              ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(product.Precio)
              : 'N/A';
            const formattedDelivery = formState.deliveryCost
              ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(formState.deliveryCost)
              : 'N/A';
            let total = (product && product.Precio) ? product.Precio + (formState.deliveryCost ?? 0) : (formState.deliveryCost ?? 0);
            const formattedTotal = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(total);
            
            const qrPath = path.join(__dirname, '../assets/qr.jpg');
            const qrBuffer = fs.readFileSync(qrPath);
            
            await bot.sendMessage(sender, {
              image: qrBuffer,
              caption: `Por favor, realiza el pago de:\n• Valor del producto: ${formattedPrice}\n• Valor del domicilio: ${formattedDelivery}\n• Total a pagar: ${formattedTotal}\n\nEscanea el siguiente QR y envía la captura del pago.`
            });
            
            awaitingPayment[sender] = true;
            delete awaitingConfirmation[sender];
            return;
          } else if (message.content === 'no' || message.content === 'No' || message.content === 'NO' || message.content === 'nO') {
            // Borrar datos de confirmación
            delete awaitingConfirmation[sender];
            delete selectedProduct[sender];
            delete formData[sender];
            
            // Reactivar la búsqueda de producto
            awaitingProduct[sender] = true;
            
            await bot.sendMessage(sender, { 
              text: "Sin problema, intentemos de nuevo. ¿Qué producto te interesa?" 
            });
            return;
          } else {
            await bot.sendMessage(sender, { 
              text: "❌ Por favor responde solo *si* o *no*." 
            });
            return;
          }
        }
      } else {
       // Para la confirmación simple cuando el usuario responde "si"
        if (message.content === 'si' || message.content === 'Si' || message.content === 'SI' || message.content === 'sI') {
            // Crear el objeto con el stage inicial
            awaitingConfirmation[sender] = { 
            stage: 'basicName'
            };
            // Enviar mensaje pidiendo el nombre directamente
            await bot.sendMessage(sender, { text: "Por favor, ingresa tu nombre completo:" });
            return;
        }
        else if (message.content === 'no' || message.content === 'No' || message.content === 'NO' || message.content === 'nO') {
          console.log("Confirmación recibida: NO");
          
          // Activar búsqueda de producto
          awaitingProduct[sender] = true;
          
          // Eliminar confirmación pendiente
          delete awaitingConfirmation[sender];
          
          // Mensaje preguntando por otro producto
          await bot.sendMessage(sender, { 
            text: "¿Qué producto te interesa del catálogo? Puedes indicarme el nombre o código." 
          });
          return;
        } else {
          await bot.sendMessage(sender, { text: "❌ Por favor responde solo con *si* o *no*. Inténtalo de nuevo." });
          return;
        }
      }
      break;
    }
    case 'product': {
      if (message.content) {
        const response = normalizeText(message.content);
        try {
          const dataPath = path.join(process.cwd(), 'data.json');
          if (!fs.existsSync(dataPath)) {
            logger.info("Data file not found. Fetching data from Google Sheets...");
            await delay(1000);
            await fetchSpreadsheetData();
          }
          
          const data: ProductDataType[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
          const product = data.find(item =>
            normalizeText(String(item.Nombre))?.includes(response) ||
            normalizeText(String(item.Descripción))?.includes(response) ||
            normalizeText(String(item.ID))?.includes(response)
          );
          
          if (product) {
            // Al encontrar el producto, almacenamos la información
            selectedProduct[sender] = product;
            
            await delay(1000);
            const formattedPrice = (product && product.Precio)
              ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(product.Precio)
              : 'N/A';
              
            await bot.sendMessage(sender, { 
              text: `Encontré el producto solicitado.\n*• Nombre:* ${product.Nombre}\n*• Descripción:* ${product.Descripción}\n*• Precio:* ${formattedPrice}` 
            });

            try {
              if (product.ImagenURL) {
                const tempDir = path.join(process.cwd(), './tmp');
                if (!fs.existsSync(tempDir)) {
                  fs.mkdirSync(tempDir);
                }
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const imagePath = path.join(tempDir, `imagen_producto_${uniqueSuffix}.jpg`);
                const res = await fetch(product.ImagenURL);
                const buffer = await res.arrayBuffer();
                fs.writeFileSync(imagePath, Buffer.from(buffer));
                
                await bot.sendMessage(sender, { 
                  image: fs.readFileSync(imagePath)
                });
              }
            } catch (err) {
              logger.error('Error sending product image:', err);
            }

            // Desactivar modo producto y activar confirmación
            awaitingProduct[sender] = false;
            awaitingConfirmation[sender] = true;
            
            await delay(1000);
            await bot.sendMessage(sender, {
              text: `¿Es el producto que buscabas? \nPor favor responde con un "*Si*" o un "*No*" para confirmar.`
            });
          } else {
            await bot.sendMessage(sender, { 
              text: `No encontré coincidencias para "*${message.content}*". Por favor, intenta con otro nombre o código.` 
            });
          }
        } catch (err) {
          logger.error("Ocurrió un error buscando el producto:", err);
          await bot.sendMessage(sender, { text: "Ocurrió un error buscando el producto." });
        }
      }
      break;
    }

case 'payment': {
  if (message?.rawMessage?.message?.imageMessage) {
    logger.info("Captura de pago recibida, procesando...");
    let targetNumber = process.env.PAYMENT_NUMBER || "573023606047";
    // Asegurarse de tener el jid completo
    const targetJid = targetNumber.includes('@') ? targetNumber : `${targetNumber}@s.whatsapp.net`;
    
    try {
      const imageMessage = message?.rawMessage?.message?.imageMessage;
      
      // Recuperar información del formulario, del producto y el número del pagador
      const formDataItem = formData[sender] || {};
      const productData = selectedProduct[sender] || {};
      const senderNumber = `+${sender.split('@')[0]}`;

      // 1. Primero enviar la información detallada (lo más importante)
      let detailsMsg = "\t_*NUEVA COMPRA RECIBIDA*_\t\n\n";
      detailsMsg += `*Nombre:* ${formDataItem.name || "N/A"}\n`;
      detailsMsg += `*Identificación:* ${formDataItem.idNumber || "N/A"}\n`;
      detailsMsg += `*Número:* ${senderNumber}\n`;
      detailsMsg += `*Dirección:* ${formDataItem.address || "N/A"}\n`;
      detailsMsg += `*Barrio:* ${formDataItem.barrio || "N/A"}\n`;
      detailsMsg += `*Ciudad:* ${formDataItem.city || "N/A"}\n`;
      
      detailsMsg += `\n\t_*Detalles del producto*_\t\n\n`;
      if (productData.Nombre) {
        detailsMsg += `*Código:* ${productData.ID || 'N/A'}\n`;
        detailsMsg += `*Producto:* ${productData.Nombre}\n`;
        detailsMsg += `*Descripción:* ${productData.Descripción}\n`;
        detailsMsg += `*Precio:* ${productData.Precio ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(productData.Precio) : 'N/A'}\n`;
        detailsMsg += `*Stock:* ${productData.Stock || 'N/A'}\n`;
        
        if (formDataItem.deliveryCost) {
          const formattedDelivery = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(formDataItem.deliveryCost);
          detailsMsg += `*Costo de envío:* ${formattedDelivery}\n`;
          
          if (productData.Precio) {
            const total = productData.Precio + formDataItem.deliveryCost;
            const formattedTotal = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(total);
            detailsMsg += `*Total:* ${formattedTotal}\n`;
          }
        }
      }
      
      // Enviar el mensaje con los detalles
      await bot.sendMessage(targetJid, { text: detailsMsg });
      
      // 2. Reenviar el mensaje original completo con forwardMessage
      let paymentImagePath = '';
      try {
        logger.info("Intentando reenviar el mensaje original completo");
        await bot.relayMessage(targetJid, message.rawMessage.message!, { messageId: message.key.id! });
        logger.info("Mensaje reenviado correctamente");
        
        // Guardar imagen del pago en una ubicación permanente
        if (imageMessage && imageMessage.jpegThumbnail) {
          // Crear directorio si no existe
          const mediaDir = path.join(process.cwd(), './public/media/payments');
          if (!fs.existsSync(mediaDir)) {
            fs.mkdirSync(mediaDir, { recursive: true });
          }
          
          // Crear nombre único para el archivo
          const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1E9);
          paymentImagePath = `/media/payments/payment_${uniqueId}.jpg`;
          const fullPath = path.join(process.cwd(), './public', paymentImagePath);
          
          // Guardar la imagen (preferiblemente el buffer completo)
          fs.writeFileSync(fullPath, Buffer.from(imageMessage.jpegThumbnail));
          logger.info(`Imagen de comprobante guardada en ${fullPath}`);
        }
      } catch (forwardError) {
        logger.error("Error al reenviar mensaje original:", forwardError);
        
        // Si falla el reenvío, intentar con la miniatura como respaldo
        if (imageMessage && imageMessage.jpegThumbnail && imageMessage.jpegThumbnail.length > 0) {
          logger.info("Enviando miniatura del comprobante de pago como respaldo");
          try {
            // Guardar imagen del pago en una ubicación permanente
            const mediaDir = path.join(process.cwd(), './public/media/payments');
            if (!fs.existsSync(mediaDir)) {
              fs.mkdirSync(mediaDir, { recursive: true });
            }
            
            // Crear nombre único para el archivo
            const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1E9);
            paymentImagePath = `/media/payments/payment_${uniqueId}.jpg`;
            const fullPath = path.join(process.cwd(), './public', paymentImagePath);
            
            fs.writeFileSync(fullPath, Buffer.from(imageMessage.jpegThumbnail));
            logger.info(`Imagen de comprobante guardada en ${fullPath}`);
            
            await bot.sendMessage(targetJid, {
              image: Buffer.from(imageMessage.jpegThumbnail),
              caption: "Comprobante de pago recibido (versión reducida)"
            });
            logger.info("Miniatura enviada correctamente");
          } catch (e) {
            logger.error("Error al enviar miniatura:", e);
            await bot.sendMessage(targetJid, { 
              text: "Se recibió un comprobante de pago pero no se pudo reenviar la imagen. Por favor revise el chat con el cliente."
            });
          }
        } else {
          await bot.sendMessage(targetJid, { 
            text: "⚠️ El cliente envió un comprobante de pago pero no se pudo procesar la imagen. Por favor revise el chat con el cliente."
          });
        }
      }
      
      // 3. Guardar el pedido en la historia
      const newOrder = createOrder({
        customer: {
          name: formDataItem.name || "N/A",
          idNumber: formDataItem.idNumber || "N/A",
          phone: senderNumber,
          address: formDataItem.address || "N/A",
          barrio: formDataItem.barrio || "N/A",
          city: formDataItem.city || "N/A"
        },
        product: {
          id: productData.ID ?? null,
          name: productData.Nombre ?? null,
          description: productData.Descripción ?? null,
          price: productData.Precio ?? null,
          imageUrl: productData.ImagenURL ?? null
        },
        payment: {
          total: productData.Precio ? productData.Precio + (formDataItem.deliveryCost || 0) : 0,
          productPrice: productData.Precio || 0,
          deliveryCost: formDataItem.deliveryCost || 0,
          imagePath: paymentImagePath
        }
      });
      
      logger.info(`Nuevo pedido registrado con ID: ${newOrder.id}`);
      
      // 4. Confirmar al cliente
      await bot.sendMessage(sender, { text: "*Gracias por la compra. Hemos recibido la captura del pago.*\n> En breve nos colocaremos en contacto contigo para coordinar la entrega." });

      // Limpiar todas las variables del usuario
      delete awaitingPayment[sender];
      delete awaitingProduct[sender];
      delete awaitingConfirmation[sender];
      delete selectedProduct[sender];
      delete formData[sender];

      // Borrar sesión del archivo sessions.json
      loadSessions();
      if (sessions[sender]) {
        delete sessions[sender];
        saveSessions();
      }
    } catch (error) {
      logger.error("Error al procesar pago:", error);
      await bot.sendMessage(sender, { text: "Hubo un problema procesando tu pago. Por favor, contacta a soporte." });
    }
  }
  break;
}
    case 'new':
    default: {
      // Flujo para nuevos usuarios o sesiones
      if (!message.key.remoteJid?.endsWith("@g.us") && sender) {
        loadSessions();
        const now = Date.now();
        const userData = sessions[sender] || { lastTime: null };

        // Si es la primera vez o han pasado más de 30 minutos
        if (!userData.lastTime || (now - userData.lastTime) > 30 * 60 * 1000) {
          userData.lastTime = now;
          sessions[sender] = userData;
          saveSessions();

          // Nombre de la empresa del .env
          const companyName = process.env.NAMEBUSINESS || '[NOMBRE TIENDA]';

          await bot.sendMessage(sender, {
            text: `👋 ¡Hola *${message.pushName}*!\n\nBienvenido a *${companyName}*.\n\nSoy tu bot de atención al cliente y estoy aquí para ayudarte en lo que necesites.`
          });

          const pdfPath = path.join(__dirname, '../assets/catalogo.pdf');
          const buffer = fs.readFileSync(pdfPath);
          await bot.sendMessage(sender, { 
            document: buffer, 
            fileName: 'catalogo.pdf', 
            caption: '> Aquí tienes nuestro catalogo.', 
            mimetype: 'application/pdf' 
          });

          productsMode = true;
          awaitingProduct[sender] = true;

          logger.info('Modo productos activado. Preguntando por producto...');
          await delay(2000);
          await bot.sendMessage(sender, {
            text: "*¿Qué producto te interesa del catalogo?*\n\n" +
                  "✏️ *Opciones para buscar:*\n" +
                  "• Ingresa el *nombre* del producto.\n" +
                  "• Ingresa el *código* del producto.\n\n" +
                  "> 😊 ¡Estamos aquí para ayudarte!"
          });
        } else if (message.content) {
          // Si ya existía una sesión y recibimos un mensaje de texto
          logger.info('Activando busqueda de producto para usuario existente');
          awaitingProduct[sender] = true;
          
          // Redirigir al flujo de productos
          stage = 'product';
          await MessageHandler(bot, message);
        }
      }
      break;
    }
  }
};

export default MessageHandler;