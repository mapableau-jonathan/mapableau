# Installing Dependencies Without npm/pnpm

## Quick Solution: Install Node.js

The easiest solution is to install Node.js, which includes npm:

1. **Download Node.js**:
   - Visit: https://nodejs.org/
   - Download the **LTS version** (recommended)
   - Run the installer
   - ✅ **Check "Add to PATH"** during installation

2. **After Installation**:
   ```powershell
   # Restart your terminal, then:
   node --version    # Should show version number
   npm --version     # Should show version number
   
   # Navigate to project
   cd "G:\Operations\MapAble\mapableau-main\mapableau-main"
   
   # Install dependencies
   npm install
   ```

## Alternative: Use Yarn

If you can install Node.js, you can also use Yarn:

```powershell
# Install Yarn globally
npm install -g yarn

# Then use yarn instead
yarn install
```

## Alternative: Use Bun

Bun is a fast alternative that doesn't require Node.js separately:

```powershell
# Install Bun
powershell -c "irm bun.sh/install.ps1 | iex"

# Then use bun
bun install
```

## If You Cannot Install Anything

If you cannot install Node.js or any package manager:

1. **Use an Online IDE**:
   - Push code to GitHub
   - Use GitHub Codespaces (free for public repos)
   - Or use GitPod, Replit, or CodeSandbox

2. **Use Docker** (if available):
   - Docker handles Node.js installation
   - See `docs/INSTALLATION_ALTERNATIVES.md` for Docker setup

3. **Portable Node.js**:
   - Download portable Node.js zip
   - Extract and add to PATH temporarily
   - See `docs/INSTALLATION_ALTERNATIVES.md` for details

## Most Important Package

The only new package we added is **`twilio`**. All other dependencies were already in your project.

If you can only install one thing, install Node.js - it will give you npm and solve the problem.

## Next Steps After Installation

Once dependencies are installed:

1. **Set up environment variables** (see `.env.example`)
2. **Run the development server**:
   ```powershell
   npm run dev
   # or
   pnpm dev
   # or
   yarn dev
   # or
   bun dev
   ```

For more detailed alternatives, see: `docs/INSTALLATION_ALTERNATIVES.md`
