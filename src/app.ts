import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';
import { medicationRouter } from './routes/medication.routes';
import { errorHandler } from './middleware/errorHandler';
import pinoHttp from 'pino-http';
import { logger } from '../src/lib/pino';
import { eventRouter } from './routes/event.routes';
import { inventoryRouter } from './routes/inventory.routes';
import { testRouter } from './routes/test.routes';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

app.use('/auth', authRouter);
app.use('/users', userRouter);
app.use('/medications', medicationRouter);
app.use('/events', eventRouter);
app.use('/inventory', inventoryRouter);
app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.use('/test', testRouter);

app.use(errorHandler);
export default app;