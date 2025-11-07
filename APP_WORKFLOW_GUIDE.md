# 📚 Skill Lab Application - Complete Workflow Guide

Step-by-step guide for administrators and trainers on how to use the Skill Lab system effectively.

---

## 📋 Table of Contents

1. [Admin Workflow](#admin-workflow)
2. [Trainer Workflow](#trainer-workflow)
3. [Common Tasks](#common-tasks)
4. [Permissions & Access Control](#permissions--access-control)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## 👨‍💼 Admin Workflow

### Initial Setup (First Time Only)

#### Step 1: Login as Admin

```
1. Go to: https://skill-lab-web.vercel.app
2. Enter credentials:
   - Username: admin (or your custom admin)
   - Password: admin123 (or your password)
3. Click "Login"
```

---

#### Step 2: Create Trainer Accounts

**Location:** Admin Panel → User Management Tab

```
For each trainer:

1. Click "Add User" button
2. Fill in the form:
   ┌────────────────────────────────────┐
   │ Username: trainer1                 │
   │ Email: trainer1@school.edu         │
   │ Role: Trainer ← IMPORTANT          │
   │ Password: (strong password)        │
   │                                    │
   │ Assigned Groups:                   │
   │ ☑ Group 1                          │
   │ ☑ Group 2                          │
   │ ☑ Group 3                          │
   │                                    │
   │ Assigned Years:                    │
   │ ☑ Year 1                           │
   │ ☑ Year 2                           │
   │                                    │
   │        [Cancel]    [Save]          │
   └────────────────────────────────────┘

3. Click "Save"
4. Repeat for all trainers
```

**Example Assignments:**

| Trainer | Groups | Years | Responsibilities |
|---------|--------|-------|------------------|
| trainer1 | 1-5 | 1, 2 | First year students, Groups 1-5 |
| trainer2 | 6-10 | 1, 2 | First year students, Groups 6-10 |
| trainer3 | 11-15 | 3, 4 | Senior students, Groups 11-15 |
| trainer4 | 16-20 | 5, 6 | Final year students, Groups 16-20 |

---

#### Step 3: Add Students

**Location:** Students Page

**Option A: Import from Excel (Recommended for Bulk)**

```
1. Click "Import from Excel"
2. Download template (if needed)
3. Fill template with student data:

   Required columns:
   - Student Name
   - Year (1-6)
   - Group (Group1-Group30)

   Optional columns:
   - Student ID
   - Email
   - Phone
   - Unit (for Year 2/3: MSK, HEM, CVS, Resp, GIT, GUT, Neuro, END)

4. Upload filled Excel file
5. Review import results
6. Fix any errors and re-import if needed
```

**Option B: Add Manually (For Individual Students)**

```
1. Click "Add Student"
2. Fill in form:
   - Name: John Doe
   - Student ID: ST001 (optional, auto-generated if empty)
   - Year: 1 (dropdown 1-6)
   - Group: Group1 (dropdown Group1-Group30)
   - Email: (optional)
   - Phone: (optional)
   - Unit: (only for Year 2/3)

3. Click "Save"
```

---

#### Step 4: Verify Trainer Access

**Test each trainer account:**

```
1. Logout from admin
2. Login as trainer1
3. Go to Students page
4. Verify: Can ONLY see students from assigned groups AND years
5. Example: If trainer1 assigned to:
   - Groups: 1, 2, 3
   - Years: 1, 2

   Should see: Only students from Groups 1-3 AND Years 1-2
   Should NOT see: Students from other groups or other years
```

---

### Regular Admin Tasks

#### Daily/Weekly Tasks

**1. Monitor Trainer Activity**
```
Location: Admin Panel → Trainer Reports

View:
- Attendance records by trainer
- Assessment submissions
- Performance statistics
```

**2. Check System Statistics**
```
Location: Admin Panel → System Statistics

Monitor:
- Total students: 450
- Total groups: 30
- Active users: 5
- Recent activity
```

**3. Review Grand Reports**
```
Location: Admin Panel → Grand Report

Generate reports:
- By year
- By group
- Unit weekly performance (Year 2/3)
- Group performance summary
```

---

#### Monthly Tasks

**1. Export Backup Reports**
```
Location: Admin Panel → Grand Report

Export monthly:
1. Grand Report for each year
2. Group Performance Summary
3. Unit Reports (for Year 2/3)

Store securely: Create folder "Backups/[Month-Year]/"
```

**2. Review User Access**
```
Location: Admin Panel → User Management

Check:
- Active trainers
- Deactivate inactive accounts
- Update group assignments if needed
```

---

#### End of Academic Year

**1. Export All Data**
```
Location: Admin Panel → Grand Report

Export everything:
- All years' simplified reports
- Group performance summaries
- Unit weekly reports
- Trainer reports
```

**2. Run New Year Reset**
```
Location: Admin Panel → New Year Setup

Steps:
1. Click "Start New Year Setup"
2. Review data counts
3. ✅ Export before clearing (recommended)
4. Select what to clear:
   ✅ Clear students
   ✅ Clear attendance
   ✅ Clear assessments
   ☐ Keep groups
5. Click "Export & Continue"
6. Wait for exports (check Downloads folder)
7. Type "DELETE ALL DATA" to confirm
8. Click "Clear Data"
9. Done! Ready for new year
```

---

## 👨‍🏫 Trainer Workflow

### Initial Access

#### Step 1: Login

```
1. Go to: https://skill-lab-web.vercel.app
2. Enter credentials provided by admin:
   - Username: trainer1
   - Password: (your password)
3. Click "Login"
```

---

#### Step 2: Understand Your Access

**What you can see:**

✅ **Students Page:**
- ONLY students from your assigned groups
- ONLY students from your assigned years
- Example: Assigned to Groups 1-3, Years 1-2
  → See only Year 1 & Year 2 students from Groups 1-3

✅ **Attendance Page:**
- Record attendance for YOUR students only
- Filter by your assigned groups

✅ **Combined Input (Attendance + Assessment):**
- Quick entry for YOUR students
- Both attendance and assessments

✅ **Assessments Page:**
- Add assessment scores for YOUR students

❌ **Cannot Access:**
- Admin Panel
- Other trainers' groups
- Students from other years (not assigned to you)
- User management

---

### Daily Tasks

#### Task 1: Record Attendance

**Location:** Attendance Page OR Combined Input Page

**Method A: Attendance Page (Attendance Only)**

```
1. Select Date (today is default)
2. Select Group from dropdown (shows only YOUR groups)
3. Select Year (shows only YOUR years)
4. Click "Get Students"

5. Student list appears (only YOUR students)
6. For each student, select status:
   - Present (green)
   - Late (yellow)
   - Absent (red)

7. Add notes if needed (optional)
8. Click "Save Attendance"
9. ✅ Success! Attendance recorded
```

**Method B: Combined Input (Faster - Attendance + Assessment Together)**

```
1. Select Date
2. Select Group (YOUR groups only)
3. Select Year (YOUR years only)
4. Student list appears

5. For each student:
   - Attendance: Select Present/Late/Absent
   - Assessment: Enter score (if applicable)
   - Assessment Type: Quiz/Exam/Assignment/etc.
   - Week: Enter week number
   - Max Score: Enter maximum possible score

6. Click "Save All Records"
7. ✅ Both attendance AND assessment saved!
```

---

#### Task 2: Add Assessment Scores

**Location:** Assessments Page OR Combined Input Page

**Assessments Page (Assessment Only):**

```
1. Select Date
2. Select Group (YOUR groups only)
3. Select Year (YOUR years only)
4. Click "Get Students"

5. For each student:
   - Assessment Name: "Week 1 Quiz" or "Midterm Exam"
   - Assessment Type: Quiz/Exam/Assignment/Practical/Project/Presentation
   - Week: 1-10 (for tracking weekly progress)
   - Score: Student's score
   - Max Score: Maximum possible score
   - Notes: (optional)

6. Click "Save Assessment"
7. ✅ Assessment recorded!
```

---

### Weekly Tasks

**Review Your Students' Progress:**

```
Location: Students Page

1. Filter by your group
2. Filter by year
3. Review student list
4. Export student list if needed (Download Excel)
```

---

### Permissions Summary

#### ✅ What Trainers CAN Do:

| Feature | Access | Details |
|---------|--------|---------|
| **View Students** | ✅ Limited | Only assigned groups & years |
| **Record Attendance** | ✅ Limited | Only for assigned students |
| **Add Assessments** | ✅ Limited | Only for assigned students |
| **View Reports** | ❌ No | Admin only |
| **Manage Users** | ❌ No | Admin only |
| **Export Data** | ✅ Yes | Can export their students |
| **Import Students** | ❌ No | Admin only |
| **Delete Students** | ❌ No | Admin only |

---

## 🔐 Permissions & Access Control

### Group Restrictions ✅ Working

**How it works:**

```
Admin assigns trainer to Groups 1, 2, 3
→ Trainer sees ONLY students from Groups 1, 2, 3
→ Cannot see or access other groups

Example:
Trainer1: Groups 1-5 → Sees Groups 1-5 only
Trainer2: Groups 6-10 → Sees Groups 6-10 only
No overlap, perfect separation!
```

**Verified in:**
- ✅ Students page
- ✅ Attendance page
- ✅ Assessments page
- ✅ Combined Input page

---

### Year Restrictions ✅ Working

**How it works:**

```
Admin assigns trainer to Years 1, 2
→ Trainer sees ONLY students from Years 1, 2
→ Cannot see students from Years 3, 4, 5, 6

Example:
Trainer1: Years 1, 2 → Sees Year 1 & 2 students only
Trainer2: Years 3, 4 → Sees Year 3 & 4 students only
Complete separation by academic year!
```

**Verified in:**
- ✅ Students page (lines 86-92)
- ✅ Attendance page (line 58)
- ✅ Assessments page
- ✅ Combined Input page (line 128)

---

### Combined Restrictions (Groups AND Years)

**Both filters work together:**

```
Trainer assigned to:
- Groups: 1, 2, 3
- Years: 1, 2

Can see: Students who match BOTH conditions
- Must be in Group 1, 2, OR 3 (group filter)
- AND must be in Year 1 OR 2 (year filter)

Cannot see:
- Year 1 students from Group 5 (wrong group)
- Year 3 students from Group 2 (wrong year)
- Year 4 students from Group 10 (wrong both)

✅ This ensures perfect data isolation!
```

---

## 📝 Common Tasks

### Add a New Student (Admin Only)

```
1. Go to: Students page
2. Click: "Add Student"
3. Fill form:
   - Name: Required
   - Year: Required (1-6)
   - Group: Required (Group1-30)
   - Student ID: Optional (auto-generated)
   - Email/Phone: Optional
   - Unit: Required for Year 2/3
4. Click: "Save"
5. ✅ Student appears in list
```

---

### Record Daily Attendance (Trainer)

```
1. Go to: Attendance page OR Combined Input
2. Select: Today's date
3. Select: Your group (dropdown shows only yours)
4. Select: Year
5. Mark: Each student (Present/Late/Absent)
6. Add: Notes if needed
7. Click: "Save Attendance"
8. ✅ Done! Attendance recorded
```

---

### Add Assessment Scores (Trainer)

```
1. Go to: Assessments page
2. Select: Date, Group, Year
3. For each student:
   - Name: Week 1 Quiz
   - Type: Quiz
   - Week: 1
   - Score: 8
   - Max Score: 10
4. Click: "Save Assessment"
5. ✅ Score recorded!
```

---

### Export Student List (Both)

```
1. Go to: Students page
2. Filter: Select year/group
3. Click: "Export to Excel"
4. ✅ Excel file downloads
5. Find: In Downloads folder
```

---

### Generate Reports (Admin Only)

```
1. Go to: Admin Panel → Grand Report
2. Select: Year (or "All Years")
3. Select: Group (or "All Groups")
4. Click: "Export Report"
5. ✅ Multiple Excel files download:
   - Simplified report
   - Group performance summary
   - Unit reports (if applicable)
```

---

## ✅ Best Practices

### For Admins:

1. **✅ Create trainers FIRST** before adding students
2. **✅ Assign trainers** to specific groups AND years for data isolation
3. **✅ Test trainer access** after creating accounts
4. **✅ Export monthly backups** to avoid data loss
5. **✅ Communicate before major operations** (like New Year Reset)
6. **✅ Review trainer reports** weekly to monitor activity
7. **✅ Use bulk import** for adding many students (faster than manual)

---

### For Trainers:

1. **✅ Record attendance daily** while students are fresh in mind
2. **✅ Use Combined Input** for faster data entry (both attendance + assessment)
3. **✅ Add notes** for absent students (reason for absence)
4. **✅ Double-check scores** before saving assessments
5. **✅ Export your student list** at start of term for reference
6. **✅ Contact admin** if you need access to additional groups/years
7. **✅ Work offline if needed** - data syncs when back online

---

### For Both:

1. **✅ Use Chrome or Edge** for best compatibility
2. **✅ Don't force-refresh** during active operations
3. **✅ Clear browser cache** if seeing old data
4. **✅ Logout properly** when done (don't just close tab)
5. **✅ Use strong passwords** and change default passwords
6. **✅ Report issues** to admin immediately
7. **✅ Trust real-time sync** - changes appear automatically

---

## 🐛 Troubleshooting

### Issue: Trainer Can See All Years (Expected Behavior?)

**Question:** "I assigned trainer to specific years, but they can still see all years in dropdown"

**Answer:** ✅ **This is correct behavior!**

**Why:**
- Trainer CAN see year dropdown (to select which year to work with)
- But student list is FILTERED by assigned years
- If trainer selects a year they're not assigned to → No students appear

**Example:**
```
Trainer assigned to Years 1, 2

Selects Year 1: ✅ Shows Year 1 students from assigned groups
Selects Year 2: ✅ Shows Year 2 students from assigned groups
Selects Year 3: ✅ Shows "No students found" (not assigned)
Selects Year 4: ✅ Shows "No students found" (not assigned)
```

**This is CORRECT - the data is protected even though dropdown shows all years!**

---

### Issue: Can't See Students

**Checklist:**
1. ✅ Selected correct group from dropdown?
2. ✅ Selected correct year from dropdown?
3. ✅ Are you assigned to this group/year? (Ask admin)
4. ✅ Have students been added to this group/year?
5. ✅ Try refreshing page (Ctrl+R)

---

### Issue: Changes Not Saving

**Steps:**
1. Check internet connection
2. Check browser console for errors (F12)
3. Try logging out and back in
4. Clear browser cache
5. Contact admin

---

### Issue: Seeing Wrong Students

**Verify:**
1. Check your assigned groups (ask admin)
2. Check your assigned years (ask admin)
3. Verify you're logged in as correct user
4. Check dropdown filters match what you expect

---

## 📊 Workflow Diagrams

### Admin: Complete Setup Flow

```
┌─────────────────────────────────────────────────────────┐
│                    ADMIN WORKFLOW                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Login as Admin                                       │
│     ↓                                                    │
│  2. Create Trainer Accounts                              │
│     • Assign groups (1-30)                               │
│     • Assign years (1-6)                                 │
│     • Set strong passwords                               │
│     ↓                                                    │
│  3. Add Students                                         │
│     Option A: Import Excel (bulk)                        │
│     Option B: Add manually (individual)                  │
│     ↓                                                    │
│  4. Verify Trainer Access                                │
│     • Login as each trainer                              │
│     • Confirm they see only assigned groups/years        │
│     ↓                                                    │
│  5. Monitor & Manage                                     │
│     • Check Trainer Reports daily/weekly                 │
│     • Export monthly backups                             │
│     • Run New Year Reset when needed                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

### Trainer: Daily Tasks Flow

```
┌─────────────────────────────────────────────────────────┐
│                   TRAINER WORKFLOW                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Login as Trainer                                     │
│     ↓                                                    │
│  2. Record Daily Attendance                              │
│     • Select date, group, year                           │
│     • Mark Present/Late/Absent                           │
│     • Add notes if needed                                │
│     • Save                                               │
│     ↓                                                    │
│  3. Add Assessment Scores (if applicable)                │
│     • Select date, group, year                           │
│     • Enter scores for each student                      │
│     • Specify assessment type & week                     │
│     • Save                                               │
│     ↓                                                    │
│  4. Review Student Progress (weekly)                     │
│     • Filter by group/year                               │
│     • Export list if needed                              │
│     ↓                                                    │
│  5. Logout                                               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Reference

### Admin Shortcuts

| Task | Location | Shortcut |
|------|----------|----------|
| Create Trainer | Admin Panel → User Management | Click "Add User" |
| Add Student | Students Page | Click "Add Student" |
| Import Students | Students Page | Click "Import from Excel" |
| View Reports | Admin Panel → Grand Report | Select filters → Export |
| New Year Reset | Admin Panel → New Year Setup | Click "Start New Year Setup" |
| Monitor Trainers | Admin Panel → Trainer Reports | View by trainer |

---

### Trainer Shortcuts

| Task | Location | Shortcut |
|------|----------|----------|
| Record Attendance | Attendance Page | Select group/year → Mark → Save |
| Quick Entry | Combined Input | Both attendance + assessment |
| Add Scores | Assessments Page | Select students → Enter scores |
| View Students | Students Page | Filter by group/year |
| Export List | Students Page | Click "Export to Excel" |

---

## 📞 Support

**For Admins:**
- Check: MULTI_USER_GUIDE.md (multi-user scenarios)
- Check: NEW_YEAR_RESET_GUIDE.md (year transitions)
- Check: FIREBASE_SYNC_IMPLEMENTATION_SUMMARY.md (technical)

**For Trainers:**
- Contact your admin for:
  - Password resets
  - Group/year assignment changes
  - Access issues
  - Technical problems

---

## ✅ Success Checklist

### Admin Setup Checklist:

- [ ] Created all trainer accounts
- [ ] Assigned groups and years to each trainer
- [ ] Tested each trainer login
- [ ] Added all students (import or manual)
- [ ] Verified trainer can only see their assigned data
- [ ] Exported initial backup
- [ ] Reviewed system statistics
- [ ] All trainers have login credentials

### Trainer Daily Checklist:

- [ ] Logged in successfully
- [ ] Recorded attendance for all groups
- [ ] Added assessment scores (if applicable)
- [ ] Reviewed any absent students
- [ ] Added notes where needed
- [ ] Verified all data saved
- [ ] Logged out properly

---

**Your Skill Lab system is ready for production use!** 🎉

**Last Updated:** January 2025
**Version:** 1.0
**Status:** ✅ Production Ready
