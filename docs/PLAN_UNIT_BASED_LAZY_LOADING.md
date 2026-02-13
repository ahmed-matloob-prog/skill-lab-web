# Plan: Unit-Based Lazy Loading

**Status:** Planned (not yet implemented)
**Created:** January 30, 2026
**Priority:** High

---

## Problem
The app loads ALL attendance and assessment records on every startup, including data from completed units (Semester 1). The semester is over and this old data isn't needed for daily use. This slows down startup, uses more Firebase quota, and consumes more memory.

## Solution
Only load the **current unit's data** on startup. Historical data (completed units) loads on demand when reports or admin pages are accessed.

## Approach: Filter-on-Load with Lazy Loading

Instead of restructuring localStorage (risky for existing data), we:
1. Add `unit` field to `AttendanceRecord` so it can be filtered like assessments
2. Migrate existing attendance records to include unit tags
3. On startup: load only current unit records into React state
4. On Firebase sync: use `where()` queries to fetch only current unit
5. For reports/admin: provide a `loadFullData()` function

This is **safe** (no storage restructuring), **simple** (changes mostly in DatabaseContext), and **reversible**.

---

## Implementation Steps

### Step 1: Add `unit` field to AttendanceRecord

**File:** `src/types/index.ts`

Add `unit?: string` to the `AttendanceRecord` interface (between `groupId` and `notes`). This is backward-compatible since it's optional.

```typescript
export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  timestamp: string;
  synced: boolean;
  trainerId: string;
  year: number;
  groupId: string;
  unit?: string;      // <-- NEW: unit tag for filtering
  notes?: string;
}
```

---

### Step 2: Auto-populate unit on new attendance records

**File:** `src/pages/CombinedInput.tsx`

When creating a new attendance record, include the selected unit:
```typescript
newRecord.unit = selectedUnit !== 'all' ? selectedUnit : group.currentUnit
```

This ensures all NEW records going forward have a unit tag.

---

### Step 3: Migrate existing attendance records (one-time)

**File:** `src/contexts/DatabaseContext.tsx`

Add a one-time migration in `initializeDatabase()`:
- Read all attendance records from localStorage
- For each record without a `unit`, look up its group's `currentUnit`
- Tag the record with that unit
- Save back to localStorage
- Mark migration as done with a localStorage flag (`attendance_unit_migrated`)

```typescript
// One-time migration: tag attendance records with unit
const migrated = localStorage.getItem('attendance_unit_migrated');
if (!migrated) {
  const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
  const groups = JSON.parse(localStorage.getItem('groups') || '[]');
  const groupMap = new Map(groups.map(g => [g.id, g]));

  const updated = attendance.map(record => {
    if (!record.unit) {
      const group = groupMap.get(record.groupId);
      return { ...record, unit: group?.currentUnit || undefined };
    }
    return record;
  });

  localStorage.setItem('attendance', JSON.stringify(updated));
  localStorage.setItem('attendance_unit_migrated', 'true');
}
```

**Note:** Since the semester just ended, the group's `currentUnit` reflects the last unit studied - which is the correct tag for existing records.

---

### Step 4: Unit-aware startup loading

**File:** `src/contexts/DatabaseContext.tsx`

Modify `initializeDatabase()`:

1. Load students and groups fully (small datasets, always needed)
2. Determine current units from groups: `groups.map(g => g.currentUnit).filter(Boolean)`
3. Load attendance/assessments from localStorage but **filter** to only include records matching current units
4. Add new state variables:
   - `isFullDataLoaded: boolean` (default: false) - tracks if all data is in memory
   - `loadedUnits: string[]` - tracks which units are currently loaded

Filter logic:
```typescript
// Include record if:
// 1. It has no unit (Years 1,4,5,6 - always include)
// 2. Its unit matches a current unit
const currentUnits = groups.map(g => g.currentUnit).filter(Boolean);
const filteredAttendance = allAttendance.filter(r =>
  !r.unit || currentUnits.includes(r.unit)
);
const filteredAssessments = allAssessments.filter(r =>
  !r.unit || currentUnits.includes(r.unit)
);
```

---

### Step 5: Unit-aware Firebase sync

**File:** `src/services/firebaseSyncService.ts`

