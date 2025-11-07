# 🔄 Starting a New Academic Year - Data Reset Guide

This guide explains how to clear all reports and data when starting a new academic year.

---

## 📊 Current Data Structure

Your application stores data in **two locations**:

1. **localStorage** (browser storage - instant access)
2. **Firebase Firestore** (cloud database - synchronized backup)

### Data Collections:
- **Students**: Student records with names, IDs, year, group assignments
- **Groups**: Group 1-30 for all years (1-6)
- **Attendance**: Daily attendance records (present/late/absent)
- **Assessments**: Assessment scores, types, weeks, dates

---

## ⚠️ Important: What Happens When You Clear Data

### Option 1: Clear Everything (Full Reset)
**Deletes:**
- ✅ All students
- ✅ All attendance records
- ✅ All assessment records
- ✅ All groups

**Keeps:**
- ✅ User accounts (admin, trainers)
- ✅ User passwords
- ✅ App settings

### Option 2: Clear Only Students (Partial Reset)
**Deletes:**
- ✅ All student records

**Keeps:**
- ✅ All attendance records (but they become orphaned)
- ✅ All assessment records (but they become orphaned)
- ✅ All groups
- ✅ User accounts

⚠️ **Warning**: This creates "orphaned" records - attendance/assessments will still exist but reference deleted students, causing data inconsistencies.

### Option 3: Archive & Clear (Recommended)
**Steps:**
1. Export all reports to Excel (backup)
2. Store exports in a safe location
3. Clear all data
4. Start fresh with new students

---

## 🎯 Recommended Approach: Archive Before Reset

### **Step 1: Export All Reports (Backup)**

Before clearing anything, export all your data:

#### **A. Admin Report Exports**
1. Go to **Admin Panel** → **Grand Report**
2. For each year (1-6):
   - Select **Year X**
   - Click **"Export Report"** → Saves simplified report
   - Click **"Export Group Summary"** → Saves 3-sheet comparison
   - For Years 2 & 3 with units:
     - Select each unit (MSK, HEM, CVS, etc.)
     - Click **"Export Unit Report"** → Saves 4-sheet performance

#### **B. Trainer Reports Export**
1. Go to **Admin Panel** → **Trainer Reports**
2. Select each trainer
3. Click **"Export"** for each trainer's data

#### **C. Individual Data Exports**
You can also export from the Attendance/Assessment pages if needed.

**Result:** You'll have 10-20 Excel files with complete historical data.

**Store these files:**
```
📁 Academic Year 2024-2025 Archives/
  ├── Year1_Report_2025-01-07.xlsx
  ├── Year2_Report_2025-01-07.xlsx
  ├── Year3_Report_2025-01-07.xlsx
  ├── Group_Performance_Summary_2025-01-07.xlsx
  ├── MSK_Year2_Weekly_Performance_2025-01-07.xlsx
  ├── HEM_Year2_Weekly_Performance_2025-01-07.xlsx
  └── ... (all other exports)
```

---

### **Step 2: Clear All Data**

Currently, there are **two methods**:

#### **Method A: Browser Console (Current - Manual)**

1. **Open Production Site:** https://skill-lab-web.vercel.app
2. **Login as Admin**
3. **Open Browser Console** (F12)
4. **Clear localStorage:**

```javascript
// Clear ALL data from localStorage
localStorage.removeItem('students');
localStorage.removeItem('groups');
localStorage.removeItem('attendance');
localStorage.removeItem('assessments');

// Verify it's cleared
console.log('Students:', localStorage.getItem('students')); // Should be null
console.log('Groups:', localStorage.getItem('groups')); // Should be null
console.log('Attendance:', localStorage.getItem('attendance')); // Should be null
console.log('Assessments:', localStorage.getItem('assessments')); // Should be null

// Refresh to see empty state
location.reload();
```

5. **Clear Firebase Firestore:**
   - Go to: https://console.firebase.google.com/project/skill-lab-web/firestore
   - Delete collections one by one:
     - Delete **students** collection (click 3 dots → Delete collection)
     - Delete **groups** collection
     - Delete **attendance** collection
     - Delete **assessments** collection
   - **Keep these collections:**
     - ✅ **users** (admin/trainer accounts)
     - ✅ **passwords** (user passwords)

6. **Refresh the app** (F5)

#### **Method B: Add Admin Panel Feature (Recommended - I can implement this)**

I can add a "New Academic Year" feature to the Admin Panel with:
- ✅ One-click data reset
- ✅ Automatic backup export before reset
- ✅ Confirmation dialog with warning
- ✅ Clears both localStorage and Firebase
- ✅ Option to keep/delete specific data types

Would you like me to implement this?

---

### **Step 3: Set Up New Year**

After clearing data:

1. **Verify Empty State**
   - Students page should show "No students found"
   - Attendance/Assessment pages should be empty

