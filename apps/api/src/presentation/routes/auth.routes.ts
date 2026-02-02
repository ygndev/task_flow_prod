import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { authController } from '../controllers/auth.controller';

export const authRouter = Router();

// Protected routes - require authentication
authRouter.get('/me', authenticate, authController.getMe);
authRouter.post('/streak', authenticate, (req, res, next) => {
  authController.incrementStreak(req, res).catch(next);
});
