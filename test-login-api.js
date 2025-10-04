const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testLoginAPI() {
  try {
    console.log('🔍 Testing login API...');
    
    const response = await fetch('http://localhost:3003/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
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

testLoginAPI();
