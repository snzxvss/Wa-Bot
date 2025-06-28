import express from 'express';
import { WASocket } from 'baileys';
import { initWASocket } from '../index';

const router = express.Router();

let reminderQueue: any[] = [];
let isProcessingQueue = false;

const processReminderQueue = async () => {
  if (isProcessingQueue || reminderQueue.length === 0) return;

  isProcessingQueue = true;
  const reminder = reminderQueue.shift();

  if (reminder) {
    try {
      console.log("Enviando recordatorio...");
      const sock = await initWASocket();

      const mensaje = `*📅 Recordatorio de Cita Médica 📅*\n\n` +
        `*👤 Paciente:* ${reminder.paciente}\n` +
        `*📆 Fecha:* ${reminder.fecha}\n` +
        `*⏰ Hora:* ${reminder.hora}\n` +
        `*🏥 Especialidad:* ${reminder.especialidad}\n` +
        `*👩‍⚕️ Profesional:* ${reminder.profesional}\n\n` +
        `> Por favor, asegúrate de llegar 15 minutos antes. ¡Te esperamos!`;

      await sock.sendMessage(`${reminder.numero}@s.whatsapp.net`, { text: mensaje });
      console.log("Recordatorio enviado exitosamente.");
    } catch (error) {
      console.error("Error al enviar recordatorio:", error);
    }
  }

  isProcessingQueue = false;

  if (reminderQueue.length > 0) {
    setTimeout(processReminderQueue, 1000); // Procesar el siguiente recordatorio después de 1 segundo
  }
};

router.post('/send-reminder', async (req, res) => {
  const { paciente, fecha, hora, especialidad, profesional, numero } = req.body;

  if (!paciente || !fecha || !hora || !especialidad || !profesional || !numero) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  reminderQueue.push({ paciente, fecha, hora, especialidad, profesional, numero });
  processReminderQueue();

  res.status(200).json({ message: 'Recordatorio en cola para ser enviado.' });
});

export default router;