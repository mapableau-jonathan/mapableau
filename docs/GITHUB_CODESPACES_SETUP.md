# GitHub Codespaces Setup Guide

Use GitHub Codespaces to develop your project in the cloud - no local installation needed!

## What is GitHub Codespaces?

GitHub Codespaces is a cloud-based development environment that runs in your browser. It includes:
- ✅ Full VS Code interface
- ✅ Pre-configured with Node.js, npm, and all tools
- ✅ Terminal access
- ✅ Git integration
- ✅ Free for public repositories (60 hours/month)
- ✅ Paid plans available for private repos

## Step-by-Step Setup

### Step 1: Push Your Code to GitHub

If you don't have a GitHub repository yet:

1. **Create a GitHub Account** (if you don't have one):
   - Go to [github.com](https://github.com)
   - Sign up for free

2. **Create a New Repository**:
   - Click the "+" icon → "New repository"
   - Name it: `mapableau` (or any name)
   - Choose **Public** (free Codespaces) or **Private** (requires paid plan)
   - Don't initialize with README (you already have code)
   - Click "Create repository"

3. **Push Your Code** (if you have Git installed locally):

   ```powershell
   # Navigate to your project
   cd "G:\Operations\MapAble\mapableau-main\mapableau-main"
   
   # Initialize git (if not already done)
   git init
   
   # Add all files
   git add .
   
   # Create initial commit
   git commit -m "Initial commit: MapAble project with Google Maps, Twilio, and Coinbase integrations"
   
   # Add remote repository (replace YOUR_USERNAME and REPO_NAME)
   git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
   
   # Push to GitHub
   git push -u origin main
   ```

4. **Alternative: Upload via Web Interface**:
   - If Git isn't installed, you can upload files directly:
   - Go to your repository on GitHub
   - Click "uploading an existing file"
   - Drag and drop your project folder
   - Commit the changes

### Step 2: Open in Codespaces

1. **Navigate to Your Repository**:
   - Go to `https://github.com/YOUR_USERNAME/REPO_NAME`

2. **Open Codespace**:
   - Click the green "Code" button
   - Select the "Codespaces" tab
   - Click "Create codespace on main" (or your branch)
   - Wait 1-2 minutes for the environment to load

3. **Codespace Opens**:
   - A new browser tab opens with VS Code interface
   - Your code is already there
   - Terminal is ready to use

### Step 3: Install Dependencies

Once Codespaces loads, the terminal is ready:

```bash
# Dependencies install automatically, but if needed:
npm install

# Or if you prefer pnpm:
npm install -g pnpm
pnpm install
```

### Step 4: Set Up Environment Variables

1. **Create `.env` file**:
   - In Codespaces, create a `.env` file in the root
   - Copy from `.env.example`
   - Add your API keys:
     ```bash
     # Google Maps
     NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
     
     # Twilio
     TWILIO_ACCOUNT_SID=your_sid_here
     TWILIO_AUTH_TOKEN=your_token_here
     TWILIO_PHONE_NUMBER=+1234567890
     TWILIO_VERIFY_SERVICE_SID=your_service_sid
     
     # Coinbase
     COINBASE_API_KEY=your_key_here
     COINBASE_API_SECRET=your_secret_here
     COINBASE_WEBHOOK_SECRET=your_webhook_secret
     
     # Database and Auth (required)
     DATABASE_URL=your_database_url
     NEXTAUTH_URL=https://your-codespace-url
     NEXTAUTH_SECRET=your_secret_here
     ```

2. **Use GitHub Secrets** (for production):
   - Go to repository → Settings → Secrets and variables → Actions
   - Add secrets there for CI/CD

### Step 5: Run Development Server

```bash
# Start the development server
npm run dev

# The server will start on port 3000
# Codespaces will show a popup to open the port
# Click "Open in Browser" or use the forwarded URL
```

### Step 6: Access Your Application

1. **Port Forwarding**:
   - Codespaces automatically forwards ports
   - Look for a popup or notification
   - Click "Open in Browser"

2. **Public URL**:
   - Codespaces provides a public URL
   - Format: `https://YOUR-CODESPACE-NAME-3000.app.github.dev`
   - Share this URL to test your app

## Codespaces Features

### Terminal Access
- Full bash terminal
- All Linux commands available
- Node.js, npm, git pre-installed

### VS Code Interface
- Full editor with IntelliSense
- Extensions support
- Debugging capabilities
- Git integration

### Port Forwarding
- Automatic port detection
- Public URLs for testing
- Share with team members

### Persistence
- Your code is saved to GitHub
- Codespace settings persist
- Can stop and restart anytime

## Managing Codespaces

### Stop Codespace
- Click your profile → Codespaces
- Find your codespace
- Click "..." → Stop

### Resume Codespace
- Go to github.com/codespaces
- Click on your codespace
- It resumes where you left off

### Delete Codespace
- Settings → Codespaces → Delete
- Your code is safe in GitHub

## Cost Information

### Free Tier (Public Repos)
- ✅ 60 hours/month free
- ✅ 2-core machine
- ✅ 4GB RAM
- ✅ 32GB storage

### Paid Plans (Private Repos)
- $0.18/hour for 2-core
- $0.36/hour for 4-core
- $0.72/hour for 8-core

**Tip**: Use public repos for free Codespaces, or use Replit (see below) for free private repos.

## Troubleshooting

### Codespace Won't Start
- Check repository is accessible
- Try creating a new codespace
- Check GitHub status page

### Dependencies Won't Install
- Check `package.json` is correct
- Try: `npm cache clean --force`
- Then: `npm install`

### Port Not Forwarding
- Check if server is running
- Look for port forwarding notification
- Manually forward: Ports tab → Forward Port

### Environment Variables Not Working
- Restart the development server after adding `.env`
- Check `.env` file is in root directory
- Verify no syntax errors in `.env`

## Best Practices

1. **Commit Often**:
   - Your code is saved to GitHub
   - Commit frequently to preserve work

2. **Use `.gitignore`**:
   - Don't commit `.env` files
   - Already configured in your project

3. **Stop When Not Using**:
   - Stop codespace to save hours
   - Resume anytime

4. **Use Branching**:
   - Create branches for features
   - Test in separate codespaces

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Open in Codespaces
3. ✅ Install dependencies
4. ✅ Set up environment variables
5. ✅ Run development server
6. ✅ Start developing!

For Replit setup, see: `REPLIT_SETUP.md`
