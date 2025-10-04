const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function restoreOriginalPassword() {
  try {
    console.log('🔐 Restoring original password for admin user...');
    
    const client = await pool.connect();
    
    // Set password back to 'test123'
    const originalPassword = 'test123';
    const hashedPassword = await bcrypt.hash(originalPassword, 10);
    
    const result = await client.query(
      'UPDATE public.tbl_user SET password = $1 WHERE username = $2',
      [hashedPassword, 'admin']
    );
    
    console.log(`✅ Password restored for admin user. Rows affected: ${result.rowCount}`);
    console.log(`   Original password: ${originalPassword}`);
    
    // Verify the update
    const verifyResult = await client.query(
      'SELECT username, password FROM public.tbl_user WHERE username = $1',
      ['admin']
    );
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Verification successful:');
      console.log(`   Username: ${verifyResult.rows[0].username}`);
      console.log(`   Password hash: ${verifyResult.rows[0].password.substring(0, 20)}...`);
      
      // Test the password
      const testResult = await bcrypt.compare(originalPassword, verifyResult.rows[0].password);
      console.log(`   Password test: ${testResult ? '✅ VALID' : '❌ INVALID'}`);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error restoring password:', error.message);
  } finally {
    await pool.end();
  }
}

restoreOriginalPassword();
