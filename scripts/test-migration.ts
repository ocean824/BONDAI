#!/usr/bin/env tsx
/**
 * Migration test script
 * Validates that migrations can be applied successfully
 */

import { Pool } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import * as fs from 'fs';
import * as path from 'path';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

console.log("🔄 Testing migration against database...\n");

async function testMigration() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    // Test connection
    console.log("1️⃣ Testing database connection...");
    const result = await pool.query('SELECT 1 as test');
    console.log("   ✅ Database connection successful\n");

    // Check current tables before migration
    console.log("2️⃣ Checking existing tables...");
    const tablesResult = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    console.log(`   Found ${tablesResult.rows.length} existing tables:`);
    tablesResult.rows.forEach((row: any) => console.log(`   - ${row.tablename}`));
    console.log("");

    // Run migrations
    console.log("3️⃣ Running migrations...");
    await migrate(pool, { migrationsFolder: './migrations' });
    console.log("   ✅ Migrations completed successfully\n");

    // Check tables after migration
    console.log("4️⃣ Verifying new tables...");
    const newTablesResult = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    console.log(`   Total tables after migration: ${newTablesResult.rows.length}`);
    newTablesResult.rows.forEach((row: any) => console.log(`   - ${row.tablename}`));
    console.log("");

    // Validate critical missing tables exist
    const criticalMissingTables = [
      'auctions',
      'auction_bids',
      'trending_topics',
      'trending_summaries',
      'underwriting_cases',
      'underwriting_parties',
      'surety_trusts',
      'surety_cases',
      'surety_indemnitors',
      'surety_collateral',
      'surety_documents',
      'bond_process_documents'
    ];

    console.log("5️⃣ Validating migration completeness...");
    const existingTableNames = new Set(newTablesResult.rows.map((r: any) => r.tablename));
    const missing = criticalMissingTables.filter(t => !existingTableNames.has(t));
    
    if (missing.length > 0) {
      console.log(`   ❌ Missing tables: ${missing.join(', ')}`);
      process.exit(1);
    }
    console.log("   ✅ All critical tables created successfully\n");

    console.log("🎉 Migration test PASSED!\n");
    console.log("Summary:");
    console.log(`  - Initial tables: ${tablesResult.rows.length}`);
    console.log(`  - Final tables: ${newTablesResult.rows.length}`);
    console.log(`  - Tables added: ${newTablesResult.rows.length - tablesResult.rows.length}`);

  } catch (error) {
    console.error("\n❌ Migration test FAILED:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testMigration();
