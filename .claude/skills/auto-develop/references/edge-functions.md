# Edge Functions

## Available Functions

| Function | Purpose |
|----------|---------|
| `oss-sts-token` | OSS temporary credentials |
| `aliyun-bailian-proxy` | AI video generation |
| `recognize-scene` | Scene recognition |
| `alibaba-i2i-synthesis` | Image synthesis |

## Deployment

```bash
cd photo-wall/supabase && supabase functions deploy <function-name>
```

## Location

All Edge Functions are located in `photo-wall/supabase/functions/`
