const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testLoginQuery() {
  try {
    console.log('🔍 Testing login query...');
    
    const client = await pool.connect();
    
    // Test the exact query from API
    const username = 'admin';
    const result = await client.query(
      `SELECT a.id, a.username, a.password, a.fullname, a.email, a.photo, b.role, c.jabatan 
       FROM public.tbl_user as a
       JOIN public.tbl_role as b ON a.role = b.id
       JOIN public.tbl_jabatan as c ON a.jabatan = c.id
       WHERE a.username = $1 LIMIT 1`,
      [username]
    );
    
    console.log(`📊 Query result for username "${username}":`);
    console.log(`   Rows found: ${result.rows.length}`);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('   User data:');
      console.log(`     ID: ${user.id}`);
      console.log(`     Username: ${user.username}`);
      console.log(`     Fullname: ${user.fullname}`);
      console.log(`     Email: ${user.email}`);
      console.log(`     Role: ${user.role}`);
      console.log(`     Jabatan: ${user.jabatan}`);
      console.log(`     Password Hash: ${user.password.substring(0, 20)}...`);
    } else {
      console.log('   ❌ No user found!');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error testing query:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testLoginQuery();
