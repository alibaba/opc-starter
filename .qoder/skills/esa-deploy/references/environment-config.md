# Environment Configuration for ESA Deployment

## Frontend Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_ENABLE_MSW` | Enable Mock Service Worker | `false` |
| `VITE_LOG_LEVEL` | Logging level | `info` |
| `VITE_OSS_ACCELERATE_ENABLED` | Enable OSS acceleration | `false` |

## Production Configuration

### Before Deployment

1. **Disable Mock Services**

   ```bash
   # .env.local
   VITE_ENABLE_MSW=false
   ```

2. **Set Appropriate Log Level**

   ```bash
   VITE_LOG_LEVEL=info  # or 'warn' for less verbosity
   ```

3. **Verify Supabase Configuration**

   - Check Supabase project is active
   - Verify RLS policies are configured
   - Ensure Edge Functions are deployed

## Edge Function Secrets

These are configured in Supabase Dashboard → Edge Functions → Secrets:

| Secret | Description |
|--------|-------------|
| `ALIYUN_BAILIAN_API_KEY` | Alibaba Cloud Bailian AI API Key |
| `SUPABASE_URL` | Auto-injected by Supabase |
| `SUPABASE_ANON_KEY` | Auto-injected by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected by Supabase |

## Security Best Practices

1. **Never commit `.env.local` to version control**
2. **Use different Supabase projects for dev/staging/prod**
3. **Rotate API keys periodically**
4. **Use RAM sub-accounts with minimal permissions**

## Environment File Template

```bash
# .env.local.example - Copy to .env.local and fill in values

# ============================================
# Supabase Configuration (Required)
# ============================================
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# ============================================
# Production Settings
# ============================================
VITE_ENABLE_MSW=false
VITE_LOG_LEVEL=info

# ============================================
# Optional: OSS Acceleration
# ============================================
VITE_OSS_ACCELERATE_ENABLED=false
```
