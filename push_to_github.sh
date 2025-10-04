#!/bin/bash

echo "🚀 SOLARHUB GITHUB PUSH SCRIPT"
echo "================================"
echo ""

# Check if repository exists
if [ ! -d ".git" ]; then
    echo "❌ Error: Not a git repository"
    exit 1
fi

echo "📊 Repository Status:"
echo "   Remote: $(git remote get-url origin)"
echo "   Branch: $(git branch --show-current)"
echo "   Commits: $(git rev-list --count HEAD)"
echo "   Files: $(git ls-files | wc -l)"
echo ""

# Prompt for token
echo "🔑 Masukkan Personal Access Token dari GitHub:"
echo "   (Token akan disembunyikan saat diketik)"
read -s GITHUB_TOKEN

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Error: Token tidak boleh kosong"
    exit 1
fi

echo ""
echo "🔄 Setting up remote with token..."
git remote set-url origin https://Tahatra21:${GITHUB_TOKEN}@github.com/Tahatra21/solarhub.git

echo "🚀 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ BERHASIL! Repository berhasil di-push ke GitHub"
    echo "🎯 Repository tersedia di: https://github.com/Tahatra21/solarhub"
    echo ""
    echo "📊 Statistik:"
    echo "   - 7 commits dengan cleanup lengkap"
    echo "   - 575 files terorganisir"
    echo "   - README.md dengan dokumentasi lengkap"
    echo "   - Struktur project yang bersih"
else
    echo ""
    echo "❌ Error: Push gagal. Periksa token dan koneksi internet"
    echo "💡 Pastikan repository 'solarhub' sudah dibuat di GitHub"
fi
