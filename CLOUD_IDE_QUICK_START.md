# Cloud IDE Quick Start

Choose GitHub Codespaces or Replit - both work great!

## 🚀 GitHub Codespaces (Recommended for GitHub Users)

### Quick Steps:
1. **Push code to GitHub** (if not already)
2. **Open repository** on GitHub
3. **Click "Code" → "Codespaces" → "Create codespace"**
4. **Wait 1-2 minutes** for environment to load
5. **Run**: `npm install` (if needed)
6. **Run**: `npm run dev`
7. **Done!** Your app is running

**Pros:**
- ✅ Full VS Code interface
- ✅ Free for public repos (60 hours/month)
- ✅ Integrated with GitHub

**See full guide**: `docs/GITHUB_CODESPACES_SETUP.md`

---

## 🎨 Replit (Recommended for Quick Start)

### Quick Steps:
1. **Go to**: [replit.com](https://replit.com) and sign up (free)
2. **Click "Create Repl"**
3. **Search "Next.js"** and select template
4. **Import from GitHub** or upload files
5. **Click "Run"** - dependencies install automatically
6. **Add environment variables** in Secrets tab
7. **Done!** Your app is running

**Pros:**
- ✅ Completely free (public and private)
- ✅ Fastest setup (~2 minutes)
- ✅ Built-in deployment
- ✅ Always-on repls

**See full guide**: `docs/REPLIT_SETUP.md`

---

## 📋 Which Should You Choose?

### Choose **GitHub Codespaces** if:
- ✅ You already use GitHub
- ✅ You want VS Code interface
- ✅ You have a public repository
- ✅ You want GitHub integration

### Choose **Replit** if:
- ✅ You want the fastest setup
- ✅ You need private repos for free
- ✅ You want built-in deployment
- ✅ You prefer simpler interface

---

## 🔑 Environment Variables Needed

Both platforms need these (add in Secrets/Environment):

```bash
# Required
DATABASE_URL=your_database_url
NEXTAUTH_URL=your_app_url
NEXTAUTH_SECRET=your_secret

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key

# Twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_VERIFY_SERVICE_SID=your_service_sid

# Coinbase
COINBASE_API_KEY=your_key
COINBASE_API_SECRET=your_secret
COINBASE_WEBHOOK_SECRET=your_webhook_secret
```

---

## ⚡ Quick Comparison

| Feature | GitHub Codespaces | Replit |
|---------|------------------|--------|
| **Setup Time** | 3-5 minutes | 2 minutes |
| **Cost** | Free (public) | Free (all) |
| **Private Repos** | Paid | Free |
| **Interface** | VS Code | Custom |
| **Auto-Install** | ✅ | ✅ |
| **Deployment** | Manual | Built-in |

---

## 🎯 Next Steps

1. **Choose your platform** (Codespaces or Replit)
2. **Follow the setup guide** for your choice
3. **Add environment variables**
4. **Run `npm install`** (if needed)
5. **Run `npm run dev`**
6. **Start coding!**

Both platforms handle Node.js installation automatically - no local setup needed!

---

## 📚 Full Guides

- **GitHub Codespaces**: See `docs/GITHUB_CODESPACES_SETUP.md`
- **Replit**: See `docs/REPLIT_SETUP.md`
