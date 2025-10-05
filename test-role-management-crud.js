#!/usr/bin/env node

/**
 * Role Management CRUD Testing Script
 * Tests all CRUD operations for Role Management
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

class RoleManagementTester {
  constructor() {
    this.authToken = null;
    this.testResults = [];
  }

  async runTests() {
    console.log('🧪 ROLE MANAGEMENT CRUD TESTING');
    console.log('=' .repeat(40));
    
    try {
      // Step 1: Login as admin
      await this.loginAsAdmin();
      
      // Step 2: Test READ operation
      await this.testReadRoles();
      
      // Step 3: Test CREATE operation
      await this.testCreateRole();
      
      // Step 4: Test UPDATE operation
      await this.testUpdateRole();
      
      // Step 5: Test DELETE operation
      await this.testDeleteRole();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }

  async loginAsAdmin() {
    console.log('\n🔐 Step 1: Login as Admin');
    console.log('-'.repeat(25));
    
    try {
      const response = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        this.authToken = data.token;
        console.log('✅ Admin login successful');
        console.log(`   Role: ${data.user.role}`);
        this.testResults.push({ test: 'Admin Login', status: 'PASS' });
      } else {
        console.log('❌ Admin login failed');
        this.testResults.push({ test: 'Admin Login', status: 'FAIL' });
      }
    } catch (error) {
      console.log('❌ Login error:', error.message);
      this.testResults.push({ test: 'Admin Login', status: 'FAIL', error: error.message });
    }
  }

  async testReadRoles() {
    console.log('\n📋 Step 2: Test READ Roles');
    console.log('-'.repeat(25));
    
    try {
      const response = await fetch(`${BASE_URL}/api/roles/master`, {
        headers: {
          'Cookie': `token=${this.authToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ READ roles successful');
        console.log(`   Found ${data.data?.length || 0} roles`);
        console.log(`   Total pages: ${data.pagination?.totalPages || 0}`);
        
        if (data.data && data.data.length > 0) {
          console.log('   Sample roles:');
          data.data.slice(0, 3).forEach(role => {
            console.log(`     - ${role.nama_role} (ID: ${role.id})`);
          });
        }
        
        this.testResults.push({ test: 'READ Roles', status: 'PASS' });
        return data.data;
      } else {
        console.log(`❌ READ roles failed: ${response.status}`);
        this.testResults.push({ test: 'READ Roles', status: 'FAIL' });
        return [];
      }
    } catch (error) {
      console.log('❌ READ error:', error.message);
      this.testResults.push({ test: 'READ Roles', status: 'FAIL', error: error.message });
      return [];
    }
  }

  async testCreateRole() {
    console.log('\n➕ Step 3: Test CREATE Role');
    console.log('-'.repeat(25));
    
    try {
      const newRole = {
        nama_role: `TestRole_${Date.now()}`,
        description: 'Test role created by automated testing'
      };
      
      const response = await fetch(`${BASE_URL}/api/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `token=${this.authToken}`
        },
        body: JSON.stringify(newRole)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ CREATE role successful');
        console.log(`   Created role: ${data.role?.nama_role || newRole.nama_role}`);
        this.testResults.push({ test: 'CREATE Role', status: 'PASS' });
        return data.role;
      } else {
        const errorData = await response.text();
        console.log(`❌ CREATE role failed: ${response.status}`);
        console.log(`   Error: ${errorData}`);
        this.testResults.push({ test: 'CREATE Role', status: 'FAIL' });
        return null;
      }
    } catch (error) {
      console.log('❌ CREATE error:', error.message);
      this.testResults.push({ test: 'CREATE Role', status: 'FAIL', error: error.message });
      return null;
    }
  }

  async testUpdateRole() {
    console.log('\n✏️  Step 4: Test UPDATE Role');
    console.log('-'.repeat(25));
    
    try {
      // First get existing roles
      const roles = await this.testReadRoles();
      if (!roles || roles.length === 0) {
        console.log('⚠️  No roles found to update');
        this.testResults.push({ test: 'UPDATE Role', status: 'SKIP' });
        return;
      }
      
      const roleToUpdate = roles[0];
      const updatedData = {
        nama_role: `${roleToUpdate.nama_role}_Updated`,
        description: 'Updated by automated testing'
      };
      
      const response = await fetch(`${BASE_URL}/api/roles/${roleToUpdate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `token=${this.authToken}`
        },
        body: JSON.stringify(updatedData)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ UPDATE role successful');
        console.log(`   Updated role: ${data.role?.nama_role || updatedData.nama_role}`);
        this.testResults.push({ test: 'UPDATE Role', status: 'PASS' });
      } else {
        const errorData = await response.text();
        console.log(`❌ UPDATE role failed: ${response.status}`);
        console.log(`   Error: ${errorData}`);
        this.testResults.push({ test: 'UPDATE Role', status: 'FAIL' });
      }
    } catch (error) {
      console.log('❌ UPDATE error:', error.message);
      this.testResults.push({ test: 'UPDATE Role', status: 'FAIL', error: error.message });
    }
  }

  async testDeleteRole() {
    console.log('\n🗑️  Step 5: Test DELETE Role');
    console.log('-'.repeat(25));
    
    try {
      // First create a role to delete
      const newRole = await this.testCreateRole();
      if (!newRole) {
        console.log('⚠️  Could not create role for deletion test');
        this.testResults.push({ test: 'DELETE Role', status: 'SKIP' });
        return;
      }
      
      const response = await fetch(`${BASE_URL}/api/roles/${newRole.id}`, {
        method: 'DELETE',
        headers: {
          'Cookie': `token=${this.authToken}`
        }
      });
      
      if (response.ok) {
        console.log('✅ DELETE role successful');
        console.log(`   Deleted role: ${newRole.nama_role}`);
        this.testResults.push({ test: 'DELETE Role', status: 'PASS' });
      } else {
        const errorData = await response.text();
        console.log(`❌ DELETE role failed: ${response.status}`);
        console.log(`   Error: ${errorData}`);
        this.testResults.push({ test: 'DELETE Role', status: 'FAIL' });
      }
    } catch (error) {
      console.log('❌ DELETE error:', error.message);
      this.testResults.push({ test: 'DELETE Role', status: 'FAIL', error: error.message });
    }
  }

  generateReport() {
    console.log('\n📊 TEST REPORT');
    console.log('=' .repeat(40));
    
    const passedTests = this.testResults.filter(result => result.status === 'PASS').length;
    const totalTests = this.testResults.length;
    const successRate = (passedTests / totalTests) * 100;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    
    console.log('\n📋 Detailed Results:');
    this.testResults.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : result.status === 'SKIP' ? '⚠️' : '❌';
      console.log(`${status} ${result.test}: ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log('\n🎯 RECOMMENDATIONS:');
    if (successRate >= 80) {
      console.log('✅ Role Management CRUD is working well!');
    } else if (successRate >= 50) {
      console.log('⚠️  Role Management has some issues that need fixing');
    } else {
      console.log('❌ Role Management CRUD needs significant fixes');
    }
    
    console.log('\n📞 NEXT STEPS:');
    console.log('1. Fix any failed tests');
    console.log('2. Test manually in browser');
    console.log('3. Check browser console for errors');
    console.log('4. Verify database connectivity');
  }
}

// Run the test
if (require.main === module) {
  const tester = new RoleManagementTester();
  tester.runTests().catch(console.error);
}

module.exports = RoleManagementTester;
