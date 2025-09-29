import pg from 'pg';
const { Client } = pg;

// Using pooler connection to Supabase
const connectionString = 'postgresql://postgres.mvmwcgnlebbesarvsvxk:Qyz5YndwCEWKGyNN@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres';

async function runMigrations() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Connecting to Supabase database directly...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Create user_sequences table
    console.log('Creating user_sequences table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_sequences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
        sequential_id SERIAL UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      )
    `);
    console.log('✅ Table created/verified');

    // Enable RLS
    await client.query(`ALTER TABLE public.user_sequences ENABLE ROW LEVEL SECURITY`);
    console.log('✅ RLS enabled');

    // Create policies (drop first to avoid conflicts)
    console.log('Creating policies...');
    
    await client.query(`DROP POLICY IF EXISTS "Users can view their own sequential ID" ON public.user_sequences`);
    await client.query(`
      CREATE POLICY "Users can view their own sequential ID" 
      ON public.user_sequences
      FOR SELECT USING (auth.uid() = user_id)
    `);

    await client.query(`DROP POLICY IF EXISTS "System can insert sequential IDs" ON public.user_sequences`);
    await client.query(`
      CREATE POLICY "System can insert sequential IDs" 
      ON public.user_sequences
      FOR INSERT WITH CHECK (true)
    `);
    console.log('✅ Policies created');

    // Create function
    console.log('Creating function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.assign_sequential_user_id()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.user_sequences (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER
    `);
    console.log('✅ Function created');

    // Create trigger
    console.log('Creating trigger...');
    await client.query(`DROP TRIGGER IF EXISTS on_auth_user_created_assign_sequential_id ON auth.users`);
    await client.query(`
      CREATE TRIGGER on_auth_user_created_assign_sequential_id
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.assign_sequential_user_id()
    `);
    console.log('✅ Trigger created');

    // Create storage bucket
    console.log('Creating storage bucket...');
    await client.query(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        'project-files',
        'project-files',
        true,
        52428800,
        ARRAY['text/html', 'text/css', 'text/javascript', 'application/javascript']::text[]
      )
      ON CONFLICT (id) DO UPDATE SET
        public = true,
        file_size_limit = 52428800
    `);
    console.log('✅ Storage bucket created/updated');

    // Create storage policies
    console.log('Creating storage policies...');
    
    // Drop existing policies first
    await client.query(`DROP POLICY IF EXISTS "Users can upload their own project files" ON storage.objects`);
    await client.query(`DROP POLICY IF EXISTS "Users can update their own project files" ON storage.objects`);
    await client.query(`DROP POLICY IF EXISTS "Users can delete their own project files" ON storage.objects`);
    await client.query(`DROP POLICY IF EXISTS "Public read access for project files" ON storage.objects`);
    
    // Create new policies
    await client.query(`
      CREATE POLICY "Users can upload their own project files" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'project-files')
    `);

    await client.query(`
      CREATE POLICY "Users can update their own project files" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'project-files')
    `);

    await client.query(`
      CREATE POLICY "Users can delete their own project files" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'project-files')
    `);

    await client.query(`
      CREATE POLICY "Public read access for project files" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'project-files')
    `);
    console.log('✅ Storage policies created');

    // Assign sequential IDs to existing users
    console.log('Assigning sequential IDs to existing users...');
    await client.query(`
      INSERT INTO public.user_sequences (user_id)
      SELECT id FROM auth.users
      WHERE id NOT IN (SELECT user_id FROM public.user_sequences)
      ORDER BY created_at
      ON CONFLICT DO NOTHING
    `);

    // Verify setup
    console.log('\n📊 Verification:');
    const result1 = await client.query(`SELECT COUNT(*) as count FROM public.user_sequences`);
    console.log(`   ✅ Users with sequential IDs: ${result1.rows[0].count}`);

    const result2 = await client.query(`SELECT EXISTS (SELECT FROM storage.buckets WHERE id = 'project-files') as exists`);
    console.log(`   ✅ Storage bucket exists: ${result2.rows[0].exists}`);

    const result3 = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sequences'
      ) as exists
    `);
    console.log(`   ✅ User sequences table exists: ${result3.rows[0].exists}`);

    // Show some user IDs if they exist
    const users = await client.query(`
      SELECT 
        us.sequential_id,
        u.email,
        us.created_at
      FROM public.user_sequences us
      JOIN auth.users u ON us.user_id = u.id
      ORDER BY us.sequential_id
      LIMIT 5
    `);
    
    if (users.rows.length > 0) {
      console.log('\n📋 First few users with sequential IDs:');
      users.rows.forEach(user => {
        console.log(`   User #${user.sequential_id}: ${user.email}`);
      });
    }

    console.log('\n🎉 All migrations completed successfully!');
    console.log('Your Supabase database is now configured for sequential user IDs and project file storage.');

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.detail) console.error('   Detail:', err.detail);
    if (err.hint) console.error('   Hint:', err.hint);
    if (err.code) console.error('   Code:', err.code);
  } finally {
    await client.end();
    console.log('\n🔒 Database connection closed.');
  }
}

// Run the migrations
runMigrations().catch(console.error);