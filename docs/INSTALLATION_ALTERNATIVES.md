# Alternative Installation Methods

Since npm and pnpm are not working on your system, here are several alternative methods to install dependencies and run the project.

## Option 1: Install Node.js (Recommended)

Node.js includes npm by default. Once installed, you can use npm or install pnpm.

### Method A: Official Installer (Easiest)

1. **Download Node.js**:
   - Go to [nodejs.org](https://nodejs.org/)
   - Download the LTS version for Windows
   - Run the installer (.msi file)
   - Follow the installation wizard
   - **Important**: Check "Add to PATH" during installation

2. **Verify Installation**:
   ```powershell
   node --version
   npm --version
   ```

3. **Install Dependencies**:
   ```powershell
   npm install
   ```

### Method B: Using Chocolatey (Package Manager)

If you have Chocolatey installed:

```powershell
choco install nodejs
```

Then:
```powershell
npm install
```

### Method C: Using Scoop (Package Manager)

If you have Scoop installed:

```powershell
scoop install nodejs
```

Then:
```powershell
npm install
```

---

## Option 2: Portable Node.js (No Installation Required)

Use a portable version that doesn't require installation:

1. **Download Portable Node.js**:
   - Go to [nodejs.org/dist/](https://nodejs.org/dist/)
   - Download the Windows x64 zip file (e.g., `node-v20.x.x-win-x64.zip`)
   - Extract to a folder (e.g., `C:\nodejs`)

2. **Add to PATH Temporarily**:
   ```powershell
   $env:Path += ";C:\nodejs"
   ```

3. **Verify**:
   ```powershell
   node --version
   npm --version
   ```

4. **Install Dependencies**:
   ```powershell
   npm install
   ```

**Note**: You'll need to add to PATH each time you open a new terminal, or add it permanently in System Environment Variables.

---

## Option 3: Use Yarn (Alternative Package Manager)

If you can get Node.js installed, Yarn is another option:

### Install Yarn via npm:
```powershell
npm install -g yarn
```

### Or Install Yarn Standalone:
1. Download from [yarnpkg.com/getting-started/install](https://yarnpkg.com/getting-started/install)
2. Run the installer
3. Use yarn instead:
   ```powershell
   yarn install
   ```

---

## Option 4: Use Bun (Modern Alternative)

Bun is a fast JavaScript runtime and package manager:

1. **Install Bun**:
   - Download from [bun.sh](https://bun.sh)
   - Or use PowerShell:
     ```powershell
     powershell -c "irm bun.sh/install.ps1 | iex"
     ```

2. **Install Dependencies**:
   ```powershell
   bun install
   ```

3. **Run the Project**:
   ```powershell
   bun run dev
   ```

---

## Option 5: Manual Package Installation

If you cannot install any package manager, you can manually download packages:

### Step 1: Download Packages Manually

1. Create a `node_modules` folder in your project root
2. For each package in `package.json`, download from:
   - [npmjs.com](https://www.npmjs.com/) - Search for package name
   - Download the package zip file
   - Extract to `node_modules/package-name`

### Step 2: Download Required Packages

Based on your `package.json`, you need these packages (download from npmjs.com):

**Core Dependencies:**
- `twilio` - For SMS functionality
- `axios` - HTTP client (already in package.json)
- `zod` - Schema validation (already in package.json)
- `next` - Next.js framework (already in package.json)
- `react` - React library (already in package.json)
- `react-dom` - React DOM (already in package.json)

**For Google Maps:**
- `@react-google-maps/api` - Already in package.json

**Note**: This method is very tedious and not recommended. The packages have dependencies on other packages, making manual installation extremely difficult.

---

## Option 6: Use Docker (Containerized)

If you have Docker installed:

1. **Create Dockerfile** (if not exists):
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   EXPOSE 3000
   CMD ["npm", "run", "dev"]
   ```

2. **Build and Run**:
   ```powershell
   docker build -t mapableau .
   docker run -p 3000:3000 mapableau
   ```

---

## Option 7: Use Online IDE/Development Environment

Use cloud-based development environments:

### GitHub Codespaces
1. Push your code to GitHub
2. Open in GitHub Codespaces
3. All dependencies install automatically

### GitPod
1. Push your code to GitHub/GitLab
2. Open with GitPod
3. Dependencies install automatically

### Replit
1. Import your project to Replit
2. Replit automatically detects and installs dependencies

---

## Option 8: Fix PATH Issues (If Node.js is Installed)

If Node.js is installed but not found, fix the PATH:

### Check if Node.js is Installed:
```powershell
Get-Command node -ErrorAction SilentlyContinue
```

### Add Node.js to PATH:
1. Find Node.js installation (usually `C:\Program Files\nodejs\`)
2. Open System Properties → Environment Variables
3. Edit "Path" variable
4. Add: `C:\Program Files\nodejs\`
5. Restart PowerShell/Command Prompt

### Or Add Temporarily:
```powershell
$env:Path += ";C:\Program Files\nodejs"
```

---

## Recommended Solution

**Best approach**: Install Node.js using Option 1 (Method A - Official Installer)

1. Download from [nodejs.org](https://nodejs.org/)
2. Install with "Add to PATH" checked
3. Restart your terminal
4. Run: `npm install`

This will give you:
- ✅ Node.js runtime
- ✅ npm package manager
- ✅ Ability to install pnpm later if needed: `npm install -g pnpm`

---

## Quick Start After Installing Node.js

Once Node.js is installed:

```powershell
# Navigate to project directory
cd "G:\Operations\MapAble\mapableau-main\mapableau-main"

# Install dependencies
npm install

# Or if you prefer pnpm (install it first)
npm install -g pnpm
pnpm install

# Run development server
npm run dev
# or
pnpm dev
```

---

## Troubleshooting

### "node is not recognized"
- Node.js is not installed or not in PATH
- Solution: Install Node.js or add to PATH

### "npm is not recognized"
- npm comes with Node.js
- If Node.js works but npm doesn't, reinstall Node.js

### Permission Errors
- Run PowerShell as Administrator
- Or use: `npm install --global --production windows-build-tools`

### Antivirus Blocking
- Temporarily disable antivirus
- Add Node.js folder to antivirus exclusions

---

## Need Help?

If none of these methods work, please provide:
1. Error messages you're seeing
2. Whether you can install software on this computer
3. Any restrictions (corporate policies, etc.)
4. Your Windows version: `winver` command

This will help suggest the best alternative for your specific situation.
