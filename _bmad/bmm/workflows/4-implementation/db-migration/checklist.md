# Database Migration Workflow Checklist

## Pre-Migration Checks

- [ ] Migration file follows naming convention: `[NNNNN]_[description].sql`
- [ ] Rollback file exists: `rollbacks/[NNNNN]_rollback.sql`
- [ ] Migration-manifest.yaml updated with new entry
- [ ] SQL syntax validated
- [ ] No hardcoded values that differ between environments

## Migration SQL Quality

- [ ] Idempotent where possible (IF NOT EXISTS, IF EXISTS)
- [ ] Proper constraints defined (NOT NULL, DEFAULT, FOREIGN KEY)
- [ ] Indexes added for frequently queried columns
- [ ] RLS policies considered for security
- [ ] Comments explain the purpose of changes

## Rollback SQL Quality

- [ ] Rollback reverses all UP changes
- [ ] Uses IF EXISTS to avoid errors on partial state
- [ ] Handles dependent objects (drop in correct order)
- [ ] Data preservation considered (backup if needed)

## Apply Migration Checks

- [ ] Database backup taken (production)
- [ ] Migration tested in development environment first
- [ ] MCP Server connection verified
- [ ] Transaction wrapping considered for atomic changes
- [ ] Rollback plan documented

## Post-Migration Verification

- [ ] Schema changes verified in database
- [ ] Application still functions correctly
- [ ] Tests pass with new schema
- [ ] Migration-manifest.yaml status updated to "applied"
- [ ] Team notified of schema changes

## Status Definitions

| Status | Description |
|--------|-------------|
| pending | Migration created but not yet applied |
| applied | Migration successfully executed |
| rolled_back | Migration was applied then rolled back |
| failed | Migration execution failed |
