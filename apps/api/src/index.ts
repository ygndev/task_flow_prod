import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initializeInfrastructure } from './infrastructure';
import { healthRouter } from './presentation/routes/health.routes';
import { authRouter } from './presentation/routes/auth.routes';
import { adminRouter } from './presentation/routes/admin.routes';
import { taskRouter } from './presentation/routes/task.routes';
import { timeEntryRouter } from './presentation/routes/timeEntry.routes';
import { reportRouter } from './presentation/routes/report.routes';

const app = express();
const PORT = process.env.PORT || 4000;

// CORS middleware - must be before routes
app.use(
  cors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize infrastructure (Firebase Admin, config, etc.)
initializeInfrastructure();

// Routes
app.use('/api/health', healthRouter);
app.use('/api', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/time-entries', timeEntryRouter);
app.use('/api/reports', reportRouter);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
