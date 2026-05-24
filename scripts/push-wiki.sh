#!/usr/bin/env bash
# Sync docs/wiki/ to GitHub Wiki repo.
#
# Usage:
#   bash scripts/push-wiki.sh
#
# Prerequisites:
#   1. Enable wiki in GitHub repo: Settings → Features → Wikis ✓
#   2. Create at least one page manually (GitHub requires one page to initialise the wiki repo)
#   3. Then run this script to overwrite with our content

set -e

REPO="git@github.com:JessyKol/ipad-vscode.wiki.git"
WIKI_DIR="$(mktemp -d)/wiki"
SRC_DIR="$(dirname "$0")/../docs/wiki"

echo "📋 Cloning wiki repo..."
git clone "$REPO" "$WIKI_DIR"

echo "📁 Copying wiki pages..."
cp "$SRC_DIR"/*.md "$WIKI_DIR/"

echo "📝 Committing changes..."
cd "$WIKI_DIR"
git add -A
git diff --cached --quiet && echo "No changes to push." && exit 0
git commit -m "docs: sync wiki from docs/wiki/ ($(date '+%Y-%m-%d'))"

echo "🚀 Pushing to GitHub Wiki..."
git push origin master

echo "✅ Wiki updated: https://github.com/JessyKol/ipad-vscode/wiki"
