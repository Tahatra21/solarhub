const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function testLoginAndRole() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🧪 TESTING LOGIN AND ROLE ASSIGNMENT');
    console.log('====================================');
    console.log('');

    // Test admin login
    console.log('1. 🔴 TESTING ADMIN LOGIN:');
    console.log('==========================');
    
    const adminResult = await pool.query(`
      SELECT 
        a.id, a.username, a.password, a.fullname, a.email,
        b.role, c.jabatan
      FROM public.tbl_user as a
      LEFT JOIN public.tbl_role as b ON a.role = b.id
      LEFT JOIN public.tbl_jabatan as c ON a.jabatan = c.id
      WHERE a.username = 'admin'
    `);

    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      console.log(`✅ Admin user found:`);
      console.log(`   ID: ${admin.id}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Role: ${admin.role || 'Not assigned'}`);
      console.log(`   Jabatan: ${admin.jabatan || 'Not assigned'}`);
      
      // Test password
      const isValidPassword = await bcrypt.compare('admin123', admin.password);
      console.log(`   Password 'admin123': ${isValidPassword ? '✅ Valid' : '❌ Invalid'}`);
      
      if (!admin.role) {
        console.log('⚠️  Admin has no role assigned! Fixing...');
        await pool.query('UPDATE public.tbl_user SET role = 1 WHERE username = $1', ['admin']);
        console.log('✅ Admin role assigned!');
      }
    } else {
      console.log('❌ Admin user not found');
    }

    console.log('');

    // Test user login
    console.log('2. 🟢 TESTING USER LOGIN:');
    console.log('========================');
    
    const userResult = await pool.query(`
      SELECT 
        a.id, a.username, a.password, a.fullname, a.email,
        b.role, c.jabatan
      FROM public.tbl_user as a
      LEFT JOIN public.tbl_role as b ON a.role = b.id
      LEFT JOIN public.tbl_jabatan as c ON a.jabatan = c.id
      WHERE a.username = 'testing.itu'
    `);

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log(`✅ User found:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Role: ${user.role || 'Not assigned'}`);
      console.log(`   Jabatan: ${user.jabatan || 'Not assigned'}`);
      
      // Test password
      const isValidPassword = await bcrypt.compare('testing123', user.password);
      console.log(`   Password 'testing123': ${isValidPassword ? '✅ Valid' : '❌ Invalid'}`);
      
      if (!user.role) {
        console.log('⚠️  User has no role assigned! Fixing...');
        await pool.query('UPDATE public.tbl_user SET role = 2 WHERE username = $1', ['testing.itu']);
        console.log('✅ User role assigned!');
      }
    } else {
      console.log('❌ User not found');
    }

    console.log('');

    // Check all roles
    console.log('3. 🎭 AVAILABLE ROLES:');
    console.log('=====================');
    
    const rolesResult = await pool.query('SELECT id, role FROM public.tbl_role ORDER BY id ASC');
    rolesResult.rows.forEach(role => {
      console.log(`   ${role.id}. ${role.role}`);
    });

    console.log('');
    console.log('4. 🔐 FINAL LOGIN CREDENTIALS:');
    console.log('==============================');
    console.log('');
    console.log('🔴 ADMIN USER:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Role: Admin (Full Access)');
    console.log('   Expected: Administrator menu + all CRUD buttons');
    console.log('');
    console.log('🟢 USER ACCOUNT:');
    console.log('   Username: testing.itu');
    console.log('   Password: testing123');
    console.log('   Role: User (Read-Only)');
    console.log('   Expected: No Administrator menu + no CRUD buttons');
    console.log('');
    console.log('🚀 Ready for RBAC testing!');

  } catch (error) {
    console.error('❌ Database Error:', error.message);
  } finally {
    await pool.end();
  }
}

testLoginAndRole();
