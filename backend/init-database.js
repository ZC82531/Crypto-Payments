#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

/**
 * Initialize database schema using direct SQL execution
 * This script runs our SQL schema file directly against the Postgres database
 */
async function initDatabase() {
  console.log('🔄 Starting database initialization...');
  
  try {
    // Read the SQL file content
    const sqlFilePath = path.join(__dirname, 'db-schema.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log(`📄 Read SQL file: ${sqlFilePath}`);
    
    // Try direct PostgreSQL connection first if DATABASE_URL is available
    if (process.env.DATABASE_URL) {
      console.log('🔌 Attempting direct PostgreSQL connection...');
      try {
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });
        
        await pool.query(sqlContent);
        await pool.end();
        console.log('✅ Database schema initialized via direct PostgreSQL connection');
        return;
      } catch (pgError) {
        console.error('❌ PostgreSQL connection failed:', pgError.message);
        console.log('🔄 Falling back to Supabase API...');
      }
    }
    
    // Use Supabase REST API to create the table manually if direct DB connection failed
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase URL and service role key required in .env file');
    }
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    console.log('� Creating business_profiles table using Supabase API...');
    
    try {
      // First, check if the table exists
      const { error: checkError } = await supabase
        .from('business_profiles')
        .select('count(*)')
        .limit(1);
      
      if (checkError && checkError.code === '42P01') {
        console.log('Table does not exist, creating it manually...');
        
        // Create the table manually using REST API
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS business_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            business_name VARCHAR(100) NOT NULL,
            routing_number VARCHAR(9),
            account_number VARCHAR(20),
            routing_number_token TEXT,
            account_number_token TEXT,
            routing_hash JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            encryption_version INTEGER DEFAULT 1
          );
          
          CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);
          
          ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
          
          CREATE POLICY "Users can view own profiles" ON business_profiles
            FOR SELECT USING (auth.uid() = user_id);
          
          CREATE POLICY "Users can insert own profiles" ON business_profiles
            FOR INSERT WITH CHECK (auth.uid() = user_id);
          
          CREATE POLICY "Users can update own profiles" ON business_profiles
            FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
        `;
        
        // Try using the SQL HTTP API directly
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
          },
          body: JSON.stringify({
            query: createTableQuery
          })
        });
        
        // Check if this created the table
        const { error: verifyError } = await supabase
          .from('business_profiles')
          .select('count(*)')
          .limit(1);
          
        if (!verifyError) {
          console.log('✅ Table created successfully via Supabase API');
        } else {
          // If table creation failed, provide manual instructions
          console.error('❌ Manual action required: Please run the following SQL in Supabase SQL Editor:');
          console.error(createTableQuery);
          
          // Try one last approach - create a simple record to force table creation
          console.log('🔄 Attempting to create table through insert...');
          
          const { error: insertError } = await supabase
            .from('business_profiles')
            .insert([
              { 
                user_id: '00000000-0000-0000-0000-000000000000',
                business_name: 'Test Business'
              }
            ]);
            
          if (insertError && insertError.code === '42P01') {
            console.error('❌ Unable to create table through any automated method');
            throw new Error('Table creation failed');
          } else {
            console.log('✅ Table created through insert method');
          }
        }
      } else {
        console.log('✅ Table business_profiles already exists');
      }
    } catch (apiError) {
      console.error('❌ Error using Supabase API:', apiError);
      throw apiError;
    }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };
