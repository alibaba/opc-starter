---
name: esa-deploy
description: Deploys React/Vite applications to Alibaba Cloud ESA Pages. Use when the user needs to deploy frontend applications, manage deployments, configure custom domains, or troubleshoot deployment issues on ESA (Edge Security Acceleration) platform.
allowed-tools: Bash(esa-cli:*)
---

# Alibaba Cloud ESA Pages Deployment

## Overview

ESA Pages is Alibaba Cloud's edge computing platform for static site hosting with global CDN acceleration. This skill automates deployment workflows for React/Vite applications.

## Prerequisites

1. **ESA CLI installed**: `npm install esa-cli@latest -g`
2. **Alibaba Cloud account** with AccessKey configured
3. **Logged in**: `esa-cli login`

## Quick Start

```bash
# Navigate to app directory
cd app

# Build and deploy
npm run build && esa-cli deploy
```

## ESA CLI Commands

### Authentication

```bash
# Login to ESA (requires AccessKey)
esa-cli login

# Logout
esa-cli logout
```

### Deployment

```bash
# Deploy current directory (requires esa.jsonc)
esa-cli deploy

# Deploy with explicit entry
esa-cli deploy ./dist

# View deployments
esa-cli deployments
```

### Project Management

```bash
# Initialize new project
esa-cli init my-project

# View project info
esa-cli project

# Manage sites
esa-cli site
```

### Domain Management

```bash
# Add custom domain
esa-cli domain add your-domain.com

# List domains
esa-cli domain list

# Remove domain
esa-cli domain remove your-domain.com
```

### Route Management

```bash
# Add route
esa-cli route add -r your-domain.com -s <site-name>

# List routes
esa-cli route list
```

### Local Development

```bash
# Start local dev server
esa-cli dev

# Dev with custom port
esa-cli dev --port 3000
```

## Configuration

### esa.jsonc

```json
{
  "name": "your-app-name",
  "assets": {
    "directory": "./dist",
    "notFoundStrategy": "singlePageApplication"
  },
  "dev": {
    "port": 18080
  }
}
```

### Environment Variables

Production environment variables should be set in `.env.local` before build:

```bash
# Required
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...

# Production settings
VITE_ENABLE_MSW=false
VITE_LOG_LEVEL=info
```

## Deployment Checklist

- [ ] Close MSW Mock (`VITE_ENABLE_MSW=false`)
- [ ] Verify environment variables are correct
- [ ] Run `npm run build` successfully
- [ ] Check `dist/` directory exists
- [ ] Verify `esa.jsonc` configuration
- [ ] Run `esa-cli deploy`

## Common Issues

### "esa.jsonc not found"

Ensure you're in the correct directory containing `esa.jsonc`:

```bash
cd app && esa-cli deploy
```

### "Not logged in"

```bash
esa-cli login
```

### Build fails

```bash
# Check Node version (>= 20.x)
node -v

# Clean install
rm -rf node_modules && npm install

# Rebuild
npm run build
```

### Large bundle warning

Consider code splitting:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
});
```

## Deployment Output

After successful deployment:

```
╔═══════════════════════════════════════════════════════════════════════╗
║ 🚀 Deploy Success                                                     ║
║                                                                       ║
║ APP  your-app-name                                                    ║
║ URL  https://your-app.xxx.er.aliyun-esa.net                           ║
║                                                                       ║
║ TIP  Add a custom domain: esa-cli domain add <DOMAIN>                 ║
╚═══════════════════════════════════════════════════════════════════════╝
```

## References

* **Environment Configuration** [references/environment-config.md](references/environment-config.md)
* **Custom Domain Setup** [references/custom-domain.md](references/custom-domain.md)
* **CI/CD Integration** [references/cicd-integration.md](references/cicd-integration.md)
