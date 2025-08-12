// ================================================================
// scripts/init-database.ts
// ================================================================

import { config } from 'dotenv';
import { DatabaseUtils } from '@/utils/database';

// Load environment variables
config();

async function initializeDatabase(): Promise<void> {
  try {
    console.log('Starting database initialization...');

    // Initialize database connection and models
    await DatabaseUtils.initialize();

    // Sync database schema
    await DatabaseUtils.syncDatabase({ alter: true });

    // Seed with sample data
    await DatabaseUtils.seedDatabase();

    console.log('Database initialization completed successfully!');
    
    // Show status
    const status = await DatabaseUtils.getStatus();
    console.log('Database Status:', JSON.stringify(status, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}