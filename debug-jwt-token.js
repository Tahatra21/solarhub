const { verifyToken } = require('./src/utils/auth');

async function debugJWTToken() {
  console.log('🔍 DEBUGGING JWT TOKEN');
  console.log('======================');
  console.log('');

  // Test with a sample token (this won't work without actual token)
  console.log('Testing JWT verification...');
  
  try {
    // This is just to test if the function works
    const result = verifyToken('invalid-token');
    console.log('JWT verification function works:', result === null ? '✅ Yes' : '❌ No');
  } catch (error) {
    console.log('JWT verification error:', error.message);
  }

  console.log('');
  console.log('🔧 JWT TOKEN DEBUGGING STEPS:');
  console.log('=============================');
  console.log('1. Login with admin/admin123');
  console.log('2. Check browser cookies for "token"');
  console.log('3. Decode JWT token at jwt.io');
  console.log('4. Verify payload contains: { id, username, role }');
  console.log('');
  console.log('🎯 EXPECTED JWT PAYLOAD:');
  console.log('========================');
  console.log('For Admin:');
  console.log('{');
  console.log('  "id": 1,');
  console.log('  "username": "admin",');
  console.log('  "role": "Admin"');
  console.log('}');
  console.log('');
  console.log('For User:');
  console.log('{');
  console.log('  "id": 3,');
  console.log('  "username": "testing.itu",');
  console.log('  "role": "User"');
  console.log('}');
  console.log('');
  console.log('🚀 Next Steps:');
  console.log('1. Login and check JWT token');
  console.log('2. If role is missing, clear cookies and login again');
  console.log('3. Test RBAC with both users');
}

debugJWTToken();
