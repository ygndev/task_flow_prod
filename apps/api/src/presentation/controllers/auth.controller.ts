import { Request, Response } from 'express';
import { incrementUserStreak } from '../../application/services/user.service.js';

export const authController = {
  getMe: (req: Request, res: Response): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    res.status(200).json({
      uid: req.user.uid,
      email: req.user.email,
      role: req.user.role,
      streakCount: req.user.streakCount ?? null,
    });
  },

  incrementStreak: async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    try {
      const streakCount = await incrementUserStreak(req.user.uid);
      res.status(200).json({ streakCount });
    } catch (error) {
      console.error('Failed to increment streak', error);
      res.status(500).json({ error: 'Failed to update streak' });
    }
  },
};
