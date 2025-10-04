#!/bin/bash

# Script to clear Next.js cache and fix webpack issues

echo "🧹 CLEARING NEXT.JS CACHE..."
echo ""

# Clear .next directory
if [ -d ".next" ]; then
    rm -rf .next
    echo "✅ .next directory cleared"
else
    echo "ℹ️  .next directory not found"
fi

# Clear node_modules cache
if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    echo "✅ node_modules cache cleared"
else
    echo "ℹ️  node_modules cache not found"
fi

# Clear npm cache
echo "🧹 Clearing npm cache..."
npm cache clean --force
echo "✅ npm cache cleared"

echo ""
echo "🎯 CACHE CLEANUP COMPLETED!"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Run 'npm run dev' to start development server"
echo "2. If issues persist, try 'npm install' to reinstall dependencies"
echo "3. Check if the webpack error is resolved"
echo ""
echo "🔧 COMMON SOLUTIONS:"
echo "- Restart your development server"
echo "- Clear browser cache"
echo "- Check for conflicting processes on port 3000"
echo ""
echo "✨ Cache cleanup completed successfully!"
