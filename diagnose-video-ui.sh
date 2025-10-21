#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# VIDEO CAMPAIGNS PAGE - UI DIAGNOSTIC SCRIPT
# ═══════════════════════════════════════════════════════════════════════════
# PURPOSE: Find why the Video Campaigns page UI looks simplified
#
# ⚠️  IMPORTANT: This script ONLY examines UI code - NO changes to:
#    - Video generation functionality ✅ WORKING
#    - Voice cloning features ✅ WORKING
#    - Backend services ✅ WORKING
#    - API endpoints ✅ WORKING
#
# CONTEXT: All video/voice features are working perfectly.
#          We're just investigating why the UI might be showing a simplified
#          view instead of the full featured interface.
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Verify we're in the correct directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

if [ ! -d "frontend/src/pages/VideoCampaigns" ]; then
    echo "❌ ERROR: Not in production-crm repository!"
    echo "Expected path: /Users/jeet/Documents/production-crm"
    echo "Current path: $(pwd)"
    exit 1
fi

cd frontend/src

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🔍 VIDEO CAMPAIGNS UI DIAGNOSTIC TOOL"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📂 Repository: production-crm"
echo "📂 Location: /Users/jeet/Documents/production-crm"
echo "📂 Git Remote: https://github.com/jeet-avatar/production-crm.git"
echo ""
echo "📌 SCOPE: UI/Frontend code inspection only"
echo "📌 NO CHANGES will be made to video or voice functionality"
echo "📌 All features are working - we're just checking the UI code"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# CHECK 1: Verify we're looking at the right file
# ═══════════════════════════════════════════════════════════════════════════
echo "✓ CHECK 1: Locate Video Campaigns Page Component"
echo "──────────────────────────────────────────────────────────────"
if [ -f "pages/VideoCampaigns/VideoCampaignsPage.tsx" ]; then
    echo "✅ Found: pages/VideoCampaigns/VideoCampaignsPage.tsx"
    FILE_SIZE=$(wc -l < pages/VideoCampaigns/VideoCampaignsPage.tsx)
    echo "   Lines: $FILE_SIZE"
    echo "   Last modified: $(stat -f %Sm pages/VideoCampaigns/VideoCampaignsPage.tsx 2>/dev/null || stat -c %y pages/VideoCampaigns/VideoCampaignsPage.tsx 2>/dev/null)"
else
    echo "❌ File not found!"
    exit 1
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# CHECK 2: Look for UI mode toggles or feature flags
# ═══════════════════════════════════════════════════════════════════════════
echo "✓ CHECK 2: Search for View Mode Toggles or Feature Flags"
echo "──────────────────────────────────────────────────────────────"
echo "Searching for variables that might control UI complexity..."
echo ""

FEATURE_FLAGS=$(grep -rn "simpleView\|simplifiedMode\|viewMode\|showFullUI\|isSimplified\|compactView" pages/VideoCampaigns/*.tsx 2>/dev/null || echo "")

if [ -z "$FEATURE_FLAGS" ]; then
    echo "✅ No UI mode toggles found (good - means no feature flag hiding UI)"
else
    echo "⚠️  FOUND POTENTIAL UI TOGGLES:"
    echo "$FEATURE_FLAGS"
    echo ""
    echo "   👉 These variables might be controlling what UI is shown!"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# CHECK 3: Verify essential UI elements exist in the code
# ═══════════════════════════════════════════════════════════════════════════
echo "✓ CHECK 3: Verify Essential Video UI Elements Present"
echo "──────────────────────────────────────────────────────────────"

# Check for video player
VIDEO_TAGS=$(grep -c "<video" pages/VideoCampaigns/*.tsx 2>/dev/null || echo "0")
echo "Video player tags (<video>): $VIDEO_TAGS found"

# Check for status badges
STATUS_BADGES=$(grep -c "READY\|DRAFT\|FAILED\|PROCESSING" pages/VideoCampaigns/*.tsx 2>/dev/null || echo "0")
echo "Status badges (READY/DRAFT/etc): $STATUS_BADGES found"

# Check for play buttons
PLAY_BUTTONS=$(grep -c "PlayIcon\|play.*button\|onClick.*play" pages/VideoCampaigns/*.tsx 2>/dev/null || echo "0")
echo "Play buttons/controls: $PLAY_BUTTONS found"

# Check for action buttons
ACTION_BUTTONS=$(grep -c "Download\|Share\|Email.*template\|EnvelopeIcon" pages/VideoCampaigns/*.tsx 2>/dev/null || echo "0")
echo "Action buttons (Download/Share/Email): $ACTION_BUTTONS found"

echo ""
echo "UI Element Summary:"
if [ "$VIDEO_TAGS" -gt 0 ] && [ "$STATUS_BADGES" -gt 0 ] && [ "$PLAY_BUTTONS" -gt 0 ]; then
    echo "✅ All essential UI elements found in code"
else
    echo "⚠️  Some UI elements missing from code:"
    [ "$VIDEO_TAGS" -eq 0 ] && echo "   ❌ Missing: Video player tags"
    [ "$STATUS_BADGES" -eq 0 ] && echo "   ❌ Missing: Status badges"
    [ "$PLAY_BUTTONS" -eq 0 ] && echo "   ❌ Missing: Play controls"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# CHECK 4: Look for conditional rendering logic
# ═══════════════════════════════════════════════════════════════════════════
echo "✓ CHECK 4: Check for Conditional Rendering Logic"
echo "──────────────────────────────────────────────────────────────"
echo "Looking for ternary operators (? :) that might hide UI..."
echo ""

CONDITIONALS=$(grep -n "? .*:" pages/VideoCampaigns/VideoCampaignsPage.tsx | head -10)
if [ -z "$CONDITIONALS" ]; then
    echo "✅ No conditional rendering found"
else
    echo "Found conditional rendering (first 10):"
    echo "$CONDITIONALS"
    echo ""
    echo "   👉 Review these to see if any hide UI based on flags"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# CHECK 5: Examine component structure
# ═══════════════════════════════════════════════════════════════════════════
echo "✓ CHECK 5: Component Structure Overview"
echo "──────────────────────────────────────────────────────────────"
echo "Main sections in VideoCampaignsPage.tsx:"
echo ""

grep -n "// .*" pages/VideoCampaigns/VideoCampaignsPage.tsx | grep -E "(Grid|Video|Card|Title|Button|Player)" | head -20 || \
grep -n "{/\*.*\*/}" pages/VideoCampaigns/VideoCampaignsPage.tsx | head -20

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# CHECK 6: Review recent git changes
# ═══════════════════════════════════════════════════════════════════════════
echo "✓ CHECK 6: Recent Git History for Video Campaigns Page"
echo "──────────────────────────────────────────────────────────────"
echo "Last 10 commits affecting this page:"
echo ""

