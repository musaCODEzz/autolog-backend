import { Router } from 'express';
import { handleIncomingWhatsApp } from '../controllers/whatsapp.controller';

const router = Router();

// Twilio fires an HTTP POST webhook when a message is received
router.post('/webhook', handleIncomingWhatsApp);

export default router;
