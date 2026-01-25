# IIS Reinitialization Guide

## Quick Start

Run the reinitialization script as Administrator:

```powershell
cd "G:\Operations\MapAble\mapableau-main\mapableau-main"
.\scripts\reinit-iis.ps1
```

## What the Script Does

The `reinit-iis.ps1` script performs a complete reinitialization:

1. **Checks Prerequisites** - Node.js, pnpm, IIS
2. **Stops Existing Services** - Kills processes on port 3000, stops background jobs
3. **Cleans Build Artifacts** - Removes `.next` directory and cache
4. **Sets Up Environment** - Creates/updates `.env.local`, generates NEXTAUTH_SECRET
5. **Builds Application** - Installs dependencies and builds for production
6. **Configures IIS** - Creates directory, web.config, restarts IIS
7. **Starts Next.js** - Launches server on port 3000

## Script Options

```powershell
# Skip build (if already built)
.\scripts\reinit-iis.ps1 -SkipBuild

# Skip IIS configuration (if already configured)
.\scripts\reinit-iis.ps1 -SkipIISConfig

# Custom IIS path
.\scripts\reinit-iis.ps1 -IISPath "C:\inetpub\myapp"

# Custom Next.js port
.\scripts\reinit-iis.ps1 -NextJSPort 3001
```

## Manual Steps Required

After running the script, complete these steps in IIS Manager:

### 1. Set Site Physical Path

1. Open **IIS Manager**
2. Navigate to **Sites** → **Default Web Site** (or your site)
3. Right-click → **Manage Website** → **Advanced Settings**
4. Set **Physical Path** to: `C:\inetpub\mapableau`
5. Click **OK**

### 2. Verify Bindings

1. Right-click site → **Edit Bindings**
2. Ensure there's a binding for:
   - **Type**: http
   - **Port**: 80
   - **Host name**: (blank or localhost)
3. Click **Close**

### 3. Enable ARR Proxy

1. Click your **server name** (top level in IIS Manager)
2. Double-click **Application Request Routing Cache**
3. Click **Server Proxy Settings...** (right panel)
4. Check **Enable Proxy**
5. Click **Apply**

### 4. Verify Application Pool

1. Navigate to **Application Pools**
2. Find your site's application pool (usually "DefaultAppPool")
3. Ensure status is **Started**
4. If stopped, right-click → **Start**

## Verification

After reinitialization, test both endpoints:

1. **Direct Next.js**: `http://localhost:3000`
   - Should show the MapAble application
   
2. **Through IIS**: `http://localhost/`
   - Should show the same application (proxied through IIS)

## Troubleshooting

### Port 3000 Already in Use

The script attempts to kill existing processes, but if it fails:

```powershell
# Find process using port 3000
netstat -ano | findstr ":3000"

# Kill the process (replace <PID> with actual process ID)
taskkill /PID <PID> /F
```

### Build Fails

```powershell
# Check TypeScript errors
pnpm type-check

# Check linting errors
pnpm lint

# Build with validation skipped
$env:SKIP_ENV_VALIDATION="true"
pnpm build
```

### IIS Shows 502 Bad Gateway

1. **Next.js not running**: Check job status
   ```powershell
   Get-Job
   Receive-Job -Id <job-id>
   ```

2. **ARR Proxy not enabled**: Complete manual step #3 above

3. **Wrong port**: Verify `web.config` has correct port (3000)

### IIS Shows 404 Not Found

1. **Wrong physical path**: Verify in IIS Manager (step #1 above)
2. **web.config missing**: Check `C:\inetpub\mapableau\web.config` exists
3. **Site not started**: Check site status in IIS Manager

### Next.js Server Won't Start

```powershell
# Check job output
Get-Job
Receive-Job -Id <job-id>

# Check for errors in .env.local
# Ensure DATABASE_URL is set correctly
# Ensure NEXTAUTH_SECRET is set
```

## Viewing Logs

### Next.js Logs

```powershell
# List background jobs
Get-Job

# View job output
Receive-Job -Id <job-id>

# Follow job output
Get-Job -Id <job-id> | Receive-Job -Wait
```

### IIS Logs

IIS logs are located at:
```
C:\inetpub\logs\LogFiles\W3SVC<site-id>\
```

## Stopping the Server

```powershell
# List jobs
Get-Job

# Stop specific job
Stop-Job -Id <job-id>
Remove-Job -Id <job-id>

# Stop all jobs
Get-Job | Stop-Job
Get-Job | Remove-Job
```

## Running as Windows Service (Optional)

For production, consider running Next.js as a Windows service using NSSM:

1. Download NSSM: https://nssm.cc/download
2. Install service:
   ```powershell
   nssm install MapAbleNextJS "C:\path\to\pnpm.cmd" "start"
   nssm set MapAbleNextJS AppDirectory "G:\Operations\MapAble\mapableau-main\mapableau-main"
   nssm set MapAbleNextJS AppEnvironmentExtra "PORT=3000`nNODE_ENV=production`nNEXTAUTH_URL=http://localhost"
   nssm start MapAbleNextJS
   ```

## Environment Variables

The script automatically:
- Creates `.env.local` from `.env.example` if missing
- Generates `NEXTAUTH_SECRET` if missing
- Updates `NEXTAUTH_URL` to `http://localhost` for IIS

**Required variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Set to `http://localhost` for IIS
- `NEXTAUTH_SECRET` - Auto-generated if missing

**Edit `.env.local`** to add other required variables (Stripe, PayPal, etc.)

## Quick Reference

```powershell
# Full reinitialization
.\scripts\reinit-iis.ps1

# Reinitialize without rebuild
.\scripts\reinit-iis.ps1 -SkipBuild

# Reinitialize without IIS config
.\scripts\reinit-iis.ps1 -SkipIISConfig

# View Next.js logs
Get-Job | Receive-Job

# Stop Next.js
Get-Job | Stop-Job; Get-Job | Remove-Job

# Restart IIS
iisreset
```
