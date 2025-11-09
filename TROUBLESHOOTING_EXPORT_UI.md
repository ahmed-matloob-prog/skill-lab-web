# Troubleshooting: Export to Admin UI Not Showing

## Problem
After deployment, the new Export to Admin features (grouped cards, export buttons, edit/delete functionality) are not visible on the Assessments page.

## Step-by-Step Solution

### Step 1: Hard Refresh Your Browser

This forces the browser to download the latest JavaScript files.

**Windows/Linux:**
- Press `Ctrl + Shift + R` OR
- Press `Ctrl + F5`

**Mac:**
- Press `Cmd + Shift + R`

**After hard refresh, go to Step 2.**

---

### Step 2: Clear Browser Cache

If hard refresh doesn't work:

1. Press `F12` to open DevTools
2. **Chrome/Edge:**
   - Go to **Application** tab
   - Click **Storage** in left sidebar
   - Click **Clear site data** button
   - Refresh page

3. **Firefox:**
   - Go to **Storage** tab
   - Right-click on **Storage** → **Clear All**
   - Refresh page

**After clearing cache, go to Step 3.**

---

### Step 3: Verify Deployment Version

Check which version is actually deployed:

1. Open your site: https://skill-lab-qdysgf5aj-ahmed-matloob-progs-projects.vercel.app
2. Press `F12` (DevTools)
3. Go to **Console** tab
4. Type this command and press Enter:
   ```javascript
   fetch('/version.json?' + Date.now()).then(r => r.json()).then(console.log)
   ```
