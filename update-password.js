const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function updatePassword() {
  try {
    console.log('🔐 Updating admin password...');
    
    const client = await pool.connect();
    
    // Update admin password
    const hashedPassword = '$2b$10$wuZFYzsxPerJJQCJO.hV1.s8oLmmVQ2Kcj..CVwGYW9E4qmkfPrPa';
    
    const result = await client.query(
      'UPDATE public.tbl_user SET password = $1 WHERE username = $2',
      [hashedPassword, 'admin']
    );
    
    console.log(`✅ Password updated for admin user. Rows affected: ${result.rowCount}`);
    
    // Verify the update
    const verifyResult = await client.query(
      'SELECT username, password FROM public.tbl_user WHERE username = $1',
      ['admin']
    );
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Verification successful:');
      console.log(`   Username: ${verifyResult.rows[0].username}`);
      console.log(`   Password hash: ${verifyResult.rows[0].password.substring(0, 20)}...`);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error updating password:', error.message);
  } finally {
    await pool.end();
  }
}

updatePassword();
