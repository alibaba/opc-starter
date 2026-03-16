# Custom Domain Setup for ESA Pages

## Prerequisites

- Domain name (purchased from any registrar)
- ICP filing (required for mainland China access)
- DNS management access

## Step-by-Step Guide

### 1. Add Custom Domain

```bash
esa-cli domain add your-domain.com
```

Or for subdomain:

```bash
esa-cli domain add app.your-domain.com
```

### 2. Configure DNS

Add CNAME record in your DNS management:

| Host | Type | Value |
|------|------|-------|
| `app` | CNAME | `your-app.xxx.er.aliyun-esa.net` |

### 3. Configure HTTPS

ESA supports automatic SSL certificate issuance:

1. ESA Console → Your Site → Domain Management
2. Click on domain → SSL Certificate
3. Select "Auto-apply free certificate"
4. Wait for verification (usually within minutes)

Alternatively, upload your own certificate:

```bash
esa-cli domain cert-upload your-domain.com --cert=./cert.pem --key=./key.pem
```

### 4. Update Supabase Configuration

After domain is active, update Supabase settings:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Update **Site URL** to your custom domain
3. Add domain to **Redirect URLs** allowlist

### 5. Verify Deployment

```bash
# Check domain status
esa-cli domain list

# Test access
curl -I https://your-domain.com
```

## Domain Strategies

### Single Domain

```
your-domain.com → ESA Pages
```

### Subdomain Strategy

```
app.your-domain.com    → Frontend (ESA Pages)
api.your-domain.com    → Backend API
admin.your-domain.com  → Admin Panel
```

### Multi-region Strategy

```
your-domain.com      → Global (ESA auto-routes)
cn.your-domain.com   → China region
us.your-domain.com   → US region
```

## Troubleshooting

### Domain Not Resolving

1. Check DNS propagation: `dig your-domain.com`
2. Verify CNAME record is correct
3. Wait up to 48 hours for full propagation

### SSL Certificate Issues

1. Ensure domain is verified in ESA console
2. Check certificate status in ESA dashboard
3. Try re-issuing certificate

### CORS Errors

1. Update Supabase allowed origins
2. Check Edge Function CORS configuration
3. Verify frontend API base URL

## ICP Filing (China Mainland)

For websites accessible in mainland China:

1. Submit ICP filing through Alibaba Cloud
2. Wait for approval (10-20 business days)
3. Display ICP number in footer
4. Link to MIIT website

Reference: https://beian.aliyun.com/
