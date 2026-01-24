# 🔑 Adding Environment Variables to Vercel

## ✅ You're Almost There!

The site is loading, but you need to add the **OPENROUTER_API_KEY** environment variable.

---

## 🚀 Quick Fix (2 Minutes)

### **Method 1: Via Vercel Dashboard (Easiest)**

1. **Go to your project**: https://vercel.com/dashboard
2. **Click on your project** (Looka AI)
3. **Click "Settings"** tab
4. **Click "Environment Variables"** in the left sidebar
5. **Add the variable**:
   - **Name**: `OPENROUTER_API_KEY`
   - **Value**: Your API key (starts with `sk-or-v1-...`)
   - **Environment**: Select **Production**, **Preview**, and **Development**
   - Click **"Save"**
6. **Redeploy**:
   - Go to "Deployments" tab
   - Click "..." menu on latest deployment
   - Click "Redeploy"

✅ **Done!** Wait 1-2 minutes for deployment to complete.

---

### **Method 2: Via CLI (Fast)**

```bash
# Navigate to your project
cd "c:\Users\-_-\Desktop\Looka chat bot"

# Add the environment variable
vercel env add OPENROUTER_API_KEY production

# When prompted, paste your API key (starts with sk-or-v1-...)

# Also add for preview and development (optional)
vercel env add OPENROUTER_API_KEY preview
vercel env add OPENROUTER_API_KEY development

# Redeploy
vercel --prod
```

---

## 🔑 Where to Get Your API Key

### OpenRouter API Key

1. Go to: https://openrouter.ai/keys
2. **Sign in** or create an account
3. Click **"Create Key"**
4. **Copy the key** (starts with `sk-or-v1-...`)
5. **Important**: Save it somewhere safe!

---

## 🧪 Testing After Adding the Key

1. **Wait for deployment** to complete (~1-2 minutes)
2. **Visit your site**: `https://your-project.vercel.app`
3. **Type a message** in the chat
4. **Press Enter**
5. **You should see**: AI response! ✅

---

## 🎯 What We Fixed

### 1. **Enabled Proxy Mode** ✅
   - Changed `USE_PROXY: true` in `config.js`
   - Now API calls go through `/api/proxy`

### 2. **Updated Proxy** ✅
   - Fixed CommonJS compatibility
   - Added better error handling
   - Improved CORS handling

### 3. **What You Need to Do** 🔑
   - Add `OPENROUTER_API_KEY` to Vercel
   - Redeploy

---

## 📋 Complete Environment Variables Checklist

Add these **3 environment variables** in Vercel:

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENROUTER_API_KEY` | ✅ **YES** | AI model access |
| `NEXT_PUBLIC_SUPABASE_URL` | ⚠️ Optional | Chat history |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⚠️ Optional | Chat history |

**Note**: Supabase variables are only needed if you want chat history to persist.

---

## 🐛 Troubleshooting

### Issue: Still seeing "API key missing"

**Solution**: 
1. Make sure you added the variable to **Production** environment
2. Make sure you **redeployed** after adding the variable
3. Clear browser cache and try again

### Issue: "Server not configured" error

**Solution**:
1. Check the variable name is exactly: `OPENROUTER_API_KEY`
2. Check the value starts with `sk-or-v1-`
3. Redeploy the project

### Issue: API calls failing

**Solution**:
1. Check you have credits in your OpenRouter account
2. Verify the API key is valid
3. Check Vercel function logs for errors

---

## 📊 Verify Environment Variables

### Via CLI:
```bash
# List all environment variables
vercel env ls

# You should see:
# OPENROUTER_API_KEY (Production, Preview, Development)
```

### Via Dashboard:
1. Go to Settings → Environment Variables
2. You should see `OPENROUTER_API_KEY` listed

---

## ✅ Success Checklist

After adding the environment variable:

- [ ] Added `OPENROUTER_API_KEY` to Vercel
- [ ] Selected Production environment
- [ ] Redeployed the project
- [ ] Waited for deployment to complete
- [ ] Visited the site
- [ ] Tested chat functionality
- [ ] Received AI response ✅

---

## 🎉 You're Done!

Once you add the environment variable and redeploy:

1. ✅ Site loads correctly
2. ✅ Chat interface works
3. ✅ AI responds to messages
4. ✅ No more "API key missing" error

**Your Looka AI chatbot is now fully deployed! 🚀**

---

## 💡 Next Steps (Optional)

1. **Add Supabase** for chat history:
   - Add `NEXT_PUBLIC_SUPABASE_URL`
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Create the `chats` table (see README.md)

2. **Add Custom Domain**:
   - Go to Settings → Domains
   - Add your domain
   - Configure DNS

3. **Enable Analytics**:
   - Go to Analytics tab
   - View usage stats

4. **Set Spending Limits**:
   - Go to OpenRouter dashboard
   - Set monthly spending limit

---

**Need help? Let me know once you've added the environment variable!** 🚀
