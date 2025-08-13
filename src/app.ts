// ================================================================
// src/app.ts
// Express application setup with user authentication
// ================================================================

import express from 'express';
import cors from 'cors';
import { ModelManager } from './models';
import DatabaseConnection from './config/database';
import userRoutes from './routes/userRoutes';
import bookRoutes from './routes/bookRoutes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || '1.0.0'
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Database initialization
const initializeDatabase = async () => {
  try {
    const sequelize = DatabaseConnection.getInstance();
    await sequelize.authenticate();
    console.log('Database connection established successfully');
    
    // Initialize models
    ModelManager.initialize(sequelize);
    
    // Sync database (only in development)
    if (process.env.NODE_ENV === 'development') {
      await ModelManager.syncDatabase(false);
      console.log('Database synchronized');
    }
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await initializeDatabase();
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await ModelManager.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await ModelManager.close();
  process.exit(0);
});

if (require.main === module) {
  startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default app;