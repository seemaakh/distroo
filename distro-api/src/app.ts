import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import healthRouter    from './routes/health';
import authRouter      from './routes/auth';
import productsRouter  from './routes/products';
import ordersRouter    from './routes/orders';
import customersRouter from './routes/customers';
import ledgerRouter    from './routes/ledger';
import inventoryRouter from './routes/inventory';
import paymentsRouter  from './routes/payments';
import reportsRouter   from './routes/reports';
import publicRouter    from './routes/public';
import adminRouter     from './routes/admin';
import { startCleanupCron } from './lib/cleanup';
import { apiLimiter } from './middleware/rateLimiter';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(apiLimiter);

app.use('/api/health',    healthRouter);
app.use('/api/auth',      authRouter);
app.use('/api/products',  productsRouter);
app.use('/api/orders',    ordersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/ledger',    ledgerRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/payments',  paymentsRouter);
app.use('/api/reports',   reportsRouter);
app.use('/api/admin',     adminRouter);
app.use('/api',           publicRouter);  // announcements, districts, categories

const PORT = parseInt(process.env.API_PORT || '3001');
app.listen(PORT, '0.0.0.0', () => {
  console.log(`DISTRO API running on 0.0.0.0:${PORT} (LAN-accessible)`);
  startCleanupCron();
});

export default app;
