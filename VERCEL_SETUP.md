# 🔧 Vercel Deployment - Environment Variables Setup

## ⚠️ Fixing the "Secret does not exist" Error

If you're seeing this error:
```
Environment Variable "OPENROUTER_API_KEY" references Secret "openrouter-api-key", which does not exist.
```

**Don't worry!** This is fixed. Follow the steps below to add environment variables correctly.

---

## ✅ Method 1: Add via Vercel Dashboard (Easiest)

### Step 1: Go to Your Project Settings

1. Open your project in Vercel Dashboard: https://vercel.com/dashboard
2. Click on your **Looka AI** project
3. Click **"Settings"** tab
4. Click **"Environment Variables"** in the left sidebar

### Step 2: Add Environment Variables

Add these **3 environment variables** one by one:

#### Variable 1: OpenRouter API Key
- **Name**: `OPENROUTER_API_KEY`
- **Value**: Your OpenRouter API key (starts with `sk-or-v1-...`)
- **Environment**: Select **Production**, **Preview**, and **Development**
- Click **"Save"**

#### Variable 2: Supabase URL
- **Name**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: Your Supabase URL (e.g., `https://xxxxx.supabase.co`)
- **Environment**: Select **Production**, **Preview**, and **Development**
- Click **"Save"**

#### Variable 3: Supabase Anon Key
- **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: Your Supabase anon key (starts with `eyJhbGc...`)
- **Environment**: Select **Production**, **Preview**, and **Development**
- Click **"Save"**

### Step 3: Redeploy

1. Go to **"Deployments"** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete

✅ **Done!** Your app should now work correctly.

---

## ✅ Method 2: Add via Vercel CLI

### Step 1: Install Vercel CLI (if not installed)

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Link Your Project

```bash
cd "c:\Users\-_-\Desktop\Looka chat bot"
vercel link
```

### Step 4: Add Environment Variables

```bash
# Add OpenRouter API Key
vercel env add OPENROUTER_API_KEY production
# Paste your API key when prompted

# Add Supabase URL
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Paste your Supabase URL when prompted

# Add Supabase Anon Key
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Paste your Supabase anon key when prompted
```

### Step 5: Add for Preview and Development (Optional)

```bash
# For preview deployments
vercel env add OPENROUTER_API_KEY preview
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview

# For development
vercel env add OPENROUTER_API_KEY development
vercel env add NEXT_PUBLIC_SUPABASE_URL development
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development
```

### Step 6: Redeploy

```bash
vercel --prod
```

✅ **Done!** Your app should now work correctly.

---

## 🔑 Where to Get Your API Keys

### OpenRouter API Key

1. Go to https://openrouter.ai/keys
2. Sign in or create an account
3. Click **"Create Key"**
4. Copy the key (starts with `sk-or-v1-...`)
5. **Important**: Save it somewhere safe - you won't see it again!

### Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **"Settings"** (gear icon)
4. Click **"API"** in the left sidebar
5. Copy:
   - **URL**: Under "Project URL"
   - **Anon Key**: Under "Project API keys" → "anon public"

---

## 🧪 Testing Your Deployment

After adding environment variables and redeploying:

1. **Visit your deployment URL** (e.g., `https://your-project.vercel.app`)
2. **Test the chat**:
   - Type a message
   - Press Enter
   - You should see an AI response
3. **Check chat history**:
   - Send a few messages
   - Refresh the page
   - Your chat should be saved in the sidebar
4. **Test file upload**:
   - Click the paperclip icon
   - Upload an image
   - Send a message about it

---

## 🐛 Troubleshooting

### Issue: Still getting errors after adding variables

**Solution**: Make sure you selected all environments (Production, Preview, Development) when adding variables.

### Issue: Chat history not saving

**Solution**: 
1. Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
2. Verify your Supabase database has the `chats` table (see README.md for SQL)

### Issue: API calls failing

**Solution**:
1. Verify `OPENROUTER_API_KEY` is correct
2. Check that you have credits in your OpenRouter account
3. Make sure `USE_PROXY` is set to `true` in `config.js`

### Issue: Environment variables not loading

**Solution**:
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Click **"Redeploy"** after adding variables
3. Clear browser cache and try again

---

## 📋 Checklist

Before deploying, make sure:

- [ ] `vercel.json` doesn't have the `env` section (fixed automatically)
- [ ] `USE_PROXY` is set to `true` in `config.js`
- [ ] You have your OpenRouter API key ready
- [ ] You have your Supabase credentials ready
- [ ] Supabase database has the `chats` table created

After deploying:

- [ ] Added all 3 environment variables in Vercel
- [ ] Selected all environments (Production, Preview, Development)
- [ ] Redeployed the project
- [ ] Tested chat functionality
- [ ] Tested chat history saving
- [ ] Tested file uploads

---

## 💡 Pro Tips

1. **Use different API keys** for production and development
2. **Set spending limits** in OpenRouter to avoid unexpected charges
3. **Enable Vercel Analytics** to monitor your app's performance
4. **Set up custom domain** for a professional look
5. **Enable preview deployments** for testing before going live

---

## 🆘 Still Having Issues?

If you're still experiencing problems:

1. **Check Vercel Logs**:
   ```bash
   vercel logs
   ```

2. **Check Browser Console**:
   - Open DevTools (F12)
   - Look for errors in the Console tab

3. **Verify Environment Variables**:
   ```bash
   vercel env ls
   ```

4. **Contact Support**:
   - Vercel Support: https://vercel.com/support
   - OpenRouter Support: https://openrouter.ai/docs
   - Supabase Support: https://supabase.com/support

---

## ✅ Success!

Once everything is working, you should see:

- ✅ Chat interface loads
- ✅ AI responds to messages
- ✅ Chat history saves and loads
- ✅ File uploads work
- ✅ Model switching works
- ✅ No errors in console

**Congratulations! Your Looka AI chatbot is now live! 🎉**

Share your deployment URL and start chatting!
