# Cache Management System

## Overview

Comprehensive cache management system to prevent users from seeing stale JavaScript/CSS after deployments.

**Problem Solved**: Users were seeing old cached code even after new deployments, causing role-based filtering and other features to not work until manual cache clearing.

**Solution**: Combination of cache control headers + automatic version checking with update notifications.

## Implementation

### 1. Cache Control Headers ([vercel.json](vercel.json))

**Purpose**: Tell browsers and CDNs exactly what to cache and for how long.

```json
{
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*).html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

**Strategy**:
- ✅ **Static assets (JS/CSS)**: Cache aggressively (1 year) because filenames include hash
  - Example: `main.abc123.chunk.js` → cached until hash changes
  - New build = new hash = new filename = browser downloads new file

- ✅ **HTML files**: Never cache → always fresh
  - Ensures user always gets latest HTML with new script references

- ✅ **version.json**: Never cache → always checked for updates

### 2. Automatic Version Checking

**Files**:
- [src/hooks/useVersionCheck.ts](src/hooks/useVersionCheck.ts) - Version checking hook
- [src/components/UpdateBanner.tsx](src/components/UpdateBanner.tsx) - Update notification UI
- [scripts/generate-version.js](scripts/generate-version.js) - Build-time version generator
- [public/version.json](public/version.json) - Version info file

**How It Works**:

1. **Build Time**:
   ```bash
   npm run build
   → prebuild script runs: node scripts/generate-version.js
   → Generates public/version.json with:
      - version (from package.json)
      - timestamp (Date.now())
      - buildDate (ISO string)
   → React build continues normally
   ```

2. **Runtime**:
   ```typescript
   // On app load
   useVersionCheck(300000); // Check every 5 minutes

   // Fetches /version.json?t=${Date.now()} (cache-busting)
   // Compares with localStorage.appVersion
   // If different: Shows UpdateBanner
   ```

3. **User Action**:
   - Banner appears: "A new version is available!"
   - **Update Now**: Hard reload (`window.location.reload()`)
   - **Later**: Dismiss banner (still updates localStorage)

### 3. Version Check Trigger Points

The system checks for updates:
- ✅ **On app mount** (first load)
- ✅ **Every 5 minutes** (periodic check)
- ✅ **On window focus** (user returns to tab)

### 4. Update Banner Component

**Location**: [src/components/UpdateBanner.tsx](src/components/UpdateBanner.tsx:1)

**Features**:
- Material-UI Snackbar positioned at top-center
- Blue info alert with refresh icon
- Two action buttons:
  - **Update Now** - Reloads page immediately
  - **Later** - Dismisses banner (won't show again for this version)
- Responsive design
- Auto-manages localStorage version tracking

**Preview**:
```
┌────────────────────────────────────────────────────────┐
│ ℹ️ A new version is available! Update now for the     │
│    latest features and fixes.                          │
│                         [Update Now] [Later]           │
└────────────────────────────────────────────────────────┘
```

### 5. Version Generation Script

**Location**: [scripts/generate-version.js](scripts/generate-version.js:1)

**Triggered By**: `npm run build` (via `prebuild` script)

**Output**: `public/version.json`
```json
{
  "version": "1.0.0",
  "timestamp": 1762628844940,
  "buildDate": "2025-11-08T19:07:24.940Z"
}
```

**Why It Works**:
- Every build creates unique timestamp
- Even if package.json version unchanged, timestamp ensures detection
- Allows granular per-deployment tracking

## Cache Strategy Explained

### Before (Problem)

1. User visits site → Downloads `main.abc123.js`
2. Browser caches `main.abc123.js` for 1 year
3. New deployment → Creates `main.xyz789.js`
4. User visits site → Browser serves cached HTML
5. Cached HTML references old `main.abc123.js`
6. User sees old code ❌

### After (Solution)

1. User visits site → Downloads `index.html` (never cached)
2. HTML references `main.abc123.js` → Downloads and caches
3. App loads → Checks `version.json` → Stores version "1.0.0"
4. **New deployment happens** → Creates `main.xyz789.js` + new `version.json`
5. User still on site → 5 minutes later, checks `version.json` again
6. Detects new version → Shows update banner
7. User clicks "Update Now" → Hard reload
8. Fresh HTML downloaded → References new `main.xyz789.js`
9. New JavaScript downloaded → User sees new features ✅

## Usage

### For Developers

**Normal Development**:
```bash
npm run build  # Automatically generates version.json
vercel --prod  # Deploy to production
```

**Manual Version Bump** (optional):
```bash
# Edit package.json version: 1.0.0 → 1.0.1
npm run build  # New version.json created
```

**Testing Locally**:
```bash
npm run build
npx serve -s build
# Open browser, check console for version logs
```

### For Users

**Automatic** (no action needed):
- System automatically detects updates
- Banner appears when update available
- Click "Update Now" or "Later"

**Manual** (if needed):
- Hard refresh: **Ctrl + Shift + R** (Windows) or **Cmd + Shift + R** (Mac)
- Clear cache: Browser settings → Clear site data
- Incognito mode: Opens with fresh cache

## Debugging

### Check Current Version

**In Browser Console**:
```javascript
// Check stored version
localStorage.getItem('appVersion');

