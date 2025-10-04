#!/bin/bash

echo "=== ANALISIS DEPENDENCIES ==="
echo ""
echo "================================================"
echo "MENCARI DEPENDENCIES YANG TIDAK DIGUNAKAN"
echo "================================================"
echo ""

# Check specific dependencies
echo "🔍 Checking key dependencies..."
echo ""

echo "📦 react-dnd & react-dnd-html5-backend:"
grep -r "react-dnd" src --include="*.tsx" --include="*.ts" | grep -v "node_modules" | wc -l | awk '{if ($1 == 0) print "   ❌ NOT USED"; else print "   ✅ USED (" $1 " imports)"}'

echo ""
echo "📦 react-google-recaptcha:"
grep -r "react-google-recaptcha" src --include="*.tsx" --include="*.ts" | grep -v "node_modules" | wc -l | awk '{if ($1 == 0) print "   ❌ NOT USED"; else print "   ✅ USED (" $1 " imports)"}'

echo ""
echo "📦 swiper:"
grep -r "swiper" src --include="*.tsx" --include="*.ts" | grep -v "node_modules" | wc -l | awk '{if ($1 == 0) print "   ❌ NOT USED"; else print "   ✅ USED (" $1 " imports)"}'

echo ""
echo "📦 @react-jvectormap:"
grep -r "react-jvectormap" src --include="*.tsx" --include="*.ts" | grep -v "node_modules" | wc -l | awk '{if ($1 == 0) print "   ❌ NOT USED"; else print "   ✅ USED (" $1 " imports)"}'

echo ""
echo "📦 flatpickr:"
grep -r "flatpickr" src --include="*.tsx" --include="*.ts" | grep -v "node_modules" | wc -l | awk '{if ($1 == 0) print "   ❌ NOT USED"; else print "   ✅ USED (" $1 " imports)"}'

echo ""
echo "📦 next-auth:"
grep -r "next-auth" src --include="*.tsx" --include="*.ts" | grep -v "node_modules" | wc -l | awk '{if ($1 == 0) print "   ❌ NOT USED"; else print "   ✅ USED (" $1 " imports)"}'

echo ""
echo "📦 bcrypt & bcryptjs:"
grep -r "bcrypt" src --include="*.tsx" --include="*.ts" | grep -v "node_modules" | wc -l | awk '{if ($1 == 0) print "   ❌ NOT USED"; else print "   ✅ USED (" $1 " imports)"}'

echo ""
echo "📦 jwt-decode:"
grep -r "jwt-decode" src --include="*.tsx" --include="*.ts" | grep -v "node_modules" | wc -l | awk '{if ($1 == 0) print "   ❌ NOT USED"; else print "   ✅ USED (" $1 " imports)"}'

echo ""
echo "📦 @fullcalendar/*:"
grep -r "@fullcalendar" src --include="*.tsx" --include="*.ts" | grep -v "node_modules" | wc -l | awk '{if ($1 == 0) print "   ❌ NOT USED"; else print "   ✅ USED (" $1 " imports)"}'

echo ""
echo "================================================"
echo "ANALISIS SELESAI"
echo "================================================"
