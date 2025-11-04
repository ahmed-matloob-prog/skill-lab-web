# Skill Lab Web Application - Practical User Guide

## 📋 **Table of Contents**
1. [Getting Started](#getting-started)
2. [Initial Setup](#initial-setup)
3. [Admin Workflow](#admin-workflow)
4. [Trainer Workflow](#trainer-workflow)
5. [Student Management](#student-management)
6. [Attendance Management](#attendance-management)
7. [Assessment Management](#assessment-management)
8. [Reports & Export](#reports--export)
9. [Excel Import/Export](#excel-importexport)
10. [Common Workflows](#common-workflows)
11. [Troubleshooting](#troubleshooting)

---

## 🚀 **Getting Started**

### **Step 1: Launch the Application**

#### **Option A: Development Mode**
```bash
# Navigate to project directory
cd "C:\Users\ahmed\Documents\python app\skill lab web"

# Install dependencies (first time only)
npm install

# Start the development server
npm start
```
- Application will open at `http://localhost:3000`
- Hot reload enabled for development

#### **Option B: Production Build**
```bash
# Build the application
npm run build

# Serve the build folder
npx serve -s build
```
- Application will be available at `http://localhost:3000` (or specified port)

#### **Option C: Trainer Distribution (Standalone)**
```bash
# Navigate to trainer distribution folder
cd trainer-distribution

# Start the server
node server.js
```
- Application will open at `http://localhost:3000`
- No build process required

---

## 🔐 **Initial Setup**

### **Step 2: Login to the Application**

1. **Open the application** in your web browser
2. **Login Page** will appear automatically if not logged in
3. **Enter credentials** based on your role:

#### **Default Login Credentials:**

**Admin Account:**
- Username: `admin`
- Password: `admin123`

**Trainer Accounts:**
- Trainer 1: `trainer1` / `trainer123`
- Trainer 2: `trainer2` / `trainer123`
- Trainer 3: `trainer3` / `trainer123`

4. **Click "Login"** button
5. You'll be redirected to the **Dashboard**

---

## 👨‍💼 **Admin Workflow**

### **Step 3: Admin - Initial Setup**

#### **3.1 Ensure Groups Are Created**
1. Navigate to **Admin Panel** (click "Admin" in sidebar)
2. Click on **"Group Management"** tab
3. Click **"Ensure All Groups (1-30)"** button
4. This creates all 30 groups (Group1-Group30) that are available for all years
5. Verify groups are listed in the table

#### **3.2 Create Trainer Accounts**
1. In Admin Panel, click **"User Management"** tab
2. Click **"Add User"** button
3. Fill in the form:
   - **Username**: Enter unique username (e.g., `trainer4`)
   - **Email**: Enter email address
   - **Role**: Select "Trainer" or "Admin"
   - **Password**: Enter secure password
   - **Assigned Groups**: Select groups this trainer will manage (multiple selection)
   - **Assigned Years**: Select years this trainer will manage (multiple selection)
4. Click **"Add User"** button
5. Trainer account is now created

#### **3.3 Assign Groups to Trainers**
- When creating/editing a trainer:
  - Select specific groups (e.g., Group1, Group2, Group3)
  - Select specific years (e.g., Year 1, Year 2)
  - This ensures trainers only see data for their assigned groups and years

---

## 👨‍🏫 **Trainer Workflow**

### **Step 4: Trainer - Daily Operations**

#### **4.1 View Dashboard**
1. After login, you'll see the **Dashboard**
2. View key metrics:
   - Total Students
   - Total Groups
   - Attendance Records
   - Assessment Records
   - Attendance Rate
   - Average Score

#### **4.2 Check Assigned Data**
- Trainers only see:
  - Students from assigned groups
  - Students from assigned years
  - Related attendance and assessment records
- Data is automatically filtered based on your permissions

---

## 👥 **Student Management**

### **Step 5: Add Individual Students**

1. Navigate to **"Students"** page (click in sidebar)
2. Click **"Add Student"** button
3. Fill in the form:
   - **Full Name***: Enter student's full name (required)
   - **Student ID**: Auto-generated if left empty, or enter custom ID
   - **Year***: Select year (1-6) (required)
   - **Unit**: Select unit if Year 2 or 3:
     - **Year 2**: MSK, HEM, CVS, Resp
     - **Year 3**: GIT, GUT, Neuro, END
   - **Group***: Select group from dropdown (required)
   - **Email**: Optional email address
   - **Phone**: Optional phone number
4. Click **"Add Student"** or **"Update Student"** button
5. Student appears in the students table

### **Step 6: Bulk Import Students from Excel**

#### **6.1 Download Template**
1. In Students page, click **"Download Template"** button
2. Excel file `student_import_template.xlsx` will download
3. Open the template to see required format

#### **6.2 Prepare Your Excel File**
Your Excel file should have these columns:
- **Student Name** (required): Full name of student
- **Year** (required): Number between 1-6
- **Group** (required): Format like "Group1" or "group-1" (Group1-Group30)
- **Student ID** (optional): Will be auto-generated if empty
- **Email** (optional): Valid email address
- **Phone** (optional): Phone number
- **Unit** (optional): For Year 2/3 students (MSK, HEM, CVS, Resp, GIT, GUT, Neuro, END)

**Example Excel Data:**
```
Student Name    | Year | Group  | Student ID | Email              | Phone        | Unit
John Doe        | 1    | Group1 | ST001      | john@example.com   | 1234567890   |
Jane Smith      | 2    | Group6 | ST002      | jane@example.com   | 1234567891   | MSK
Ahmed Ali       | 3    | Group5 | ST003      | ahmed@example.com  | 1234567892   | GIT
```

#### **6.3 Import Excel File**
1. In Students page, click **"Import Excel"** button
2. Click **"Choose Excel File"** button
3. Select your prepared Excel file (.xlsx or .xls)
4. Wait for processing
5. Review import results:
   - Successfully imported students count
   - Errors (if any) - duplicate names, invalid data, etc.
6. Click **"Done"** to close the dialog
7. Students will appear in the students table

#### **6.4 Handle Import Errors**
- **Duplicate Names**: If a student with the same name exists in the same year/group
- **Invalid Year**: Year must be 1-6
- **Invalid Group**: Group must be Group1-Group30 format
- **Duplicate Student IDs**: If Student ID already exists
- Review errors and fix Excel file if needed

### **Step 7: Edit or Delete Students**

#### **Edit Student:**
1. In Students table, click **Edit icon** (pencil) on student row
2. Modify information in the dialog
3. Click **"Update Student"** button

#### **Delete Student:**
1. In Students table, click **Delete icon** (trash) on student row
2. Confirm deletion in popup
3. Student and related records (attendance, assessments) will be deleted

---

## 📅 **Attendance Management**

### **Step 8: Mark Attendance Using Combined Input**

#### **8.1 Navigate to Combined Input**
1. Click **"Input"** in sidebar (Combined Input page)
2. This page allows you to mark attendance AND enter assessment scores at once

#### **8.2 Select Date and Filters**
1. **Select Date**: Click date picker and choose the date for attendance
2. **Filter by Year**: Select specific year or "All Years"
3. **Filter by Group**: Select specific group or "All Groups"
4. **Filter by Unit**: Select unit (only for Year 2/3) or "All Units"
5. Click **"Refresh"** to load students for selected filters

#### **8.3 Mark Attendance**
For each student in the table:
1. Click one of three buttons:
   - **Present** (Green) - Student is present
   - **Late** (Orange) - Student is late
   - **Absent** (Red) - Student is absent
2. Selected status will be highlighted
3. You can change the status by clicking another button

#### **8.4 Enter Assessment Scores (Optional)**
If you want to enter assessment scores at the same time:
1. **Set Assessment Details** (top of page):
   - **Assessment Name***: Enter name (e.g., "Midterm Exam")
   - **Assessment Type**: Select (Exam, Quiz, Assignment, Project, Presentation)
   - **Max Score**: Enter maximum possible score (default: 100)
2. **Select Week**: Choose week number (1-10) if applicable
3. For each student, enter **Score** in the number field
4. Score must be between 0 and Max Score

#### **8.5 Save All Data**
1. Review all entries
2. Click **"Save All Data"** button at bottom
3. Wait for confirmation message
4. Message shows:
   - Number of attendance records saved
   - Number of assessment scores saved
5. Assessment form and scores are cleared (ready for next assessment)

---

## 📝 **Assessment Management**

### **Step 9: Record Assessment Scores**

#### **9.1 Using Combined Input (Recommended)**
- Follow steps in Section 8.4 above
- This is the fastest way to enter attendance and scores together

#### **9.2 Assessment Best Practices**
- **Assessment Name**: Use descriptive names (e.g., "Week 1 Quiz", "Midterm Exam")
- **Assessment Type**: Choose appropriate type for accurate reporting
- **Max Score**: Set correct maximum for percentage calculations
- **Week**: Use week numbers for organized reporting
- **Unit**: Automatically included for Year 2/3 students

---

## 📊 **Reports & Export**

### **Step 10: View Reports**

#### **10.1 Admin - Grand Report**
1. Login as Admin
2. Navigate to **Admin Panel**
3. Click **"Grand Report"** tab
4. **Select Filters**:
   - Choose specific Year (or "All Years")
   - Choose specific Group (or "All Groups")
5. Click **"Generate Report"** button
6. View comprehensive report showing:
   - Summary statistics (students, groups, attendance, assessments)
   - Average attendance rate
   - Average score
   - Detailed student-by-student breakdown

#### **10.2 Admin - Trainer Reports**
1. In Admin Panel, click **"Trainer Reports"** tab
2. View individual trainer statistics:
   - Total students per trainer
   - Total groups per trainer
   - Attendance records per trainer
   - Last sync time

#### **10.3 Export Reports**

##### **Export from Combined Input:**
1. In Combined Input page
2. Click **"Export Simplified Report"** for basic report
3. Click **"Export Full Report"** for detailed report
4. Excel file will download automatically

##### **Export from Admin Report:**
1. In Grand Report tab
2. Click **"Export Report"** button
3. Excel file with comprehensive data will download

##### **Export Formats:**
- **Simplified Report**: Student Name, Year, Unit, Group, Week, Score, Average Score
- **Full Report**: All student data + attendance + detailed assessments

---

## 📤 **Excel Import/Export**

### **Step 11: Excel Operations**

#### **11.1 Export Students to Excel**
1. Navigate to **Students** page
2. Use filters to select specific students (year/group)
3. (Note: Direct export button may need to be added - current implementation supports import)

#### **11.2 Export Template**
1. In Students page, click **"Download Template"**
2. Template includes:
   - Example data
   - Instructions sheet
   - Required/optional field information

#### **11.3 Import Best Practices**
- **Name Format**: Use consistent capitalization
- **Group Format**: Use "Group1", "Group2", etc. (not "group 1" or "Group 1")
- **Year Format**: Use numbers only (1-6), not text
- **Avoid Duplicates**: Check existing students before importing
- **Validate Data**: Ensure all required fields are filled

---

## 🔄 **Data Synchronization**

### **Step 12: Sync Data**

#### **12.1 View Sync Status**
1. Navigate to **"Sync"** page
2. View connection status:
   - **Connected** (Green) - Online
   - **Offline** (Red) - No internet connection

#### **12.2 View Unsynced Data**
- View counts of unsynced records:
  - Students
  - Groups
  - Attendance records
  - Assessment records

#### **12.3 Manual Sync**
1. Ensure you're connected to internet
2. Click **"Sync Now"** button
3. Wait for sync to complete
4. View sync status update

#### **12.4 Automatic Sync**
- Data automatically syncs when:
  - Internet connection is restored
  - New records are created
- Current implementation uses localStorage (offline-first)

---

## 🔐 **User Management (Admin Only)**

### **Step 13: Manage Users**

#### **13.1 Create New User**
1. Navigate to **Admin Panel** → **User Management**
2. Click **"Add User"** button
3. Fill form:
   - Username (unique)
   - Email (unique)
   - Role (Admin or Trainer)
   - Password (required for new users)
   - Assigned Groups (multiple selection)
   - Assigned Years (multiple selection)
4. Click **"Add User"**

#### **13.2 Edit User**
1. Find user in the table
2. Click **Edit icon** (pencil)
3. Modify information
4. Leave password empty to keep current password
5. Enter new password to change it
6. Click **"Update User"**

#### **13.3 Delete User**
1. Find user in the table
2. Click **Delete icon** (trash)
3. Confirm deletion
4. (Note: Admin user cannot be deleted)

---

## 📋 **Common Workflows**

### **Workflow 1: First-Time Setup (Admin)**
1. Login as admin
2. Go to Admin Panel → Group Management
3. Click "Ensure All Groups (1-30)"
4. Go to User Management
5. Create trainer accounts with assigned groups/years
6. Go to Students page
7. Import students via Excel or add manually
8. Inform trainers of their login credentials

### **Workflow 2: Daily Attendance (Trainer)**
1. Login as trainer
2. Go to "Input" (Combined Input) page
3. Select today's date
4. Select Year and Group filters
5. Click "Refresh" to load students
6. Mark attendance (Present/Late/Absent) for each student
7. Click "Save All Data"

### **Workflow 3: Assessment Day (Trainer)**
1. Login as trainer
2. Go to "Input" (Combined Input) page
3. Select date and filters
4. Set Assessment Details:
   - Name: "Week 1 Quiz"
   - Type: Quiz
   - Max Score: 100
   - Week: 1
5. Mark attendance for each student
6. Enter scores in Score column
7. Click "Save All Data"
8. Repeat for next assessment (form clears automatically)

### **Workflow 4: Weekly Report (Trainer)**
1. Login as trainer
2. Go to Dashboard
3. View weekly statistics
4. Go to "Input" page
5. Export reports if needed:
   - Click "Export Simplified Report" for quick overview
   - Click "Export Full Report" for detailed analysis

### **Workflow 5: Bulk Student Import (Admin)**
1. Login as admin
2. Prepare Excel file with student data
3. Go to Students page
4. Click "Download Template" to check format
5. Click "Import Excel"
6. Select your Excel file
7. Review import results
8. Fix any errors in Excel if needed
9. Re-import if necessary

### **Workflow 6: Monthly Admin Review**
1. Login as admin
2. Go to Admin Panel → Grand Report
3. Select Year or Group to analyze
4. Click "Generate Report"
5. Review statistics and student performance
6. Click "Export Report" for documentation
7. Check Trainer Reports tab for trainer activity

---

## 🛠️ **Troubleshooting**

### **Problem: Can't Login**
**Solutions:**
- Check username and password (case-sensitive)
- Try default accounts: admin/admin123
- Clear browser localStorage:
  ```javascript
  localStorage.clear();
  location.reload();
  ```

### **Problem: Students Not Showing**
**Solutions:**
- Check filters (Year, Group, Unit)
- Verify trainer's assigned groups/years (Admin Panel)
- Click "Refresh" button
- Check if students exist in database

### **Problem: Excel Import Fails**
**Solutions:**
- Check file format (.xlsx or .xls)
- Verify required columns (Name, Year, Group)
- Check Group format (Group1-Group30)
- Review error messages in import results
- Ensure Year is number (1-6), not text
- Check for duplicate student names

### **Problem: Data Not Saving**
**Solutions:**
- Check browser console for errors (F12)
- Ensure all required fields are filled
- Verify date is selected
- Try saving smaller batches
- Clear browser cache and reload

### **Problem: Can't See Groups**
**Solutions:**
- Go to Admin Panel → Group Management
- Click "Ensure All Groups (1-30)"
- Refresh the page
- Check if trainer is assigned to groups

### **Problem: Performance Issues**
**Solutions:**
- Clear browser cache (Ctrl+Shift+Delete)
- Close unnecessary browser tabs
- Use filters to reduce data displayed
- Clear localStorage if data is corrupted:
  ```javascript
  localStorage.removeItem('students');
  localStorage.removeItem('groups');
  localStorage.removeItem('attendance');
  localStorage.removeItem('assessments');
  location.reload();
  ```

### **Problem: Export Not Working**
**Solutions:**
- Check browser pop-up blocker
- Allow downloads in browser settings
- Check available disk space
- Try different browser
- Verify file extension permissions

---

## 💡 **Tips & Best Practices**

### **General Tips:**
1. **Regular Backups**: Export data regularly (especially before major operations)
2. **Use Filters**: Always use filters to work with specific subsets of data
3. **Batch Operations**: Use Excel import for bulk student addition
4. **Consistent Naming**: Use consistent naming conventions for assessments
5. **Date Selection**: Always verify date before marking attendance

### **Data Entry Tips:**
1. **Combined Input**: Use Combined Input page for efficiency (attendance + scores)
2. **Excel Template**: Always download template before creating import file
3. **Validation**: Review import errors before fixing Excel file
4. **Save Often**: Click "Save All Data" after each batch

### **Security Tips:**
1. **Change Passwords**: Change default passwords after first login
2. **User Permissions**: Assign specific groups/years to trainers
3. **Regular Audits**: Review user accounts periodically (Admin)
4. **Data Export**: Export sensitive data regularly for backup

### **Performance Tips:**
1. **Filter Data**: Use filters instead of viewing all data
2. **Clear Old Data**: Archive old records periodically
3. **Browser Cache**: Clear cache if app becomes slow
4. **Close Tabs**: Close unnecessary browser tabs

---

## 📞 **Quick Reference**

### **Keyboard Shortcuts:**
- **F5**: Refresh page
- **F12**: Open developer console
- **Ctrl+Shift+R**: Hard refresh (clear cache)

### **Important URLs:**
- **Development**: http://localhost:3000
- **Production**: Depends on deployment

### **Default Credentials:**
- **Admin**: admin / admin123
- **Trainers**: trainer1-3 / trainer123

### **File Locations:**
- **Student Template**: Download from Students page
- **Exported Reports**: Browser's default download folder
- **Build Folder**: `/build` directory

---

## ✅ **Checklist: First-Time Setup**

- [ ] Application is running (npm start or build served)
- [ ] Login with admin credentials successful
- [ ] All groups created (Group1-Group30)
- [ ] Trainer accounts created with assigned groups/years
- [ ] Students imported or added manually
- [ ] Trainer accounts tested
- [ ] Filters working correctly
- [ ] Excel import/export tested
- [ ] Reports generating correctly

---

**Last Updated**: December 2024  
**Version**: 1.0  
**For Support**: Check troubleshooting section or review code documentation





