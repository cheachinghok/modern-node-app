import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import 'dotenv/config';
import './models/user.js';
import './models/product.js';

// Import routes
import productRoutes from './routes/productRoute.js';
import authRoutes from "./routes/authRoute.js"
import orderRoutes from "./routes/orderRoutes.js"
import analizeRoute from "./routes/analizeRoute.js"
import userRoutes from "./routes/userRoute.js"
import uploadRoutes from './routes/uploadRoute.js';

// Import middleware
import errorHandler from './middleware/errorHandler.js';
import notFound from './middleware/notFound.js';
import multerErrorHandler from './middleware/multerErrorHandler.js';

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Compression middleware
app.use(compression());

// CORS
app.use(cors({
  origin: ['http://localhost:3000','http://localhost:5173','http://localhost:8080', 'https://1092-store-admin.vercel.app', 'https://1092-store.vercel.app'],
  credentials: true,
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}


// Add health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'modern-node-app',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Add root route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Modern Node App API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analizeRoute);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);

// Error handling middleware
app.use(notFound);
app.use(multerErrorHandler);
app.use(errorHandler);

export default app;