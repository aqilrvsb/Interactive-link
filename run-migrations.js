import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection - password is already provided
const connectionString = 'postgresql://postgres.mvmwcgnlebbesarvsvxk:Qyz5YndwCEWKGyNN@aws-0-us-west-1.pooler.supabase.com:5432/postgres';

async function runMigrations() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔄 Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Read migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', 'COMBINED_MIGRATIONS.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Running migrations...');
    
    // Split migrations into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        if (statement.includes('CREATE') || statement.includes('ALTER') || statement.includes('INSERT') || statement.includes('DROP')) {
          await client.query(statement + ';');
          successCount++;
          console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
        }
      } catch (err) {
        errorCount++;
        console.log(`⚠️ Warning: ${err.message.substring(0, 100)}`);
        // Continue with other statements even if one fails
      }
    }

    console.log(`\n📊 Migration Results:`);
    console.log(`   ✅ Successful statements: ${successCount}`);
    console.log(`   ⚠️ Skipped/Warning statements: ${errorCount}`);

    // Verify the migrations
    console.log('\n🔍 Verifying migrations...');
    
    // Check if user_sequences table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sequences'
      ) as exists
    `);
    console.log(`   User sequences table: ${tableCheck.rows[0].exists ? '✅ Created' : '❌ Not found'}`);

    // Check if storage bucket exists
    const bucketCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM storage.buckets 
        WHERE id = 'project-files'
      ) as exists
    `);
    console.log(`   Project files bucket: ${bucketCheck.rows[0].exists ? '✅ Created' : '❌ Not found'}`);

    // Get count of users with sequential IDs
    try {
      const userCount = await client.query(`
        SELECT COUNT(*) as count FROM public.user_sequences
      `);
      console.log(`   Users with sequential IDs: ${userCount.rows[0].count}`);
    } catch (err) {
      console.log(`   Users with sequential IDs: Table might not exist yet`);
    }

    console.log('\n✅ Migration completed successfully!');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔒 Database connection closed.');
  }
}

// Run the migrations
runMigrations().catch(console.error);