Add new methods alongside existing ones:
```typescript
// New: fetch only current unit
async fetchAssessmentsByUnit(unit: string): Promise<AssessmentRecord[]> {
  const q = query(collection(db, 'assessments'), where('unit', '==', unit));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as AssessmentRecord);
}

async fetchAttendanceByUnit(unit: string): Promise<AttendanceRecord[]> {
  const q = query(collection(db, 'assessments'), where('unit', '==', unit));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as AttendanceRecord);
}

// Existing fetchAssessments() and fetchAttendance() kept for full loading
```

**File:** `src/contexts/DatabaseContext.tsx`

Modify `syncFromFirebase()`:
- Instead of fetching all attendance/assessments, fetch only current unit(s)
- Real-time listeners also scoped to current unit

---

### Step 6: On-demand full data loading

**File:** `src/contexts/DatabaseContext.tsx`

Add new function to the context interface and implementation:
```typescript
// In DatabaseContextType interface:
loadFullData: () => Promise<void>;
isFullDataLoaded: boolean;

// Implementation:
const loadFullData = async () => {
  if (isFullDataLoaded) return; // Already loaded

  // Load ALL from localStorage (unfiltered)
  const allAttendance = await DatabaseService.getAttendanceRecords();
  const allAssessments = await DatabaseService.getAssessmentRecords();

  // Sync ALL from Firebase
  if (FirebaseSyncService.isAvailable()) {
    const fbAttendance = await FirebaseSyncService.fetchAttendance();
    const fbAssessments = await FirebaseSyncService.fetchAssessments();
    // Merge with conflict resolution...
  }

  setAttendance(allAttendance);
  setAssessments(allAssessments);
  setIsFullDataLoaded(true);
};
```

---

### Step 7: Report pages trigger full data load

**Files:**
- `src/pages/AttendanceReport.tsx`
- `src/pages/AdminReport.tsx`
- `src/pages/TrainerReports.tsx`

Add at the top of each report component:
```typescript
const { loadFullData, isFullDataLoaded } = useDatabase();

useEffect(() => {
  if (!isFullDataLoaded) {
    loadFullData();
  }
}, []);
```

Show a brief loading indicator while historical data loads.

---

### Step 8: Handle years without units (1, 4, 5, 6)

Years 1, 4, 5, 6 have no units defined. Their data is always included regardless of filtering, since it's a small amount. The unit-based filtering only applies to Year 2 and Year 3 records which constitute the bulk of data.

---

## Files to Modify

| File | Change | Risk |
|------|--------|------|
| `src/types/index.ts` | Add `unit?: string` to AttendanceRecord | None - optional field |
| `src/contexts/DatabaseContext.tsx` | Migration, filtered loading, `loadFullData()`, new state | Medium - core data layer |
| `src/services/firebaseSyncService.ts` | Add unit-filtered fetch methods | Low - additive only |
| `src/pages/CombinedInput.tsx` | Include unit when creating attendance records | Low - one line change |
| `src/pages/AttendanceReport.tsx` | Call `loadFullData()` on mount | Low |
| `src/pages/AdminReport.tsx` | Call `loadFullData()` on mount | Low |
| `src/pages/TrainerReports.tsx` | Call `loadFullData()` on mount | Low |

---

## Before vs After

| Metric | Before | After |
|--------|--------|-------|
| Startup data loaded | ALL records | Current unit only |
| Firebase reads on startup | Entire collections | Filtered by unit |
| Memory on startup | All semesters | Current unit only |
| Report page load | Instant (data pre-loaded) | Brief delay on first visit |
| Data safety | N/A | No data deleted or restructured |

---

## Data Safety Guarantees

- **No storage restructuring** - localStorage keys stay the same
- **No data deletion** - old data stays in localStorage and Firebase untouched
- **Backward compatible** - `unit` field is optional, old records work fine
- **Reversible** - remove the filter logic and everything loads as before
- **Migration is additive** - only adds unit tags to records, never removes data

---

## Verification Checklist

- [ ] Build succeeds (`npm run build`)
- [ ] App starts and loads only current unit data (check console logs)
- [ ] Input Data page works normally - can mark attendance and add assessments
- [ ] New attendance records include the unit field
- [ ] Navigate to Attendance Report - historical data loads automatically
- [ ] Navigate to Admin Panel - full data available in reports
- [ ] Check localStorage - existing records now have unit tags
- [ ] Offline mode still works correctly