2. **Groups Auto-Created**
   - The app automatically creates Groups 1-30 for all years
   - No manual action needed

3. **Add New Students**
   - **Option A:** Import from Excel (bulk)
     - Go to **Students** page
     - Click **"Import from Excel"**
     - Use the template or your own file

   - **Option B:** Add manually (one by one)
     - Click **"Add Student"** button
     - Fill in details

4. **Assign Trainers to Groups**
   - Go to **Admin Panel** → **User Management**
   - Edit each trainer
   - Assign them to new groups/years

5. **Start Recording**
   - Begin recording attendance
   - Start adding assessments

---

## 🆕 Option: Implement "New Academic Year" Feature

I can add an automated feature to make this easier:

### **What I Can Build:**

**Admin Panel → "New Academic Year" Button**

Features:
- 📊 **Auto-Export All Data** - Creates backup Excel files automatically
- 🗑️ **Selective Clearing** - Choose what to clear:
  - [ ] Clear Students
  - [ ] Clear Attendance
  - [ ] Clear Assessments
  - [ ] Keep Groups (recommended)
- ⚠️ **Safety Confirmations** - Multiple confirmations before deleting
- 🔄 **Firebase Sync** - Clears both localStorage and Firebase
- 📝 **Archive Naming** - Auto-names exports like "AY_2024-2025_Archive.zip"
- ✅ **Success Report** - Shows what was cleared and what was kept

**UI Example:**
```
┌─────────────────────────────────────────────┐
│  🎓 Start New Academic Year                 │
├─────────────────────────────────────────────┤
│                                             │
│  Current Year: 2024-2025                    │
│  New Year: 2025-2026                        │
│                                             │
│  ⚠️ Warning: This will permanently delete:  │
│  • 450 Students                             │
│  • 2,340 Attendance Records                 │
│  • 1,890 Assessment Records                 │
│                                             │
│  ✅ Before proceeding, this will:           │
│  1. Export all data to Excel files          │
│  2. Download archive as ZIP file            │
│  3. Clear selected data collections         │
│                                             │
│  Options:                                   │
│  ☑ Export data before clearing             │
│  ☑ Clear students                           │
│  ☑ Clear attendance records                 │
│  ☑ Clear assessment records                 │
│  ☐ Clear groups (not recommended)           │
│  ☑ Keep user accounts                       │
│                                             │
│  [Cancel]  [Export Only]  [Clear & Start]   │
└─────────────────────────────────────────────┘
```

Would you like me to implement this feature?

---

## 🔍 Alternative: Keep Historical Data

Instead of deleting, you could:

### **Option: Multi-Year System**

Keep all data and filter by academic year:
- Add "Academic Year" field to all records (e.g., "2024-2025", "2025-2026")
- Filter reports by academic year
- Never delete historical data
- Benefits:
  - ✅ Compare year-over-year performance
  - ✅ Track multi-year student progress
  - ✅ Historical trends and analytics
  - ✅ No data loss risk

**This requires:**
- Adding "academicYear" field to all data models
- Updating all forms to include year selection
- Updating all reports to filter by year
- Migration script to add year to existing data

Would you like this instead?

---

## 📋 Summary: Quick Decision Guide

### **Choose Your Approach:**

| Scenario | Recommended Method | Why |
|----------|-------------------|-----|
| **Start fresh each year, don't need history** | Full Reset (Method A or B) | Simple, clean slate |
| **Want to compare multiple years** | Multi-Year System | Keep historical data |
| **First time resetting** | Manual with exports (Method A) | Learn the process |
| **Reset yearly** | Implement automated feature (Method B) | Save time, prevent errors |

---

## ⚡ Quick Start: Manual Reset (Right Now)

If you want to reset **immediately** without waiting for new features:

```javascript
// 1. Login as admin: https://skill-lab-web.vercel.app

// 2. Export all reports from Admin Panel (click all export buttons)

// 3. Open browser console (F12) and run:
localStorage.removeItem('students');
localStorage.removeItem('groups');
localStorage.removeItem('attendance');
localStorage.removeItem('assessments');
location.reload();

// 4. Go to Firebase Console and delete collections:
// https://console.firebase.google.com/project/skill-lab-web/firestore
// Delete: students, groups, attendance, assessments
// Keep: users, passwords
```

**Done!** You're ready for a new year.

---

## 🤔 Questions to Answer:

1. **Do you want to keep historical data across years?**
   - Yes → I'll implement multi-year system
   - No → Continue with full reset approach

2. **Do you want an automated "New Year" feature in Admin Panel?**
   - Yes → I'll build the feature with auto-export and clearing
   - No → Continue using manual method

3. **How often will you reset?**
   - Yearly → Automated feature recommended
   - Rarely → Manual method is fine

Let me know your preference, and I'll help you proceed!
