# Using npm in Replit

## Yes, npm is Pre-Installed!

Replit comes with **npm (Node Package Manager)** pre-installed and ready to use. You don't need to install it separately.

## How to Use npm in Replit

### Method 1: Terminal/Shell (Standard Way)

1. **Open the Shell tab** (bottom of Replit interface)
2. **Use npm commands** just like you would locally:

```bash
# Install all dependencies from package.json
npm install

# Install a specific package
npm install package-name

# Install as dev dependency
npm install --save-dev package-name

# Install globally
npm install -g package-name

# Run npm scripts
npm run dev
npm run build
npm start

# Check npm version
npm --version

# Check Node.js version
node --version
```

### Method 2: Replit Packages UI

Replit also provides a visual interface:

1. **Click "Packages" icon** in the left sidebar
2. **Search for packages** you want to install
3. **Click "Install"** button
4. Replit uses npm under the hood to install

**Note**: The Packages UI is just a visual wrapper around npm - it does the same thing as `npm install`.

### Method 3: Auto-Install on Run

When you click the **"Run"** button:
- Replit detects `package.json`
- Automatically runs `npm install` if needed
- Then runs your start script

## Example: Installing Your Project Dependencies

For your MapAble project:

```bash
# In Replit Shell, run:
npm install

# This will install all packages from package.json including:
# - twilio (for SMS)
# - next (Next.js framework)
# - react, react-dom
# - All other dependencies
```

## Available Package Managers in Replit

Replit supports all popular Node.js package managers:

### npm (Pre-installed)
```bash
npm install
npm run dev
```

### yarn (Install first)
```bash
npm install -g yarn
yarn install
yarn dev
```

### pnpm (Install first)
```bash
npm install -g pnpm
pnpm install
pnpm dev
```

### bun (Install first)
```bash
curl -fsSL https://bun.sh/install | bash
bun install
bun dev
```

## Common npm Commands in Replit

```bash
# Install dependencies
npm install

# Install specific package
npm install twilio

# Install dev dependency
npm install --save-dev @types/node

# Uninstall package
npm uninstall package-name

# Update packages
npm update

# Check outdated packages
npm outdated

# Clear npm cache
npm cache clean --force

# Run scripts from package.json
npm run dev          # Development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run linter
```

## Verifying npm is Available

To confirm npm is installed:

```bash
# Check npm version
npm --version
# Should show: 9.x.x or 10.x.x

# Check Node.js version
node --version
# Should show: v18.x.x or v20.x.x

# List installed packages
npm list

# List globally installed packages
npm list -g
```

## Troubleshooting npm in Replit

### npm Command Not Found
- This shouldn't happen - npm comes pre-installed
- Try refreshing the Replit page
- Check you're using the Shell tab, not Console

### Packages Won't Install
```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Permission Errors
- Replit handles permissions automatically
- If issues occur, try: `npm install --legacy-peer-deps`

### Slow Installation
- Replit uses shared resources
- Large packages may take time
- Check Replit status if extremely slow

## Replit vs Local npm

| Feature | Replit | Local |
|---------|--------|-------|
| **npm Pre-installed** | ✅ Yes | ⚠️ Requires Node.js |
| **Version** | Latest stable | Depends on Node.js |
| **Global Packages** | ✅ Supported | ✅ Supported |
| **Cache** | Shared | Local |
| **Speed** | Depends on load | Usually faster |

## Best Practices

1. **Use `package.json`**:
   - Always commit `package.json`
   - Don't commit `node_modules`
   - Replit auto-installs on run

2. **Use npm scripts**:
   - Define scripts in `package.json`
   - Run with `npm run script-name`
   - Replit can auto-detect and run

3. **Lock Files**:
   - Commit `package-lock.json` (for npm)
   - Or `yarn.lock` (for yarn)
   - Ensures consistent versions

4. **Environment Variables**:
   - Use Replit Secrets tab
   - Don't commit `.env` files
   - npm scripts can access them

## Quick Reference

```bash
# Your project setup
cd /path/to/project
npm install              # Install all dependencies
npm run dev              # Start dev server
npm run build            # Build for production

# Adding new packages
npm install twilio       # Add Twilio (already in your package.json)
npm install axios        # Add axios (already in your package.json)

# Checking what's installed
npm list                 # Local packages
npm list -g              # Global packages
npm outdated             # Check for updates
```

## Summary

✅ **npm is pre-installed in Replit**  
✅ **Use it exactly like you would locally**  
✅ **Terminal access: `npm install`, `npm run dev`, etc.**  
✅ **Packages UI is optional - just a visual wrapper**  
✅ **Auto-installs when you click "Run"**

You can use npm in Replit just like you would on your local machine - no setup required!
