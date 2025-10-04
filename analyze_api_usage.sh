#!/bin/bash

echo "=== ANALISIS API ENDPOINT ==="
echo ""
echo "================================================"
echo "MENCARI API ENDPOINT YANG TIDAK DIPANGGIL"
echo "================================================"
echo ""

# Daftar API endpoints
echo "🔍 Checking API endpoints..."
echo ""

# Monitoring API
echo "📡 Monitoring API:"
echo "   /api/monitoring/cr-jr:"
grep -r "/api/monitoring/cr-jr" src --include="*.tsx" --include="*.ts" --exclude-dir="api" | wc -l | awk '{if ($1 == 0) print "      ❌ NOT USED"; else print "      ✅ USED (" $1 " calls)"}'

# User Management API
echo ""
echo "👥 User Management API:"
echo "   /api/users/activity-log:"
grep -r "/api/users/activity-log" src --include="*.tsx" --include="*.ts" --exclude-dir="api" | wc -l | awk '{if ($1 == 0) print "      ❌ NOT USED"; else print "      ✅ USED (" $1 " calls)"}'
echo "   /api/users/change-password:"
grep -r "/api/users/change-password" src --include="*.tsx" --include="*.ts" --exclude-dir="api" | wc -l | awk '{if ($1 == 0) print "      ❌ NOT USED"; else print "      ✅ USED (" $1 " calls)"}'

# Dashboard API
echo ""
echo "📊 Dashboard API:"
echo "   /api/dashboard/export:"
grep -r "/api/dashboard/export" src --include="*.tsx" --include="*.ts" --exclude-dir="api" | wc -l | awk '{if ($1 == 0) print "      ❌ NOT USED"; else print "      ✅ USED (" $1 " calls)"}'

echo ""
echo "================================================"
echo "MENCARI HOOKS YANG TIDAK DIGUNAKAN"
echo "================================================"
echo ""

# List all hooks
for hook in src/hooks/*.ts; do
    hook_name=$(basename "$hook" .ts)
    usage=$(grep -r "from.*hooks/${hook_name}" src --include="*.tsx" --include="*.ts" | grep -v "node_modules" | wc -l | tr -d ' ')
    if [ "$usage" -eq "0" ]; then
        echo "   ❌ NOT USED: $hook_name"
    else
        echo "   ✅ USED ($usage): $hook_name"
    fi
done

echo ""
echo "================================================"
echo "ANALISIS SELESAI"
echo "================================================"
