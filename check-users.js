const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...');
    
    const client = await pool.connect();
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tbl_user', 'tbl_role', 'tbl_jabatan')
    `);
    
    console.log('📋 Available tables:', tablesResult.rows.map(r => r.table_name));
    
    // Check users
    const usersResult = await client.query(`
      SELECT a.id, a.username, a.fullname, a.email, a.role, a.jabatan,
             b.role as role_name, c.jabatan as jabatan_name
      FROM public.tbl_user as a
      LEFT JOIN public.tbl_role as b ON a.role = b.id
      LEFT JOIN public.tbl_jabatan as c ON a.jabatan = c.id
      ORDER BY a.id
    `);
    
    console.log(`\n👥 Found ${usersResult.rows.length} users:`);
    usersResult.rows.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Fullname: ${user.fullname}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role_name || 'N/A'}`);
      console.log(`   Jabatan: ${user.jabatan_name || 'N/A'}`);
      console.log('');
    });
    
    // Check roles
    const rolesResult = await client.query('SELECT * FROM public.tbl_role ORDER BY id');
    console.log(`\n🔑 Available roles (${rolesResult.rows.length}):`);
    rolesResult.rows.forEach(role => {
      console.log(`   ${role.id}. ${role.role}`);
    });
    
    // Check jabatan
    const jabatanResult = await client.query('SELECT * FROM public.tbl_jabatan ORDER BY id');
    console.log(`\n💼 Available jabatan (${jabatanResult.rows.length}):`);
    jabatanResult.rows.forEach(jabatan => {
      console.log(`   ${jabatan.id}. ${jabatan.jabatan}`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

checkUsers();
