# Storage Options Documentation

**Date:** December 12, 2025
**Status:** Current approach using localStorage + Firebase

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER DEVICE                                │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │   React State   │◄──►│   localStorage  │    │    App UI       │  │
│  │  (assessments,  │    │  (backup cache) │    │  (Dashboard,    │  │
│  │   students,     │    │                 │    │   Assessments,  │  │
│  │   groups, etc.) │    │  ⚠️ May exceed  │    │   Reports)      │  │
│  │                 │    │     quota       │    │                 │  │
│  └────────┬────────┘    └─────────────────┘    └────────▲────────┘  │
│           │                                              │           │
│           │  useDatabase() hook                          │           │
│           │  provides data                               │           │
│           ▼                                              │           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    DatabaseContext                           │    │
│  │  • Holds all data in React state                            │    │
│  │  • Provides CRUD operations                                  │    │
│  │  • Syncs with Firebase                                       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                               │                                      │
└───────────────────────────────┼──────────────────────────────────────┘
                                │
                                │ FirebaseSyncService
                                │ (fetch, sync, real-time listeners)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        FIREBASE CLOUD                                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Firestore Database                        │    │
│  │  • assessments collection (6,659 docs)                      │    │
│  │  • students collection (710 docs)                           │    │
│  │  • groups collection (97 docs)                              │    │
│  │  • attendance collection (5,180 docs)                       │    │
│  │  • users collection (25 docs)                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ✅ Source of truth                                                  │
│  ✅ Multi-device sync                                                │
│  ✅ Blaze plan = unlimited                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. App Startup (Initial Sync)

```
App Opens
    │
    ▼
┌─────────────────────────────────┐
│ 1. Load from localStorage       │  ← Instant (cached data)
│    (if any data exists)         │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ 2. Fetch from Firebase          │  ← Takes 10-15 sec
│    • fetchStudents()            │
│    • fetchGroups()              │
│    • fetchAttendance()          │
│    • fetchAssessments()         │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ 3. Merge with conflict          │
│    resolution (last-write-wins) │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ 4. Update React state           │  ← UI shows data
│ 5. Try to cache in localStorage │  ← May fail (quota)
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ 6. Setup real-time listeners    │  ← Live updates
└─────────────────────────────────┘
```

### 2. Creating New Data (e.g., New Assessment)

```
User clicks "Save"
    │
    ▼
┌─────────────────────────────────┐
│ 1. Add to React state           │  ← UI updates instantly
│ 2. Try save to localStorage     │  ← Backup (may fail)
└─────────────────────────────────┘
    │
    ▼ (background, async)
┌─────────────────────────────────┐
│ 3. Sync to Firebase             │
│    • If online → immediate      │
│    • If offline → queued        │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ 4. Mark record as synced        │
└─────────────────────────────────┘
```

### 3. Real-Time Updates (Multi-Device)

```
Another user makes change
    │
    ▼
┌─────────────────────────────────┐
│ Firebase detects change         │
└─────────────────────────────────┘
    │
    ▼ (real-time listener)
┌─────────────────────────────────┐
│ onSnapshot() callback fires     │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ Merge with local data           │
│ (conflict resolution)           │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ Update React state              │  ← UI updates automatically
└─────────────────────────────────┘
```

---

## Browser Storage Options Comparison

### localStorage (Current)

| Feature | Details |
|---------|---------|
| **Storage Limit** | ~5 MB (browser-enforced) |
| **Data Type** | Strings only (must JSON.stringify) |
| **API** | Simple synchronous |
| **Queries** | None (must load all, then filter) |
| **Performance** | Slow for large data |
| **Transactions** | No |

**Current Data Size:**
```
• 6,659 assessments × ~500 bytes = ~3.3 MB
• 5,180 attendance × ~200 bytes  = ~1.0 MB
• 710 students × ~300 bytes      = ~0.2 MB
• Other data                     = ~0.5 MB
                                   ─────────
                            Total: ~5.0 MB  ← At the limit!
```

**Pros:**
- Simple API
- Works everywhere
- No setup needed

**Cons:**
- 5MB limit (exceeded by our data)
- Synchronous (blocks UI)
- No indexing/queries

---

### IndexedDB (Alternative Option)

| Feature | Details |
|---------|---------|
| **Storage Limit** | 50 MB - unlimited* |
| **Data Type** | Any (objects, arrays, blobs) |
| **API** | Complex asynchronous |
| **Queries** | Indexes, cursors |
| **Performance** | Fast with indexes |
| **Transactions** | Yes |

*IndexedDB limit is typically 50% of free disk space

**How It Would Work:**
```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER                                   │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    IndexedDB                             │   │
│   │                                                          │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│   │   │ assessments │  │  students   │  │   groups    │    │   │
│   │   │   store     │  │   store     │  │   store     │    │   │
│   │   │             │  │             │  │             │    │   │
│   │   │ 6,659 docs  │  │  710 docs   │  │  97 docs    │    │   │
│   │   │   (~3 MB)   │  │  (~0.2 MB)  │  │  (~0.1 MB)  │    │   │
│   │   └─────────────┘  └─────────────┘  └─────────────┘    │   │
│   │                                                          │   │
│   │   Total: ~4.5 MB  (well under 50+ MB limit)            │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Code Comparison:**

```typescript
// localStorage (current)
localStorage.setItem('assessments', JSON.stringify(assessments));
const assessments = JSON.parse(localStorage.getItem('assessments') || '[]');
const filtered = assessments.filter(a => a.groupId === 'group-123'); // Slow

