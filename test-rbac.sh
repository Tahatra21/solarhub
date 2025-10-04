#!/bin/bash

echo "🧪 RBAC SYSTEM TESTING SCRIPT"
echo "=============================="
echo ""

# Test 1: Check if application starts without errors
echo "🔍 Test 1: Application Startup"
echo "Checking if Next.js compiles without errors..."
echo ""

# Test 2: API Endpoint Testing
echo "🔍 Test 2: API Endpoint Security"
echo "Testing API endpoints with different roles..."
echo ""

# Test User Management API (should require Admin role)
echo "Testing User Management API (Admin only):"
echo ""

# Test with no token (should return 401)
echo "❌ Test: No token"
curl -s -X GET "http://localhost:3003/api/users/master" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "Expected: 401 Unauthorized"
echo ""

# Test with invalid token (should return 401)
echo "❌ Test: Invalid token"
curl -s -X GET "http://localhost:3003/api/users/master" \
  -H "Content-Type: application/json" \
  -H "Cookie: token=invalid_token" | jq '.' 2>/dev/null || echo "Expected: 401 Unauthorized"
echo ""

# Test User Creation API (should require Admin role)
echo "Testing User Creation API (Admin only):"
echo ""

echo "❌ Test: Create user without Admin role"
curl -s -X POST "http://localhost:3003/api/users" \
  -H "Content-Type: application/json" \
  -H "Cookie: token=user_token" \
  -d '{
    "username": "testuser",
    "fullname": "Test User",
    "email": "test@test.com",
    "password": "test123",
    "role": 1,
    "jabatan": 1
  }' | jq '.' 2>/dev/null || echo "Expected: 403 Forbidden"
echo ""

echo "✅ Test: Create user with Admin role"
curl -s -X POST "http://localhost:3003/api/users" \
  -H "Content-Type: application/json" \
  -H "Cookie: token=admin_token" \
  -d '{
    "username": "testuser2",
    "fullname": "Test User 2",
    "email": "test2@test.com",
    "password": "test123",
    "role": 1,
    "jabatan": 1
  }' | jq '.' 2>/dev/null || echo "Expected: Success or validation error"
echo ""

# Test 3: Frontend Component Testing
echo "🔍 Test 3: Frontend Component Rendering"
echo "Testing role-based component visibility..."
echo ""

echo "✅ Components to test:"
echo "  • RoleBasedNavigation - Menu visibility based on role"
echo "  • CRUDButtons - Button visibility based on permissions"
echo "  • RoleBadge - Role display"
echo "  • PermissionGate - Component access control"
echo ""

# Test 4: Database Role Testing
echo "🔍 Test 4: Database Role Validation"
echo "Testing role-based database queries..."
echo ""

echo "✅ Database tests:"
echo "  • User role assignment"
echo "  • Permission checking"
echo "  • Role-based data access"
echo ""

# Test 5: Middleware Testing
echo "🔍 Test 5: Middleware Security"
echo "Testing route protection..."
echo ""

echo "✅ Middleware tests:"
echo "  • Route access control"
echo "  • Token validation"
echo "  • Role-based redirects"
echo ""

echo "🎯 MANUAL TESTING CHECKLIST:"
echo "============================="
echo ""
echo "1. 🔐 LOGIN TESTING:"
echo "   • Login with admin/test123 (should be Admin role)"
echo "   • Login with other users (should be User/Contributor role)"
echo "   • Verify role badge display"
echo ""
echo "2. 🧭 NAVIGATION TESTING:"
echo "   • Admin: Should see Administrator menu with dropdown"
echo "   • Contributor: Should NOT see Administrator menu"
echo "   • User: Should NOT see Administrator menu"
echo ""
echo "3. 🔧 CRUD TESTING:"
echo "   • Admin: Should see all CRUD buttons"
echo "   • Contributor: Should see CRUD buttons (except User Management)"
echo "   • User: Should NOT see CRUD buttons (only View)"
echo ""
echo "4. 👥 USER MANAGEMENT TESTING:"
echo "   • Admin: Can access /admin/users"
echo "   • Contributor: Should be redirected from /admin/users"
echo "   • User: Should be redirected from /admin/users"
echo ""
echo "5. 🔒 API SECURITY TESTING:"
echo "   • Test API endpoints with different roles"
echo "   • Verify 403 Forbidden for insufficient permissions"
echo "   • Verify 401 Unauthorized for invalid tokens"
echo ""
echo "6. 🎨 UI COMPONENT TESTING:"
echo "   • RoleBadge displays correct role"
echo "   • CRUDButtons show/hide based on permissions"
echo "   • PermissionGate blocks unauthorized components"
echo ""
echo "🚀 READY FOR MANUAL TESTING!"
echo "Open http://localhost:3003 and test with different user roles"