// Check live version
fetch('/version.json?t=' + Date.now())
  .then(r => r.json())
  .then(console.log);
```

### Force Version Check

**In Browser Console**:
```javascript
// Clear stored version to trigger update banner
localStorage.removeItem('appVersion');
window.location.reload();
```

### Verify Cache Headers

**In Browser DevTools**:
1. Open **Network** tab
2. Hard refresh (**Ctrl + Shift + R**)
3. Click on `index.html` → **Headers** tab
   - Should see: `Cache-Control: no-cache, no-store, must-revalidate`
4. Click on `main.xxx.js` → **Headers** tab
   - Should see: `Cache-Control: public, max-age=31536000, immutable`

### Debug Scripts

**Check if latest code deployed**: [public/verify-deployment.js](public/verify-deployment.js:1)
```javascript
// Run in browser console
// Shows deployment info, version, and cache status
```

## Configuration

### Change Check Interval

**File**: [src/App.tsx](src/App.tsx:107)
```typescript
// Default: 300000ms (5 minutes)
useVersionCheck(300000);

// Change to 10 minutes
useVersionCheck(600000);

// Change to 1 minute (aggressive)
useVersionCheck(60000);
```

### Customize Update Banner

**File**: [src/components/UpdateBanner.tsx](src/components/UpdateBanner.tsx:1)
```typescript
// Change message
<Alert>
  Your custom message here!
</Alert>

// Change position
<Snackbar
  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
>

// Change color
<Alert severity="warning"> // instead of "info"
```

### Modify Cache Duration

**File**: [vercel.json](vercel.json:1)
```json
// Change static asset cache from 1 year to 1 month
{
  "key": "Cache-Control",
  "value": "public, max-age=2592000, immutable"
}
```

## Monitoring

### Production Logs

**Check if version updates working**:
```bash
# View Vercel deployment logs
vercel logs skill-lab-web --prod

# Look for version generation
grep "Generated version.json" logs
```

### User Analytics (Optional Enhancement)

**Track version adoption** (not yet implemented):
```typescript
// In useVersionCheck hook
const checkVersion = useCallback(async () => {
  // ... existing code ...

  // Optional: Track version in analytics
  if (versionInfo.version !== storedVersion) {
    analytics.track('new_version_detected', {
      oldVersion: storedVersion,
      newVersion: versionInfo.version
    });
  }
}, []);
```

## Best Practices

### 1. Version Numbering

**Semantic Versioning** recommended:
- `1.0.0` → `1.0.1` - Patch (bug fixes)
- `1.0.0` → `1.1.0` - Minor (new features)
- `1.0.0` → `2.0.0` - Major (breaking changes)

**Not Required** - Timestamp alone is sufficient for detection

### 2. Deployment Workflow

**Recommended**:
```bash
# 1. Make changes
# 2. Test locally
npm run build
npx serve -s build

