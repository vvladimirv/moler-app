#!/bin/bash

# Auto-sync script za Moler Pro
# Automatski prati promjene i sinhronizuje sa GitHubom

cd "c:/Users/lbeta/Desktop/moler"

echo "🔄 Starting auto-sync..."

while true; do
    echo "📋 Checking for changes..."
    
    # Provjeri da li ima promjena
    if [[ -n $(git status --porcelain) ]]; then
        echo "✅ Changes detected, committing..."
        
        # Dodaj sve promjene
        git add .
        
        # Commit sa timestamp-om
        git commit -m "Auto-sync: $(date '+%Y-%m-%d %H:%M:%S')"
        
        # Push na GitHub
        echo "📤 Pushing to GitHub..."
        git push origin master
        
        echo "✅ Sync completed!"
    else
        echo "✅ No changes detected"
    fi
    
    # Sačekaj 30 sekundi prije sljedeće provjere
    sleep 30
done
