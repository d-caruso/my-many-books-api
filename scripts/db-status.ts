// ================================================================
// scripts/db-status.ts
// ================================================================

import { config } from 'dotenv';
import { DatabaseUtils } from '@/utils/database';

// Load environment variables
config();

async function checkDatabaseStatus(): Promise<void> {
  try {
    console.log('Checking database status...');
    
    // Try to initialize (won't fail if already initialized)
    try {
      await DatabaseUtils.initialize();
    } catch (error) {
      console.log('Database not accessible');
    }
    
    // Get status
    const status = await DatabaseUtils.getStatus();
    
    console.log('\n=== Database Status ===');
    console.log(`Connected: ${status.connected ? 'OK' : 'KO'}`);
    console.log(`Models Initialized: ${status.modelsInitialized ? 'OK' : 'KO'}`);
    console.log('\n=== Table Statistics ===');
    console.log(`Authors: ${status.tableStats.authors}`);
    console.log(`Categories: ${status.tableStats.categories}`);
    console.log(`Books: ${status.tableStats.books}`);
    console.log(`Book-Author Relations: ${status.tableStats.bookAuthors}`);
    console.log(`Book-Category Relations: ${status.tableStats.bookCategories}`);
    
    await DatabaseUtils.closeConnection();
    process.exit(0);
  } catch (error) {
    console.error('Status check failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  checkDatabaseStatus();
}