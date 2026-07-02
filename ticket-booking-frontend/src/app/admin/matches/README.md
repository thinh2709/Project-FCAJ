# Admin Matches Page - Mock Mode

## Current Status: MOCK DATA MODE

File `page.tsx` hiện đang sử dụng mock data thay vì API thực.

## Files

- `page.tsx` - Current file (MOCK MODE)
- `page.backup.tsx` - Original file with real API calls

## Restore Real API

Để phục hồi kết nối API thực, làm theo các bước:

### Option 1: Copy backup file
```bash
cd src/app/admin/matches
copy page.backup.tsx page.tsx
```

### Option 2: Manual edit in `page.tsx`

**Uncomment line 3:**
```ts
import { useAdminMatches } from "@/features/admin/hooks/useAdmin";
```

**Replace lines 118-162 (Mock Data section) with:**
```ts
// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminMatchesPage() {
  const { matches, loading, error, refetch, createMatch, updateMatch, generateTickets } = useAdminMatches();
```

## Mock Data Details

Mock includes 3 sample events:
1. **Vietnam vs Thailand** - My Dinh Stadium (5,670 tickets generated)
2. **Real Madrid vs Barcelona** - Santiago Bernabeu (17,000 tickets generated)
3. **Man United vs Liverpool** - Old Trafford (0 tickets generated)

All actions (create/edit/generate) are console.logged but don't affect data.

## Notes

- UI và logic form giữ nguyên 100%
- Chỉ data source thay đổi: API → hardcoded array
- Không có side effects, an toàn để test UI/UX
