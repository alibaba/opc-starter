# ESA Deployment Checklist

## Pre-deployment

- [ ] ESA CLI installed (`esa-cli --version`)
- [ ] Logged in to ESA (`esa-cli login`)
- [ ] `esa.jsonc` exists in app directory
- [ ] `.env.local` configured with production values
- [ ] MSW Mock disabled (`VITE_ENABLE_MSW=false`)
- [ ] Log level set appropriately (`VITE_LOG_LEVEL=info` or `warn`)

## Build

- [ ] Dependencies installed (`npm install`)
- [ ] Build succeeds (`npm run build`)
- [ ] `dist/` directory created
- [ ] No critical build warnings
- [ ] Bundle size acceptable (< 2MB recommended)

## Deployment

- [ ] Deployed to ESA (`esa-cli deploy`)
- [ ] Deployment URL returned
- [ ] No deployment errors

## Post-deployment

- [ ] Site accessible via deployment URL
- [ ] HTTPS working correctly
- [ ] Authentication flow works
- [ ] Key features functional
- [ ] No console errors

## Optional

- [ ] Custom domain configured
- [ ] SSL certificate valid
- [ ] Supabase URL configuration updated
- [ ] CI/CD pipeline configured