// IndexedDB (alternative)
const db = await openDB('skillLab', 1, {
  upgrade(db) {
    const store = db.createObjectStore('assessments', { keyPath: 'id' });
    store.createIndex('groupId', 'groupId');
  }
});
await db.put('assessments', assessment);
const filtered = await db.getAllFromIndex('assessments', 'groupId', 'group-123'); // Fast
```

**Pros:**
- 50+ MB storage
- Fast indexed queries
- Works offline
- Instant app load

**Cons:**
- More complex code
- More error cases to handle
- Migration effort needed

---

## IndexedDB Errors Reference

### 1. Quota Exceeded Error
```
QuotaExceededError: The current transaction exceeded its quota limitations
```
**When:** Storage limit reached (rare - usually 50+ MB available)
**Solution:** Clean old data, or request more storage

### 2. Database Blocked Error
```
Blocked: Database version change blocked
```
**When:** User has app open in multiple tabs during database upgrade
**Solution:** Show message "Please close other tabs and refresh"

### 3. Version Error
```
VersionError: The requested version is less than existing version
```
**When:** Trying to open older database version
**Solution:** Always increment version number when changing schema

### 4. Not Found Error
```
NotFoundError: Object store not found
```
**When:** Trying to access a store that doesn't exist
**Solution:** Check store name, ensure database is properly set up

### 5. Transaction Inactive Error
```
TransactionInactiveError: Transaction is not active
```
**When:** Trying to use a transaction after it completed
**Solution:** Create new transaction for new operations

### 6. Read Only Error
```
ReadOnlyError: A write operation attempted in a read-only transaction
```
**When:** Trying to write in a "readonly" transaction
**Solution:** Use "readwrite" transaction mode

### 7. Private Browsing / Incognito
```
InvalidStateError: IndexedDB not available
```
**When:** Safari private mode (IndexedDB disabled)
**Solution:** Detect and fall back to memory-only mode

**Error Handling Example:**
```typescript
const safeDBOperation = async (operation: () => Promise<any>) => {
  try {
    return await operation();
  } catch (error: any) {
    if (error.name === 'QuotaExceededError') {
      console.warn('Storage full - using memory only');
      return null;
    }
    if (error.name === 'InvalidStateError') {
      console.warn('IndexedDB not available - using memory only');
      return null;
    }
    console.error('IndexedDB error:', error);
    return null;
  }
};
```

---

## Comparison Summary

| Feature | localStorage | IndexedDB |
|---------|-------------|-----------|
| **Storage Limit** | ~5 MB | 50 MB+ |
| **Our Data Size** | Exceeds limit | Fits easily |
| **App Startup** | Fetch from Firebase (10-15s) | Load from local (instant) |
| **Offline Mode** | Fails (data too big) | Works perfectly |
| **Query Speed** | Slow (load all → filter) | Fast (indexed) |
| **Code Complexity** | Simple | More complex |
| **Error Handling** | Minimal | More cases |
| **Migration Effort** | N/A | ~2-3 hours |

---

## Current Decision

**We are keeping localStorage + Firebase approach because:**

1. ✅ Blaze plan makes Firebase fetches cheap
2. ✅ Users typically have internet connection
3. ✅ 10-15 sec load is acceptable with progress indicator
4. ✅ Simpler code, fewer edge cases
5. ✅ Works well enough for current use case

**Consider IndexedDB migration if:**

- Users need offline access
- You want instant load every time
- Data grows much larger (20,000+ records)
- Users frequently on slow/unreliable connections

---

## Key Implementation Details

### Safe localStorage Wrapper
Location: `src/contexts/DatabaseContext.tsx`

```typescript
const safeLocalStorageSet = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    if (error?.name === 'QuotaExceededError' || error?.code === 22) {
      logger.error(`localStorage quota exceeded for "${key}". Data in memory only.`);
      return false;
    }
    logger.error('Error saving to localStorage:', error);
    return false;
  }
};
```

### Data Reading Priority
Location: `src/contexts/DatabaseContext.tsx`

Functions like `getAssessmentsByGroup()` now read from **React state** instead of localStorage:

```typescript
// Before (broken when localStorage full)
const getAssessmentsByGroup = async (groupId: string) => {
  return await DatabaseService.getAssessmentsByGroup(groupId); // reads localStorage
};

// After (works always)
const getAssessmentsByGroup = async (groupId: string) => {
  return assessments.filter(record => record.groupId === groupId); // reads React state
};
```

---

## Files Referenced

- `src/contexts/DatabaseContext.tsx` - Main data management
- `src/services/databaseService.ts` - localStorage operations
- `src/services/firebaseSyncService.ts` - Firebase sync
- `src/components/SyncProgressOverlay.tsx` - Sync progress UI

---

## Future Considerations

1. **IndexedDB Migration** - If needed for offline/instant load
2. **Data Archiving** - Archive old semesters to reduce sync size
3. **Attendance Refactoring** - Derive from assessments (see ATTENDANCE_REFACTORING_NOTES.md)
