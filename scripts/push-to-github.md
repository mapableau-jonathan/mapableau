# Push to GitHub with Personal Access Token

## Step 1: Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: "MapAble Development"
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)

## Step 2: Push Using Token

### Option A: Use token in URL (one-time)
```bash
git push https://YOUR_TOKEN@github.com/mapableau/mapableau-main.git 2026-01-18-4a4a-984bf
```

### Option B: Store in Credential Manager (recommended)
```bash
# Windows Credential Manager will prompt you
git push --set-upstream origin 2026-01-18-4a4a-984bf
# When prompted:
# Username: YOUR_GITHUB_USERNAME
# Password: YOUR_TOKEN (paste the token here)
```

### Option C: Use Git Credential Manager
```bash
# The token will be stored securely
git credential-manager-core configure
git push --set-upstream origin 2026-01-18-4a4a-984bf
```

## Step 3: Verify Push

After pushing, check:
```bash
git log --oneline -1
git remote show origin
```

## Troubleshooting

- **"Repository not found"**: Check you have access to the repo
- **"Authentication failed"**: Verify token has `repo` scope
- **"Permission denied"**: Token may have expired, create a new one
