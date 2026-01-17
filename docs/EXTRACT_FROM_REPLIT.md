# Extract Code from Replit

Guide to download/extract code from: https://replit.com/@ausdisau1/MapAble-30

## Method 1: Download as ZIP (Easiest)

### If You Have Access to the Repl:

1. **Open the Repl**:
   - Go to: https://replit.com/@ausdisau1/MapAble-30
   - Sign in if needed (if it's private)

2. **Download Files**:
   - Click the **"Files"** icon in the left sidebar
   - Click the **three dots (⋯)** menu at the top of the file tree
   - Select **"Download as ZIP"**
   - All files will download as a ZIP archive

3. **Extract and Use**:
   - Extract the ZIP file
   - You now have all the code locally

## Method 2: Clone via Git (If Connected to GitHub)

### If the Repl is Connected to GitHub:

1. **Check for Git Connection**:
   - In Replit, look for Git icon or "Version Control"
   - Check if it shows a GitHub repository

2. **Get GitHub URL**:
   - If connected, you'll see the repository URL
   - Clone it directly:
     ```bash
     git clone https://github.com/USERNAME/REPO_NAME.git
     ```

## Method 3: Manual Copy (If Public Repl)

### If the Repl is Public:

1. **View Files**:
   - Go to: https://replit.com/@ausdisau1/MapAble-30
   - Browse files in the file tree
   - Click on files to view their contents

2. **Copy Individual Files**:
   - Open each file
   - Copy the content
   - Paste into your local files

**Note**: This is tedious for large projects - use Method 1 instead.

## Method 4: Use Replit CLI (Advanced)

### If You Have Replit CLI Installed:

```bash
# Install Replit CLI (if not installed)
npm install -g @replit/cli

# Login to Replit
replit auth

# Clone the repl
replit clone @ausdisau1/MapAble-30
```

## Method 5: Fork the Repl (Then Download)

1. **Fork the Repl**:
   - Go to: https://replit.com/@ausdisau1/MapAble-30
   - Click "Fork" button (if available)
   - This creates your own copy

2. **Download Your Fork**:
   - Now you have access to your fork
   - Use Method 1 to download as ZIP

## Quick Steps for Your Case

Since you want to extract from `@ausdisau1/MapAble-30`:

### Option A: Direct Download (Recommended)

1. Visit: https://replit.com/@ausdisau1/MapAble-30
2. Sign in to Replit (if required)
3. Click **Files** → **⋯ menu** → **Download as ZIP**
4. Extract to your local directory
5. Done!

### Option B: Check if It's on GitHub

1. Visit the Repl
2. Look for GitHub connection/link
3. If found, clone from GitHub:
   ```bash
   git clone [GITHUB_URL]
   ```

## After Extraction

Once you have the code:

1. **Navigate to the extracted folder**:
   ```powershell
   cd path/to/extracted/folder
   ```

2. **Install dependencies** (if you get Node.js working):
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Copy `.env.example` to `.env`
   - Add your API keys

4. **Run the project**:
   ```bash
   npm run dev
   ```

## Troubleshooting

### "Repl is Private"
- You need to be added as a collaborator
- Or ask the owner to make it public
- Or fork it if you have access

### "Download Button Not Available"
- Try right-clicking on the Files panel
- Or use the three-dots menu
- Check if you're signed in

### "Files Not Showing"
- Refresh the page
- Check if the Repl exists
- Verify you have access

## Alternative: View Source Online

If you can't download, you can:
1. View files directly in Replit
2. Copy code manually
3. Or use browser extensions to download

## Next Steps

After extracting the code:
1. ✅ Review the code structure
2. ✅ Check `package.json` for dependencies
3. ✅ Set up environment variables
4. ✅ Install dependencies
5. ✅ Run the project

For setting up in a new Replit or local environment, see:
- `docs/REPLIT_SETUP.md` - Setting up in Replit
- `CLOUD_IDE_QUICK_START.md` - Quick start guide
