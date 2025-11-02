# 🔍 Debug Firebase on Vercel

## Problem: "Firebase: Initialized successfully" not appearing

This means Firebase environment variables aren't being read on Vercel.

---

## Step 1: Verify Variables Are Added

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. **Check**: Do you see all 6 variables listed?
   - `REACT_APP_FIREBASE_API_KEY`
   - `REACT_APP_FIREBASE_AUTH_DOMAIN`
   - `REACT_APP_FIREBASE_PROJECT_ID`
   - `REACT_APP_FIREBASE_STORAGE_BUCKET`
   - `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
   - `REACT_APP_FIREBASE_APP_ID`

3. **Check**: Are they enabled for **Production**?

---

## Step 2: Verify You Redeployed

**Important**: Variables only work after redeploying!

1. Go to **Deployments** tab
2. Check the **latest deployment** - was it **after** you added the variables?
3. If not:
   - Click **"⋯"** (three dots) on latest deployment
   - Click **"Redeploy"**
   - Wait 2-3 minutes

---

## Step 3: Check Browser Console

1. Open your Vercel URL: `skill-lab-web.vercel.app`
2. Open browser console (F12 → Console tab)
3. Look for:
   - ❌ `Firebase: Not configured. Using localStorage fallback.` (means variables missing)
   - ❌ Any errors about `REACT_APP_FIREBASE_*`
   - ✅ `Firebase: Initialized successfully` (good!)

---

## Step 4: Check Vercel Build Logs

1. Go to Vercel Dashboard → Your Project → **Deployments**
2. Click on the **latest deployment**
3. Click **"Build Logs"** or **"Functions"** tab
4. Look for:
   - Any errors about environment variables
   - Build warnings

---

## Step 5: Verify Variable Names Are Correct

Make sure in Vercel they're named **EXACTLY**:
- `REACT_APP_FIREBASE_API_KEY` (not `FIREBASE_API_KEY`)
- `REACT_APP_FIREBASE_AUTH_DOMAIN` (not `FIREBASE_AUTH_DOMAIN`)
- etc.

**All must start with `REACT_APP_`** for React to read them!

---

## Step 6: Test in Browser Console

On your Vercel URL, open console and run:

```javascript
console.log('API Key:', process.env.REACT_APP_FIREBASE_API_KEY);
console.log('Project ID:', process.env.REACT_APP_FIREBASE_PROJECT_ID);
```

**Expected**: You should see the actual values (not `undefined`)

**If you see `undefined`**: Variables aren't set correctly in Vercel.

---

## Common Issues

### Issue 1: Variables Not Applied to Production
**Fix**: In Vercel → Environment Variables → Make sure each variable has ✅ Production checked

### Issue 2: Typo in Variable Names
**Fix**: Check they're exactly `REACT_APP_FIREBASE_*` (not `FIREBASE_*`)

### Issue 3: Didn't Redeploy
**Fix**: Must redeploy after adding variables

### Issue 4: Values Have Extra Spaces
**Fix**: Make sure values don't have quotes or spaces around them

---

## Quick Test

1. **Add/Verify variables** in Vercel (all 6, all starting with `REACT_APP_`)
2. **Redeploy** (Deployments → Latest → Redeploy)
3. **Wait 2-3 minutes** for build
4. **Open Vercel URL** → F12 → Console
5. **Look for**: `Firebase: Initialized successfully`

If still not working, share:
- What you see in browser console
- What the build logs show
- Screenshot of your Vercel Environment Variables page

