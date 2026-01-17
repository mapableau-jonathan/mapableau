# Replit Setup Guide

Use Replit as your cloud IDE - completely free and no installation needed!

## What is Replit?

Replit is a cloud-based IDE that:
- ✅ Works entirely in your browser
- ✅ Free for all projects (public and private)
- ✅ Auto-detects and installs dependencies
- ✅ Built-in terminal and package manager
- ✅ Instant deployment
- ✅ No credit card required

## Step-by-Step Setup

### Step 1: Create Replit Account

1. **Sign Up**:
   - Go to [replit.com](https://replit.com)
   - Click "Sign up" (free)
   - Use GitHub, Google, or email

2. **Verify Email** (if using email)

### Step 2: Create New Repl

1. **Click "Create Repl"**:
   - Top right corner
   - Or go to [replit.com/new](https://replit.com/new)

2. **Choose Template**:
   - Search for: **"Next.js"** or **"Node.js"**
   - Select "Next.js" template
   - Or select "Node.js" if Next.js not available

3. **Configure Repl**:
   - **Title**: `MapAble` (or any name)
   - **Description**: "NDIS platform with Google Maps, Twilio, and Coinbase"
   - **Visibility**: Public or Private (both free!)
   - Click "Create Repl"

### Step 3: Import Your Code

You have two options:

#### Option A: Import from GitHub (Recommended)

1. **Push to GitHub First** (see GitHub Codespaces guide)
2. **In Replit**:
   - Click "Import from GitHub" button
   - Or go to: [replit.com/github](https://replit.com/github)
   - Enter your GitHub repository URL
   - Click "Import"
   - Replit clones your repository

#### Option B: Upload Files Manually

1. **Delete Default Files**:
   - Delete `index.js` or default files in Replit

2. **Upload Your Project**:
   - Click the "Files" icon (left sidebar)
   - Click "Upload file" or drag and drop
   - Upload all your project files
   - Or use the "Upload folder" option

3. **Organize Files**:
   - Make sure `package.json` is in root
   - Ensure all folders are uploaded correctly

### Step 4: Install Dependencies

Replit comes with **npm pre-installed**! You have multiple options:

#### Option A: Use npm in Terminal (Recommended)

1. **Open Shell** (Terminal):
   - Click "Shell" tab at bottom
   - Or use keyboard shortcut

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Wait for Installation**:
   - Replit shows progress
   - Usually takes 1-2 minutes

#### Option B: Use Replit Packages UI

1. **Click "Packages" icon** in left sidebar
2. **Search for packages** you need
3. **Click "Install"** - Replit uses npm under the hood
4. **Or manually add** to `package.json` and run `npm install`

#### Option C: Use Other Package Managers

Replit supports all Node.js package managers:

```bash
# npm (pre-installed)
npm install

# yarn (install first)
npm install -g yarn
yarn install

# pnpm (install first)
npm install -g pnpm
pnpm install

# bun (install first)
curl -fsSL https://bun.sh/install | bash
bun install
```

**Note**: Replit auto-detects `package.json` and may auto-install dependencies when you click "Run".

### Step 5: Configure Environment Variables

1. **Open Secrets Tab**:
   - Click the "Secrets" icon (lock icon) in left sidebar
   - Or go to: Tools → Secrets

2. **Add Environment Variables**:
   Click "New secret" for each:

   ```
   Key: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
   Value: your_google_maps_api_key
   ```

   Add all required variables:
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `TWILIO_VERIFY_SERVICE_SID`
   - `COINBASE_API_KEY`
   - `COINBASE_API_SECRET`
   - `COINBASE_WEBHOOK_SECRET`
   - `DATABASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`

3. **Alternative: Create `.env` File**:
   - Create `.env` file in root
   - Add all variables (not recommended for production)
   - Replit will use it

### Step 6: Configure Replit for Next.js

1. **Check `.replit` File**:
   - Replit should auto-detect Next.js
   - If not, create `.replit` file:

   ```toml
   language = "nodejs"
   run = "npm run dev"
   ```

2. **Update `replit.nix`** (if exists):
   ```nix
   { pkgs }: {
     deps = [
       pkgs.nodejs-18_x
       pkgs.nodePackages.npm
     ];
   }
   ```

### Step 7: Run Development Server

1. **Click "Run" Button**:
   - Top center of Replit interface
   - Or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

2. **Wait for Server**:
   - Replit shows "Starting..."
   - Then "Running on http://localhost:3000"

3. **Open Webview**:
   - Replit automatically opens webview
   - Or click the webview panel
   - Your app loads there

### Step 8: Access Your Application

1. **Webview Tab**:
   - Built-in browser in Replit
   - Shows your running app

2. **Public URL** (if enabled):
   - Replit provides public URL
   - Format: `https://YOUR-REPL-NAME.YOUR-USERNAME.repl.co`
   - Share this URL

## Replit Features

### Always-On
- ✅ Repl runs continuously (free tier)
- ✅ No need to restart
- ✅ Auto-saves your code

### Package Manager
- ✅ **npm pre-installed** (Node Package Manager)
- ✅ Full npm CLI access in terminal
- ✅ Click "Packages" UI to search and install (uses npm)
- ✅ Supports yarn, pnpm, and bun
- ✅ Auto-installs from `package.json` when you run the project

### Terminal Access
- ✅ Full bash terminal
- ✅ All Linux commands
- ✅ Git pre-installed

### Version Control
- ✅ Built-in Git
- ✅ Push to GitHub easily
- ✅ Commit history

### Collaboration
- ✅ Share repl with others
- ✅ Real-time collaboration
- ✅ Comments and chat

## Replit vs GitHub Codespaces

| Feature | Replit | GitHub Codespaces |
|---------|--------|-------------------|
| **Cost** | Free (all features) | Free (public repos only) |
| **Private Repos** | ✅ Free | ❌ Requires paid plan |
| **Setup Time** | ~2 minutes | ~3-5 minutes |
| **Auto-Install** | ✅ Yes | ✅ Yes |
| **Deployment** | ✅ Built-in | ⚠️ Manual |
| **VS Code** | ⚠️ Custom interface | ✅ Full VS Code |

## Troubleshooting

### Dependencies Won't Install
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Server Won't Start
- Check `package.json` has correct scripts
- Verify `next` is installed
- Check terminal for errors

### Environment Variables Not Working
- Use Secrets tab (recommended)
- Or create `.env` file
- Restart the repl after adding

### Port Issues
- Next.js uses port 3000 by default
- Replit auto-forwards ports
- Check webview is open

### Import from GitHub Fails
- Verify repository is public (or you have access)
- Check repository URL is correct
- Try manual upload instead

## Deployment on Replit

Replit can deploy your app:

1. **Click "Deploy" Button**:
   - Top right corner
   - Or go to: Deploy → Deploy to Replit

2. **Configure Deployment**:
   - Choose deployment type
   - Set environment variables
   - Click "Deploy"

3. **Get Public URL**:
   - Replit provides permanent URL
   - Share with users

## Best Practices

1. **Use Secrets for API Keys**:
   - Never commit `.env` to public repos
   - Use Replit Secrets tab

2. **Commit to GitHub**:
   - Connect to GitHub
   - Push regularly for backup

3. **Use .gitignore**:
   - Already configured in your project
   - Prevents committing sensitive files

4. **Organize Files**:
   - Keep project structure clean
   - Use folders properly

## Next Steps

1. ✅ Create Replit account
2. ✅ Create new Repl (Next.js template)
3. ✅ Import code from GitHub or upload files
4. ✅ Install dependencies
5. ✅ Set up environment variables (Secrets)
6. ✅ Run development server
7. ✅ Start developing!

## Quick Commands Reference

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Install a package
npm install package-name

# Check Node version
node --version

# Check npm version
npm --version
```

## Support

- **Replit Docs**: [docs.replit.com](https://docs.replit.com)
- **Community**: [replit.com/talk](https://replit.com/talk)
- **Discord**: [discord.gg/replit](https://discord.gg/replit)

For GitHub Codespaces setup, see: `GITHUB_CODESPACES_SETUP.md`
