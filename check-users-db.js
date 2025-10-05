const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkUsers() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 CHECKING DATABASE USERS');
    console.log('==========================');
    console.log('');

    // Check users table
    const usersResult = await pool.query(`
      SELECT 
        a.id, a.username, a.fullname, a.email,
        b.role, c.jabatan
      FROM public.tbl_user as a
      LEFT JOIN public.tbl_role as b ON a.role = b.id
      LEFT JOIN public.tbl_jabatan as c ON a.jabatan = c.id
      ORDER BY a.id
    `);

    console.log('👥 USERS IN DATABASE:');
    console.log('====================');
    
    if (usersResult.rows.length === 0) {
      console.log('❌ No users found in database');
    } else {
      usersResult.rows.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Full Name: ${user.fullname}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role || 'Not assigned'}`);
        console.log(`   Jabatan: ${user.jabatan || 'Not assigned'}`);
        console.log('');
      });
    }

    // Check roles table
    const rolesResult = await pool.query('SELECT * FROM public.tbl_role ORDER BY id');
    console.log('🎭 AVAILABLE ROLES:');
    console.log('==================');
    
    if (rolesResult.rows.length === 0) {
      console.log('❌ No roles found in database');
    } else {
      rolesResult.rows.forEach((role, index) => {
        console.log(`${index + 1}. ID: ${role.id} - ${role.role}`);
      });
    }

    console.log('');
    console.log('🔐 LOGIN CREDENTIALS:');
    console.log('======================');
    console.log('Note: Passwords are hashed in database');
    console.log('Use these credentials for testing:');
    console.log('');

    // Show known credentials
    const knownCredentials = [
      { username: 'admin', password: 'admin123', role: 'Admin' },
      { username: 'test', password: 'test123', role: 'User' },
      { username: 'testing', password: 'testing123', role: 'Contributor' }
    ];

    knownCredentials.forEach((cred, index) => {
      console.log(`${index + 1}. Username: ${cred.username}`);
      console.log(`   Password: ${cred.password}`);
      console.log(`   Expected Role: ${cred.role}`);
      console.log('');
    });

    console.log('🎯 RBAC ROLE LEVELS:');
    console.log('====================');
    console.log('🟢 USER (Level 1):');
    console.log('   • Read-only access');
    console.log('   • Can view all data');
    console.log('   • No CRUD operations');
    console.log('   • No Administrator menu');
    console.log('');
    console.log('🔵 CONTRIBUTOR (Level 2):');
    console.log('   • Read & Write access');
    console.log('   • Can perform CRUD operations');
    console.log('   • No Administrator menu');
    console.log('');
    console.log('🔴 ADMIN (Level 3):');
    console.log('   • Full access');
    console.log('   • All CRUD operations');
    console.log('   • Administrator menu access');
    console.log('   • User Management');
    console.log('   • System Settings');
    console.log('');

  } catch (error) {
    console.error('❌ Database Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