cd ../..
git log --oneline -10 -- frontend/src/pages/VideoCampaigns/VideoCampaignsPage.tsx 2>/dev/null || echo "No git history available"
cd frontend/src

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# CHECK 7: Compare with git to see current changes
# ═══════════════════════════════════════════════════════════════════════════
echo "✓ CHECK 7: Compare with Git Remote"
echo "──────────────────────────────────────────────────────────────"

cd ../..
git fetch origin 2>/dev/null
DIFF_COUNT=$(git diff origin/main frontend/src/pages/VideoCampaigns/VideoCampaignsPage.tsx 2>/dev/null | wc -l)

if [ "$DIFF_COUNT" -gt 0 ]; then
    echo "⚠️  Local file differs from git remote ($DIFF_COUNT lines changed)"
    echo "   Run: git diff origin/main frontend/src/pages/VideoCampaigns/VideoCampaignsPage.tsx"
else
    echo "✅ Local file matches git remote (in sync)"
fi
cd frontend/src

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# CHECK 8: Search for import statements
# ═══════════════════════════════════════════════════════════════════════════
echo "✓ CHECK 8: Component Dependencies (Imports)"
echo "──────────────────────────────────────────────────────────────"
echo "Components and icons imported:"
echo ""

head -30 pages/VideoCampaigns/VideoCampaignsPage.tsx | grep "^import" | grep -v "from 'react'"

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# CHECK 9: List all video campaign files
# ═══════════════════════════════════════════════════════════════════════════
echo "✓ CHECK 9: All Video Campaign Related Files"
echo "──────────────────────────────────────────────────────────────"
echo "Files in pages/VideoCampaigns/:"
echo ""

find pages/VideoCampaigns -type f \( -name "*.tsx" -o -name "*.ts" \) -exec ls -lh {} \; 2>/dev/null | awk '{print $9, "(" $5 ")"}'

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# FINAL SUMMARY AND RECOMMENDATIONS
# ═══════════════════════════════════════════════════════════════════════════
echo "════════════════════════════════════════════════════════════════"
echo "📊 DIAGNOSTIC SUMMARY"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Calculate health score
ISSUES_FOUND=0
WARNINGS=""

if [ "$VIDEO_TAGS" -eq 0 ]; then
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    WARNINGS="$WARNINGS\n   ❌ Missing video player elements"
fi

if [ "$STATUS_BADGES" -eq 0 ]; then
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    WARNINGS="$WARNINGS\n   ❌ Missing status badges (READY/DRAFT/etc)"
fi

if [ "$PLAY_BUTTONS" -eq 0 ]; then
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    WARNINGS="$WARNINGS\n   ⚠️  Missing play button controls"
fi

if [ -n "$FEATURE_FLAGS" ]; then
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    WARNINGS="$WARNINGS\n   ⚠️  Feature flags detected that may hide UI"
fi

echo "🎯 DIAGNOSIS RESULTS:"
echo ""

if [ "$ISSUES_FOUND" -eq 0 ]; then
    echo "✅ UI CODE LOOKS HEALTHY"
    echo ""
    echo "   The component has all expected UI elements."
    echo "   If you're seeing a simplified UI, the issue might be:"
    echo "   1. Build/deployment related (old bundle cached)"
    echo "   2. State/props not being passed correctly"
    echo "   3. CSS hiding elements (not removed from code)"
else
    echo "⚠️  POTENTIAL ISSUES DETECTED ($ISSUES_FOUND)"
    echo ""
    echo -e "$WARNINGS"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📋 RECOMMENDED NEXT STEPS:"
echo "════════════════════════════════════════════════════════════════"
echo ""

if [ "$ISSUES_FOUND" -gt 0 ]; then
    echo "1. Review the warnings above"
    echo "2. Check if feature flags are set to hide UI elements"
    echo "3. Verify the correct component is being rendered"
    echo "4. Compare with git history to find when UI was simplified"
else
    echo "1. Clear browser cache and hard reload (Cmd+Shift+R)"
    echo "2. Rebuild frontend: cd frontend && npm run build"
    echo "3. Check browser console for React errors"
    echo "4. Verify deployed bundle matches local code"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ DIAGNOSTIC COMPLETE - NO FUNCTIONALITY AFFECTED"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📌 Remember: This was a READ-ONLY diagnostic."
echo "📌 Video generation and voice features remain untouched."
echo "📌 To make UI changes, review the findings above first."
echo ""
