# System Architecture

## Tech Stack

| Tech | Version | Notes |
|------|---------|-------|
| React | 19.1 | |
| TypeScript | 5.9 | |
| Vite | 7.1 | |
| **Tailwind CSS** | **4.1** | Must use v4 syntax |
| Supabase | 2.80 | |
| Zustand | 5.0 | |

## Data Flow

```
React 19 → Zustand Store → DataService → IndexedDB
                              ↓↑
                    Supabase (Auth + PostgreSQL + Realtime)
                              ↓↑
                    阿里云 (OSS + 百炼 AI)
```

## Data Access Pattern

- Read: IndexedDB (local-first)
- Write: Optimistic update + Supabase Realtime sync
- All operations through `DataService`

## External Services

| Service | Provider | Purpose |
|---------|----------|---------|
| Auth | Supabase | User authentication |
| Database | Supabase PostgreSQL | Persistent storage |
| Realtime | Supabase Realtime | Data synchronization |
| Storage | 阿里云 OSS | Photo storage |
| AI | 阿里云百炼 | Video generation, scene recognition |
