import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { conversationController } from '../controllers/conversation.controller.js';
import { messageController } from '../controllers/message.controller.js';
import { operatorController } from '../controllers/operator.controller.js';
import { reactionController } from '../controllers/reaction.controller.js';
import { requireActor, requireAdmin, requireCustomer, requireOperator } from '../middlewares/auth.js';
import { uploadAttachments } from '../middlewares/upload.js';

export const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Auth (both apps)
router.post('/operator/auth/login', authController.operatorLogin);
router.post('/customer/auth/login', authController.customerLogin);
router.get('/auth/me', requireActor, authController.me);
router.post('/auth/logout', requireActor, authController.logout);
router.post('/operator/auth/logout', requireOperator, authController.logout);
router.post('/customer/auth/logout', requireCustomer, authController.logout);

// Operator portal
router.get('/operators', requireOperator, operatorController.list);
router.post('/operators', requireAdmin, operatorController.create);
router.patch('/operators/:id', requireAdmin, operatorController.update);

router.get('/conversations', requireOperator, conversationController.list);
router.get('/conversations/:id', requireOperator, conversationController.get);
router.patch('/conversations/:id', requireOperator, conversationController.update);
router.post('/conversations/:id/read', requireOperator, conversationController.markRead);
router.get('/conversations/:id/messages', requireOperator, messageController.list);
router.post('/conversations/:id/messages', requireOperator, uploadAttachments, messageController.create);

// Customer app (their single conversation)
router.get('/customer/conversation', requireCustomer, conversationController.mine);
router.post('/customer/conversation/read', requireCustomer, conversationController.markRead);
router.get('/customer/conversation/messages', requireCustomer, messageController.list);
router.post('/customer/conversation/messages', requireCustomer, uploadAttachments, messageController.create);

// Both
router.post('/messages/:messageId/reactions', requireActor, reactionController.toggle);
