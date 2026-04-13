# Local-First Architecture

## Summary
All user-facing state in Atlas is stored in Zustand stores with `persist` middleware targeting `localStorage`. The backend API exists but stores are not yet synced to it. This means data is device-local and survives page reloads but not browser clears or device switches.

## How It Works
Each Zustand store follows this pattern:
```typescript
export const useXStore = create<XState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set((s) => ({ items: [...s.items, item] })),
      // ...
    }),
    {
      name: 'ogden-x',           // localStorage key
      version: 2,                 // migration version
      migrate: (persisted, ver) => { /* migration logic */ },
      partialize: (state) => {    // exclude transient state
        const { placementMode, ...rest } = state;
        return rest;
      },
    },
  ),
);
```

## Stores (18)
All stores have a `serverId` field on their items (added in v2 migrations) but it is never populated. This field is reserved for Sprint 3 backend sync.

## Sync Strategy (Planned — Sprint 3+)
1. On project creation: POST to API, store returned `serverId`
2. On mutation: debounced PATCH to API using `serverId`
3. On app load: if online, fetch latest from API, merge with local
4. Conflict resolution: last-write-wins with timestamp comparison

## Where It's Used
Every feature in the app — zones, structures, paddocks, crops, paths, utilities, comments, scenarios, fieldwork, portal configs, financial settings.

## Constraints
- Never assume data is in the database — always check both DB and payload
- PDF export service handles this by accepting `payload` for client-only data
- `data_completeness_score` on the project is the only server-computed value
- Portal configs are localStorage-only — public portals can't be shared yet (launch blocker)

## Risk
Data loss on browser clear, no multi-device support, no collaboration. This is the #1 launch blocker.
