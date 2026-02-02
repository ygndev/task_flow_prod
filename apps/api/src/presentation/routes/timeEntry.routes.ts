import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requireMember } from '../middlewares/role.middleware';
import { timeEntryController } from '../controllers/timeEntry.controller';

export const timeEntryRouter = Router();

// All time entry routes require authentication and member role
timeEntryRouter.use(authenticate);
timeEntryRouter.use(requireMember);

timeEntryRouter.post('/start', timeEntryController.start);
timeEntryRouter.post('/stop', timeEntryController.stop);
timeEntryRouter.get('/active', timeEntryController.getActive);
timeEntryRouter.get('/summary/today', timeEntryController.getTodaySummary);
