# Quick Fix: Node.js Installation Failed

## Fastest Solution: Portable Node.js

If the installer failed, use the portable version (no installation needed):

### Step 1: Download
1. Go to: https://nodejs.org/dist/v20.11.0/
2. Download: `node-v20.11.0-win-x64.zip` (or latest LTS)
3. Extract to: `C:\nodejs` (or any folder you prefer)

### Step 2: Use It
```powershell
# Navigate to project
cd "G:\Operations\MapAble\mapableau-main\mapableau-main"

# Use full path to npm (no installation needed!)
C:\nodejs\npm.cmd install

# Then run dev server
C:\nodejs\npm.cmd run dev
```

**That's it!** No installation required.

---

## Alternative: Bun (Even Easier)

Bun doesn't need Node.js:

```powershell
# Install Bun (one command)
powershell -c "irm bun.sh/install.ps1 | iex"

# Then use it
bun install
bun run dev
```

---

## Alternative: Online IDE (No Installation)

1. Push code to GitHub
2. Open in GitHub Codespaces (free)
3. Everything works automatically

---

## What Was the Error?

Share the error message and I can provide a specific fix!

Common issues:
- ❌ "Access Denied" → Run as Administrator
- ❌ "Installation Failed" → Try portable version
- ❌ "Path too long" → Install to `C:\nodejs\`
- ❌ Corporate restrictions → Use portable or online IDE
