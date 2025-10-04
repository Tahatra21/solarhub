const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testOriginalPassword() {
  try {
    console.log('🔍 Testing original password (admin/test123)...');
    
    const response = await fetch('http://localhost:3003/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'test123'
      })
    });
    
    const data = await response.json();
    
    console.log(`📊 API Response:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${data.success}`);
    console.log(`   Message: ${data.message}`);
    
    if (data.user) {
      console.log(`   User: ${data.user.username}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testOriginalPassword();
