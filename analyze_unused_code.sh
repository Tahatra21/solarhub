#!/bin/bash

echo "=== ANALISIS KODE TIDAK TERPAKAI - PROJECT LIFECYCLE ==="
echo ""
echo "================================================"
echo "1. MENCARI FILE/FOLDER YANG TIDAK DI-IMPORT"
echo "================================================"
echo ""

# Mencari file example
echo "📁 /src/components/example/ - Folder Example/Demo Components"
grep -r "from.*components/example" src --include="*.tsx" --include="*.ts" | wc -l | awk '{if ($1 == 0) print "   ❌ NOT USED - " $1 " imports found"; else print "   ✅ USED - " $1 " imports found"}'
echo ""

# Mencari file ecommerce
echo "📁 /src/components/ecommerce/ - Folder Ecommerce Components"
grep -r "from.*components/ecommerce" src --include="*.tsx" --include="*.ts" | wc -l | awk '{if ($1 == 0) print "   ❌ NOT USED - " $1 " imports found"; else print "   ✅ USED - " $1 " imports found"}'
echo ""

# Mencari file videos
echo "📁 /src/components/videos/ - Folder Video Components"
grep -r "from.*components/videos" src --include="*.tsx" --include="*.ts" | wc -l | awk '{if ($1 == 0) print "   ❌ NOT USED - " $1 " imports found"; else print "   ✅ USED - " $1 " imports found"}'
echo ""

# Mencari file test
echo "📁 /src/components/test/ - Folder Test Components"
grep -r "from.*components/test" src --include="*.tsx" --include="*.ts" | wc -l | awk '{if ($1 == 0) print "   ❌ NOT USED - " $1 " imports found"; else print "   ✅ USED - " $1 " imports found"}'
echo ""

# Mencari file calendar
echo "📄 /src/components/calendar/Calendar.tsx"
grep -r "components/calendar" src --include="*.tsx" --include="*.ts" | grep -v "node_modules" | wc -l | awk '{if ($1 <= 1) print "   ❌ NOT USED (only self) - " $1 " imports found"; else print "   ✅ USED - " $1 " imports found"}'
echo ""

# Mencari file navigation
echo "📄 /src/components/navigation/HorizontalNav.tsx"
grep -r "components/navigation" src --include="*.tsx" --include="*.ts" | grep -v "node_modules" | wc -l | awk '{if ($1 <= 1) print "   ❌ NOT USED (only self) - " $1 " imports found"; else print "   ✅ USED - " $1 " imports found"}'
echo ""

echo "================================================"
echo "2. MENCARI FILE BACKUP/DUPLICATE"
echo "================================================"
echo ""

find src -type f \( -name "*_old.*" -o -name "*_backup.*" -o -name "*.bak" -o -name "*copy.*" \) 2>/dev/null | while read file; do
    echo "   ❌ BACKUP FILE: $file"
done

if [ $(find src -type f \( -name "*_old.*" -o -name "*_backup.*" -o -name "*.bak" -o -name "*copy.*" \) 2>/dev/null | wc -l) -eq 0 ]; then
    echo "   ✅ No backup files found"
fi
echo ""

echo "================================================"
echo "3. MENCARI FILE DOKUMENTASI YANG BERLEBIHAN"
echo "================================================"
echo ""

ls -lh *.md 2>/dev/null | awk '{print "   📄 " $9 " (" $5 ")"}'
echo ""

echo "================================================"
echo "4. MENCARI CONSOLE.LOG YANG BERLEBIHAN"
echo "================================================"
echo ""

echo "   Total console.log: $(grep -r "console.log" src --include="*.tsx" --include="*.ts" | wc -l | tr -d ' ')"
echo "   Top 10 files dengan console.log terbanyak:"
grep -r "console.log" src --include="*.tsx" --include="*.ts" | cut -d: -f1 | sort | uniq -c | sort -rn | head -10 | awk '{print "      " $1 "x - " $2}'
echo ""

echo "================================================"
echo "5. MENCARI FILE DI ROOT YANG TIDAK TERPAKAI"
echo "================================================"
echo ""

# File-file di root yang kemungkinan tidak terpakai
for file in cookies.txt indexingtable.txt scheduler.txt banner.png lifecycle_db_backup.sql verify_crjr_data_completeness.py verify_crjr_data.py; do
    if [ -f "$file" ]; then
        echo "   ❓ $file ($(du -h "$file" | cut -f1))"
    fi
done
echo ""

echo "================================================"
echo "ANALISIS SELESAI"
echo "================================================"
