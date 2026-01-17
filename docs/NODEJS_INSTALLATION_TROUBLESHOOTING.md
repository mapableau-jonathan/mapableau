# Node.js Installation Troubleshooting

If Node.js installation failed, here are solutions and alternatives.

## Common Installation Errors & Solutions

### Error 1: "Access Denied" or Permission Issues

**Solution:**
1. Run the installer as Administrator:
   - Right-click the Node.js installer
   - Select "Run as administrator"
   - Complete the installation

2. Check antivirus/security software:
   - Temporarily disable antivirus
   - Add Node.js installer to exclusions
   - Try installation again

### Error 2: "Installation Failed" or "Error 2503"

**Solution:**
1. Clean previous installation attempts:
   ```powershell
   # Check if Node.js is partially installed
   Get-ChildItem "C:\Program Files\nodejs" -ErrorAction SilentlyContinue
   
   # If exists, delete it manually
   # Then try installing again
   ```

2. Use Windows Installer Cleanup:
   - Download Microsoft Program Install and Uninstall Troubleshooter
   - Run it to fix installer issues

3. Try different installer:
   - Download the .zip portable version instead
   - See "Portable Node.js" section below

### Error 3: "Path Too Long" or "Invalid Path"

**Solution:**
1. Install to a shorter path:
   - Default: `C:\Program Files\nodejs\`
   - Try: `C:\nodejs\` instead

2. Enable long path support in Windows:
   - Open Registry Editor (regedit)
   - Navigate to: `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem`
   - Set `LongPathsEnabled` to `1`
   - Restart computer

### Error 4: "MSI Installation Failed"

**Solution:**
1. Repair Windows Installer:
   ```powershell
   # Run as Administrator
   msiexec /unregister
   msiexec /regserver
   ```

2. Try alternative installer format:
   - Use the .zip portable version
   - Or try the .exe installer if available

### Error 5: Corporate/Admin Restrictions

**Solution:**
1. Contact IT administrator for installation permissions
2. Use portable version (doesn't require admin rights)
3. Use online IDE (GitHub Codespaces, GitPod)

---

## Alternative: Portable Node.js (No Installation Required)

This method doesn't require running an installer:

### Step 1: Download Portable Node.js

1. Go to: https://nodejs.org/dist/
2. Find the latest LTS version (e.g., v20.x.x)
3. Download: `node-v20.x.x-win-x64.zip` (NOT the .msi installer)
4. Extract to a folder (e.g., `C:\nodejs` or `G:\nodejs`)

### Step 2: Use Portable Node.js

**Option A: Add to PATH Temporarily (Each Session)**

```powershell
# In PowerShell, each time you open it:
$env:Path += ";C:\nodejs"
node --version
npm --version
```

**Option B: Create a Batch File**

Create `start-node.bat` in your project folder:

```batch
@echo off
set PATH=%PATH%;C:\nodejs
cmd /k
```

Double-click this file to open a terminal with Node.js in PATH.

**Option C: Use Full Path**

Instead of `npm install`, use:
```powershell
C:\nodejs\npm.cmd install
```

### Step 3: Install Dependencies

```powershell
# Navigate to project
cd "G:\Operations\MapAble\mapableau-main\mapableau-main"

# Use full path to npm
C:\nodejs\npm.cmd install

# Or if you added to PATH
npm install
```

---

## Alternative: Use Bun (No Node.js Required)

Bun is a JavaScript runtime that doesn't require Node.js:

### Install Bun

```powershell
# Run in PowerShell
powershell -c "irm bun.sh/install.ps1 | iex"
```

If that fails, try:
```powershell
# Download and run manually
Invoke-WebRequest -Uri "https://bun.sh/install" -OutFile "bun-install.ps1"
.\bun-install.ps1
```

### Use Bun

```powershell
# Install dependencies
bun install

# Run development server
bun run dev
```

**Note**: Bun is compatible with npm packages and can replace Node.js entirely.

---

## Alternative: Use Online Development Environment

If you cannot install anything locally:

### GitHub Codespaces (Recommended)

1. **Push code to GitHub**:
   ```powershell
   # If you have git installed
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/yourrepo.git
   git push -u origin main
   ```

2. **Open in Codespaces**:
   - Go to your GitHub repository
   - Click "Code" → "Codespaces" → "Create codespace"
   - Wait for environment to load
   - Dependencies install automatically

3. **Work in browser**:
   - Full VS Code interface
   - Terminal access
   - All dependencies pre-installed

### GitPod

1. Push code to GitHub/GitLab
2. Go to: https://gitpod.io/
3. Install GitPod browser extension
4. Click "GitPod" button on your repository
5. Environment loads automatically

### Replit

1. Go to: https://replit.com/
2. Click "Import from GitHub"
3. Enter your repository URL
4. Replit auto-detects and installs dependencies

---

## Alternative: Use Docker (If Available)

If you have Docker Desktop installed:

### Create Dockerfile

Create `Dockerfile` in project root:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

### Build and Run

```powershell
# Build image
docker build -t mapableau .

# Run container
docker run -p 3000:3000 mapableau
```

This doesn't require Node.js on your machine - Docker handles it.

---

## Alternative: Manual Workaround (Temporary)

If you just need to test the integrations without installing dependencies:

### Skip Twilio Package (Temporary)

The Twilio service has a development mode that works without the package:

1. **Modify the service** to use mock mode:
   - The service already has development mode built-in
   - It will work without the `twilio` package in development

2. **For production**, you'll still need the package, but you can:
   - Use an online IDE for production builds
   - Or get Node.js working later

### Test Without Full Installation

You can test the integrations conceptually:
- Google Maps: Just needs the API key in `.env`
- Twilio: Works in mock mode in development
- Coinbase: Needs the package, but you can test the API structure

---

## Quick Diagnostic

Run these to understand the issue:

```powershell
# Check if Node.js is partially installed
Test-Path "C:\Program Files\nodejs\node.exe"

# Check Windows version
winver

# Check if you have admin rights
([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# Check disk space
Get-PSDrive C | Select-Object Used,Free
```

---

## Recommended Next Steps

1. **Try Portable Node.js** (easiest if installer fails):
   - Download .zip version
   - Extract to `C:\nodejs`
   - Use full path: `C:\nodejs\npm.cmd install`

2. **Try Bun** (modern alternative):
   - Doesn't need Node.js
   - Works with npm packages
   - Fast installation

3. **Use Online IDE** (if nothing works):
   - GitHub Codespaces (free for public repos)
   - GitPod
   - Replit

4. **Contact Support**:
   - If corporate restrictions: Contact IT
   - If antivirus blocking: Add exclusions
   - If disk space: Free up space

---

## What Error Did You Get?

Please share:
1. The exact error message from Node.js installer
2. Your Windows version (`winver` command)
3. Whether you have admin rights
4. Any antivirus/security software running

This will help provide a more specific solution.
