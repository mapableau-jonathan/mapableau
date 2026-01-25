# Quick Start: MapAble on IIS (Windows 11)

## Problem: "None of the ports work"

This means Next.js isn't running yet. Follow these steps:

---

## Step 1: Create Environment File

You need a `.env.local` file. I've created it from `.env.example`, but you need to set at minimum:

```env
NEXTAUTH_URL=http://localhost
NEXTAUTH_SECRET=your-secret-here
DATABASE_URL=your-database-url-here
```

**Quick fix for testing:**
```powershell
cd "G:\Operations\MapAble\mapableau-main\mapableau-main"
# Generate a secret
$secret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
Add-Content .env.local "`nNEXTAUTH_SECRET=$secret"
```

---

## Step 2: Build the Application

```powershell
cd "G:\Operations\MapAble\mapableau-main\mapableau-main"
pnpm install
pnpm build
```

**If build fails:**
- Check for TypeScript errors: `pnpm type-check`
- Check for linting errors: `pnpm lint`
- You can skip validation temporarily: `$env:SKIP_ENV_VALIDATION="true"; pnpm build`

---

## Step 3: Start Next.js on Port 3000

**Option A: Manual Start (for testing)**
```powershell
cd "G:\Operations\MapAble\mapableau-main\mapableau-main"
$env:PORT=3000
$env:NEXTAUTH_URL="http://localhost"
pnpm start
```

**Option B: Use the script**
```powershell
cd "G:\Operations\MapAble\mapableau-main\mapableau-main"
.\scripts\start-dev.ps1
```

**Verify it works:**
- Open browser: `http://localhost:3000`
- You should see the MapAble app

---

## Step 4: Configure IIS Reverse Proxy

### A. Install IIS Extensions (if not already)
1. Download and install **IIS URL Rewrite Module**
2. Download and install **Application Request Routing (ARR)**
3. Open **IIS Manager**
4. Click your **server name** (top level)
5. Double-click **Application Request Routing Cache**
6. Click **Server Proxy Settings...**
7. Check **Enable Proxy**
8. Click **Apply**

### B. Create IIS Site Folder
```powershell
New-Item -ItemType Directory -Path "C:\inetpub\mapableau" -Force
```

### C. Create web.config
The file `C:\inetpub\mapableau\web.config` should contain:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyToNext" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:3000/{R:1}" />
        </rule>
      </rules>
    </rewrite>
    <httpProtocol>
      <customHeaders>
        <add name="X-Forwarded-Proto" value="http" />
        <add name="X-Forwarded-Host" value="localhost" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
```

### D. Configure IIS Site
1. Open **IIS Manager**
2. Click **Sites** → **Default Web Site** (or create new site)
3. Right-click → **Manage Website** → **Advanced Settings**
4. Set **Physical Path** to: `C:\inetpub\mapableau`
5. Click **Bindings...**
6. Ensure there's a binding for **http, port 80, localhost** (or blank hostname)
7. Click **OK**

### E. Restart IIS
```powershell
iisreset
```

---

## Step 5: Test

1. **Test Next.js directly:** `http://localhost:3000` ✅
2. **Test through IIS:** `http://localhost/` ✅

---

## Troubleshooting

### Port 80 Already in Use
```powershell
# Find what's using port 80
netstat -ano | findstr ":80"

# If it's IIS (PID 4), that's fine - it should be IIS
# If it's something else, stop that service
```

### Port 3000 Not Starting
```powershell
# Check if port 3000 is free
netstat -ano | findstr ":3000"

# If something is using it, kill it:
# Find PID: netstat -ano | findstr ":3000"
# Kill: taskkill /PID <pid> /F
```

### IIS Shows 502 Bad Gateway
- **Next.js not running:** Start it with `pnpm start`
- **ARR Proxy not enabled:** Enable it in IIS Manager
- **Wrong port in web.config:** Ensure it says `3000`

### IIS Shows 404
- **Wrong physical path:** Check site's physical path in IIS Manager
- **web.config not in folder:** Ensure `C:\inetpub\mapableau\web.config` exists

### Build Errors
```powershell
# Skip validation for quick test
$env:SKIP_ENV_VALIDATION="true"
pnpm build

# Or build without type-check/lint
pnpm next build
```

---

## Quick Commands Summary

```powershell
# 1. Setup
cd "G:\Operations\MapAble\mapableau-main\mapableau-main"
Copy-Item .env.example .env.local
# Edit .env.local with your values

# 2. Build
pnpm install
pnpm build

# 3. Start Next.js
$env:PORT=3000
$env:NEXTAUTH_URL="http://localhost"
pnpm start

# 4. In another terminal, test
Start-Process "http://localhost:3000"
Start-Process "http://localhost/"
```

---

## Next Steps After It Works

1. **Run as Windows Service:** Use NSSM to run `pnpm start` as a service
2. **Set Production Environment:** Update `.env.local` with real values
3. **Enable HTTPS:** Configure SSL certificate in IIS
4. **Monitor Logs:** Set up logging for both IIS and Next.js