# 3. Commit
git add .
git commit -m "Feature description"
git push

# 4. Deploy
vercel --prod

# 5. Wait 2-3 minutes for CDN propagation
# 6. Test in incognito window
# 7. Monitor for version update banners appearing
```

### 3. Emergency Updates

**If critical fix needed**:
```bash
# 1. Make fix
# 2. Optionally bump version in package.json
# 3. Deploy immediately
vercel --prod

# 4. Notify users (optional)
# - Email/Slack: "Please refresh your browser"
# - Or wait for automatic detection (5 min max)
```

### 4. Communication

**After Major Updates**:
- Update banner shows automatically ✅
- Optional: Add release notes link in banner
- Optional: Send email to active users

## Troubleshooting

### Issue: Update banner not appearing

**Possible Causes**:
1. **Same version** - Check if version.json actually changed
   ```javascript
   fetch('/version.json?t=' + Date.now()).then(r => r.json()).then(console.log)
   ```

2. **localStorage not updating** - Clear and reload
   ```javascript
   localStorage.removeItem('appVersion');
   window.location.reload();
   ```

3. **Check interval too long** - User hasn't waited 5 minutes yet
   - Wait 5 minutes OR
   - Switch to another tab and back (triggers focus check)

### Issue: Cached version still loading

**Solutions**:
1. **Hard refresh** - Bypasses cache completely
2. **Check cache headers** - Verify vercel.json deployed
3. **Incognito mode** - Fresh cache guaranteed
4. **Wait for CDN** - Vercel CDN takes 2-3 minutes to propagate

### Issue: Version check failing

**Check**:
1. Network tab → version.json request
2. Console errors
3. CORS issues (unlikely on same domain)

**Fix**:
```typescript
// In useVersionCheck.ts
logger.warn('Failed to fetch version info'); // Check logs
```

## Performance Impact

### Bundle Size
- **UpdateBanner**: ~2 KB (gzipped)
- **useVersionCheck**: ~1 KB (gzipped)
- **Total**: ~3 KB additional

### Network Requests
- **version.json**: ~200 bytes
- **Frequency**: Every 5 minutes + on focus
- **Impact**: Negligible (smaller than a single image)

### User Experience
- **No impact** when no update available
- **Minimal** when update available (just a banner)
- **One-time** reload when user clicks "Update Now"

## Future Enhancements

### Planned
1. **Release Notes** - Link to changelog in update banner
2. **Forced Updates** - Critical updates that require immediate reload
3. **Version History** - Track which versions user has seen
4. **Analytics Integration** - Monitor version adoption rates

### Considered
1. **Service Worker** - More advanced caching strategies
2. **Progressive Updates** - Load new code in background
3. **Delta Updates** - Only download changed chunks
4. **Offline Support** - Continue working without connectivity

## Related Documentation

- [DUPLICATE_GROUPS_PREVENTION.md](DUPLICATE_GROUPS_PREVENTION.md) - Group deduplication
- [TRAINER_LOGIN_RESOLUTION.md](TRAINER_LOGIN_RESOLUTION.md) - Login fixes
- [FIREBASE_DEPLOYMENT.md](FIREBASE_DEPLOYMENT.md) - Firebase setup

## Summary

### Problem
✅ **SOLVED**: Users seeing stale cached JavaScript after deployments

### Solution
✅ **IMPLEMENTED**: Cache headers + automatic version checking

### Benefits
- 🎯 **Automatic**: No manual intervention needed
- 🎯 **User-friendly**: Clear notification with action buttons
- 🎯 **Reliable**: Works across all browsers
- 🎯 **Fast**: Detects updates within 5 minutes
- 🎯 **Safe**: Hard reload ensures fresh code

### Deployment
✅ **DEPLOYED**: Live on production (commit bf40c47)

**Production URLs**:
- https://skill-lab-web.vercel.app
- https://skilab.uok.com

**Status**: ✅ Fully operational and tested
