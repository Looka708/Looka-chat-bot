# 🔍 Diagnostic Steps - Let's Find the Issue

## Step 1: Check Environment Variable

After redeploying, visit this URL in your browser:

```
https://your-project.vercel.app/api/check
```

This will show if `OPENROUTER_API_KEY` is set.

**Expected result:**
```json
{
  "environmentVariableSet": true,
  "keyLength": 64,
  "keyPrefix": "sk-or-v1-...",
  "allEnvVars": ["OPENROUTER_API_KEY"],
  "timestamp": "2026-01-24T..."
}
```

**If you see `"environmentVariableSet": false`:**
- The environment variable is NOT set in Vercel
- You need to add it

---

## Step 2: Add Environment Variable (If Missing)

### Via Vercel Dashboard:

1. Go to: https://vercel.com/dashboard
2. Click your project
3. Click **"Settings"**
4. Click **"Environment Variables"**
5. Click **"Add New"**
6. Enter:
   - **Name**: `OPENROUTER_API_KEY`
   - **Value**: Your API key (from https://openrouter.ai/keys)
   - **Environment**: Check ALL three (Production, Preview, Development)
7. Click **"Save"**
8. Go to **"Deployments"** tab
9. Click **"..."** on latest deployment
10. Click **"Redeploy"**

### Via CLI:

```bash
cd "c:\Users\-_-\Desktop\Looka chat bot"

# Add the variable
vercel env add OPENROUTER_API_KEY production

# When prompted, paste your API key

# Also add for preview and development
vercel env add OPENROUTER_API_KEY preview
vercel env add OPENROUTER_API_KEY development

# Redeploy
vercel --prod
```

---

## Step 3: Verify in Console

After redeployment, open your site and press F12. Run:

```javascript
// Check config
console.log('USE_PROXY:', window.CONFIG?.USE_PROXY);
console.log('VERSION:', window.CONFIG?.VERSION);

// Test proxy endpoint
fetch('/api/check')
  .then(r => r.json())
  .then(d => console.log('Environment check:', d))
  .catch(e => console.error('Check failed:', e));
```

---

## Step 4: Test Proxy

Visit: `https://your-project.vercel.app/test-proxy.html`

Click "Test Proxy" button.

**Expected:** ✅ "Proxy Working!" with AI response

**If error:** Shows what's wrong

---

## Common Issues:

### Issue 1: Environment variable not set
**Solution:** Follow Step 2 above

### Issue 2: Variable set but not redeployed
**Solution:** Redeploy after adding variable

### Issue 3: Variable set for wrong environment
**Solution:** Make sure it's set for "Production"

### Issue 4: Browser cache
**Solution:** 
- Hard refresh: `Ctrl + Shift + R`
- Or use incognito mode

---

## What to Share:

Please share the output of:

1. **`/api/check` endpoint** - Shows if env var is set
2. **Browser console** - Shows config and errors
3. **`/test-proxy.html`** - Shows if proxy works

This will help me identify the exact issue!

---

## Quick Checklist:

- [ ] Deployed latest code
- [ ] Added `OPENROUTER_API_KEY` to Vercel
- [ ] Selected "Production" environment
- [ ] Redeployed after adding variable
- [ ] Hard refreshed browser (Ctrl+Shift+R)
- [ ] Checked `/api/check` shows variable is set
- [ ] Tested `/test-proxy.html`

---

**Let me know what `/api/check` shows!** 🔍
