// ================================================================
// scripts/reset-database.ts
// ================================================================

import { config } from 'dotenv';
import { DatabaseUtils } from '@/utils/database';

// Load environment variables
config();

async function resetDatabase(): Promise<void> {
  try {
    console.log('Starting database reset...');
    
    // Initialize database
    await DatabaseUtils.initialize();
    
    // Reset everything
    await DatabaseUtils.resetDatabase();
    
    console.log('Database reset completed successfully!');
    
    // Show status
    const status = await DatabaseUtils.getStatus();
    console.log('Database Status:', JSON.stringify(status, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Database reset failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  resetDatabase();
}