5. Check the timestamp - it should be recent (today's date)

**Expected output:**
```json
{
  "version": "1.0.0",
  "timestamp": 1762696205060,
  "buildDate": "2025-11-09T13:50:05.060Z"
}
```

If timestamp is old → **Deployment didn't complete**. Redeploy:
```bash
cd "C:\Users\ahmed\Documents\python app\skill lab web"
vercel --prod
```

**If version is correct, go to Step 4.**

---

### Step 4: Run Migration Script

The new UI requires existing assessments to have export fields. Run this migration:

1. **Stay logged in** to your app
2. Press `F12` (DevTools) → **Console** tab
3. Copy and paste this script:

```javascript
console.log('🔄 Starting migration...');

try {
  const assessmentsJson = localStorage.getItem('assessments');

  if (!assessmentsJson) {
    console.log('✅ No assessments to migrate');
  } else {
    const assessments = JSON.parse(assessmentsJson);
    console.log(`📊 Found ${assessments.length} assessments`);

    const migrated = assessments.map(assessment => {
      if (assessment.hasOwnProperty('exportedToAdmin')) {
        return assessment; // Already migrated
      }
      return {
        ...assessment,
        exportedToAdmin: false,
        lastEditedAt: assessment.timestamp,
        lastEditedBy: assessment.trainerId,
        editCount: 0,
      };
    });

    localStorage.setItem('assessments', JSON.stringify(migrated));
    console.log('✅ Migration complete!');
    alert('Migration complete! Refresh the page now.');
  }
} catch (error) {
  console.error('❌ Failed:', error);
}
```

4. Press **Enter** to run the script
5. **Refresh the page** (F5)

**After migration and refresh, go to Step 5.**

---

### Step 5: Verify You're in the Right View Mode

The new UI only shows when:

1. ✅ You're on the **Assessments** page
2. ✅ You toggle to **"View Saved"** mode (click the eye icon 👁️)
3. ✅ You select a **specific group** (not "All Groups")
4. ✅ That group has **saved assessments**

**To test:**
1. Go to Assessments page
2. Click the **eye icon** (toggle to "View Saved")
3. Select a group that has assessments from the dropdown
4. You should now see the new UI

**If still not showing, go to Step 6.**

---

### Step 6: Check Browser Console for Errors

1. Press `F12` → **Console** tab
2. Look for any red error messages
3. Take a screenshot and check for these common issues:

**Common Errors:**

- `assessmentPermissions is not defined` → Cache issue, try incognito mode
- `Cannot read property 'canEdit' of undefined` → Import error, check deployment
- `getStudentName is not a function` → Old version loading, clear cache again

**If you see errors, go to Step 7.**

---

### Step 7: Try Incognito/Private Mode

This ensures a completely fresh cache:

1. Open **Incognito/Private window**:
   - **Chrome/Edge:** `Ctrl + Shift + N`
   - **Firefox:** `Ctrl + Shift + P`
   - **Safari:** `Cmd + Shift + N`

2. Navigate to: https://skill-lab-qdysgf5aj-ahmed-matloob-progs-projects.vercel.app

3. Log in as trainer

4. Go to Assessments → Toggle "View Saved" → Select group

**If working in incognito → It's a cache issue. Clear all site data (Step 2) and try again.**

**If NOT working in incognito → Go to Step 8.**

---

### Step 8: Verify File Changes Were Deployed

Check if Assessments.tsx changes are actually on the server:

1. Open: https://skill-lab-qdysgf5aj-ahmed-matloob-progs-projects.vercel.app
2. Press `F12` → **Network** tab
3. Hard refresh (`Ctrl + Shift + R`)
4. Find the main JavaScript file (usually `main.xxxxxxx.js`)
5. Right-click → **Open in new tab**
6. Press `Ctrl + F` to search for: `"Export to Admin"`

**If found** → Deployment worked, cache is the issue (go back to Step 2)
**If NOT found** → Deployment didn't include latest code (go to Step 9)

---

### Step 9: Force Rebuild and Redeploy

If none of the above worked, rebuild and redeploy:

```bash
cd "C:\Users\ahmed\Documents\python app\skill lab web"

# Clean build
rm -rf build node_modules/.cache

# Rebuild
npm run build

# Verify build includes new code
# Check that build/static/js/main.*.js contains "Export to Admin"

# Redeploy
git add -A
git commit -m "Force rebuild - Export to Admin UI"
git push
vercel --prod
```

Wait 2-3 minutes for CDN propagation, then hard refresh.

---

### Step 10: Manual Verification Checklist

If STILL not working, verify these files exist and are correct:

1. **src/utils/assessmentPermissions.ts** - Should have `canEdit`, `canDelete`, etc.
2. **src/types/index.ts** - `AssessmentRecord` should have `exportedToAdmin?`, `exportedAt?`, etc.
3. **src/pages/Assessments.tsx** - Should import `assessmentPermissions` at top
4. **src/services/databaseService.ts** - Should have `exportMultipleAssessmentsToAdmin` function
5. **src/contexts/DatabaseContext.tsx** - Should expose export functions

Run this in console to check:
```javascript
// Check if new imports are loaded
fetch('/static/js/main.' + document.querySelector('script[src*="main"]').src.split('main.')[1])
  .then(r => r.text())
  .then(code => {
    console.log('Has assessmentPermissions:', code.includes('assessmentPermissions'));
    console.log('Has Export to Admin:', code.includes('Export to Admin'));
    console.log('Has exportMultiple:', code.includes('exportMultiple'));
  });
```

---

## Quick Test: Does the New UI Work?

After following steps 1-4, test with this procedure:

### Create New Assessment (Should Have Export Feature):
1. Log in as **trainer** (e.g., saja_adil)
2. Go to **Assessments** page
3. Select a group
4. Fill in assessment details
5. Enter scores for students
6. Click **"Save Assessment Scores"**
7. Toggle to **"View Saved"** mode (eye icon)
8. Select the same group

### Expected Result:
✅ Grouped card with assessment name as header
✅ Chips showing: type, date, max score, student count
✅ Orange badge: "X Draft"
✅ Blue button: "Export to Admin"
✅ Table with columns: Student, Score, Status, Actions
✅ Status shows: "📝 Draft (Editable)"
✅ Actions show: "Edit" and "Delete" buttons

### If You See Old Flat Table:
❌ Cache issue → Repeat Steps 1-2
❌ Migration not run → Repeat Step 4
❌ Wrong view mode → Check Step 5

---

## Still Not Working?

### Debug Information to Collect:

1. **Version check output:**
   ```javascript
   fetch('/version.json?' + Date.now()).then(r => r.json()).then(console.log)
   ```

2. **LocalStorage assessment sample:**
   ```javascript
   JSON.parse(localStorage.getItem('assessments'))[0]
   ```

3. **User info:**
   ```javascript
   JSON.parse(localStorage.getItem('currentUser'))
   ```

4. **Browser and version:**
   - Chrome/Edge/Firefox/Safari
   - Version number

5. **Console errors:**
   - Screenshot of any red errors in console

6. **Network tab:**
   - Screenshot showing main.*.js file loaded
   - Check size and timing

---

## Contact Information

If issue persists after all steps:
1. Collect debug information above
2. Take screenshots of:
   - Assessments page (current view)
   - Browser console (F12)
   - Network tab showing loaded files
3. Note which step failed

---

## Expected Timeline

- **Step 1-3**: 2 minutes
- **Step 4**: 1 minute (migration)
- **Step 5**: 30 seconds (verify view)
- **Step 6-8**: 5 minutes (debugging)
- **Step 9**: 10 minutes (rebuild)

**Most issues resolve at Step 1 or Step 4.**
