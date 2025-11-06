# 👥 Roles & Permissions Analysis

**Date:** 2025-11-06
**Application:** Skill Lab Web - Student Attendance & Assessment System

---

## 📋 **Table of Contents**
1. [Role Overview](#role-overview)
2. [Admin Authorities](#admin-authorities)
3. [Trainer Authorities](#trainer-authorities)
4. [Permission Comparison](#permission-comparison)
5. [Data Access Control](#data-access-control)
6. [Technical Implementation](#technical-implementation)

---

## 🎯 **Role Overview**

The application has **2 user roles**:

| Role | Type | Purpose |
|------|------|---------|
| **Admin** | Super User | Full system access, user management, all data |
| **Trainer** | Regular User | Limited to assigned groups/years, no admin functions |

---

## 👑 **Admin Authorities**

### **Full Access Rights:**

#### 1. **User Management** (Admin Panel)
- ✅ **Create new users** (admin or trainer)
- ✅ **Edit existing users** (username, email, role, assigned groups/years)
- ✅ **Delete users** (except the main admin account)
- ✅ **View all users** in the system
- ✅ **Assign groups to trainers** (which groups they can manage)
- ✅ **Assign years to trainers** (which years they can access)
- ✅ **Change user passwords** (admin can reset trainer passwords)
- ✅ **Activate/deactivate users**

**Page:** [Admin.tsx](src/pages/Admin.tsx#L80) → User Management Tab

---

#### 2. **Group Management** (Admin Panel)
- ✅ **Create new groups**
- ✅ **Edit group details** (name, description)
- ✅ **Delete groups** (with cascading delete of students/data)
- ✅ **View all groups** (30 groups system-wide)
- ✅ **Manage group assignments** to trainers

**Page:** [Admin.tsx](src/pages/Admin.tsx#L80) → Groups Tab

---

#### 3. **Student Management**
- ✅ **View ALL students** (from all groups and years)
- ✅ **Add new students** (to any group/year)
- ✅ **Edit any student** (from any group)
- ✅ **Delete any student** (from any group)
- ✅ **Import students** via Excel (bulk operations)
- ✅ **Export students** to Excel (all students)
- ✅ **No group restrictions** (can see everyone)

**Page:** [Students.tsx](src/pages/Students.tsx#L86)

**Code:**
```typescript
// Admin sees ALL groups
const accessibleGroups = user?.role === 'admin' ? groups :
  groups.filter(group => user?.assignedGroups?.includes(group.id));
```

---

#### 4. **Attendance Management**
- ✅ **View ALL attendance records** (from all groups/years)
- ✅ **Mark attendance** for any student
- ✅ **Edit any attendance record**
- ✅ **Delete any attendance record**
- ✅ **Export attendance data** (all records)
- ✅ **No date restrictions**

**Pages:**
- [Attendance.tsx](src/pages/Attendance.tsx#L54)
- [AttendanceAssessment.tsx](src/pages/AttendanceAssessment.tsx#L129)
- [CombinedInput.tsx](src/pages/CombinedInput.tsx#L124)

---

#### 5. **Assessment Management**
- ✅ **View ALL assessments** (from all groups/years)
- ✅ **Create assessments** for any student
- ✅ **Edit any assessment**
- ✅ **Delete any assessment**
- ✅ **Export assessment data** (all records)
- ✅ **Access to all assessment types**

**Pages:**
- [Assessments.tsx](src/pages/Assessments.tsx#L79)
- [AttendanceAssessment.tsx](src/pages/AttendanceAssessment.tsx#L129)

---

#### 6. **Reports & Analytics**
- ✅ **Admin Reports** (system-wide stats)
- ✅ **Trainer Reports** (all trainer activity)
- ✅ **Export all data** to Excel
- ✅ **View system metrics** (total students, attendance, assessments)
- ✅ **Trainer performance** tracking

**Page:** [AdminReport.tsx](src/pages/AdminReport.tsx)

---

#### 7. **Navigation & UI**
- ✅ **Admin Panel** menu item visible
- ✅ **All menu items** accessible
- ✅ **Dashboard** with full statistics
- ✅ **Sync** page access

**Code:** [Layout.tsx:77](src/components/Layout.tsx#L77)
```typescript
// Admin-only menu item
if (user?.role === USER_ROLES.ADMIN) {
  menuItems.push(
    { text: 'Admin Panel', icon: <AdminPanelSettings />, path: '/admin' }
  );
}
```

---

## 👨‍🏫 **Trainer Authorities**

### **Limited Access Rights:**

#### 1. **User Management**
- ❌ **Cannot access Admin Panel**
- ❌ **Cannot create users**
- ❌ **Cannot edit users**
- ❌ **Cannot delete users**
- ❌ **Cannot view other users**
- ❌ **Cannot manage groups**

**Result:** No user/group management capabilities

---

#### 2. **Student Management** (Restricted)
- ✅ **View students** in their **assigned groups only**
- ✅ **View students** in their **assigned years only**
- ✅ **Add students** (but only to assigned groups/years)
- ✅ **Edit students** (but only in assigned groups)
- ✅ **Delete students** (but only in assigned groups)
- ✅ **Import students** via Excel (to assigned groups)
- ✅ **Export students** to Excel (only assigned groups)

**Page:** [Students.tsx](src/pages/Students.tsx#L86)

**Code:**
```typescript
// Trainers see only ASSIGNED groups
if (user?.role === 'trainer') {
  // Filter students by assigned groups
  if (user?.assignedGroups && !user.assignedGroups.includes(student.groupId)) {
    return false;
  }
  // Filter students by assigned years
  if (user?.assignedYears && !user.assignedYears.includes(student.year)) {
    return false;
  }
}
```

**Example:**
- Trainer1 is assigned: `group-1, group-2, group-3` and `years 1, 2`
- Can only see/edit students in those 3 groups from years 1-2
- Cannot see students from group-4 or year 3

---

#### 3. **Attendance Management** (Restricted)
- ✅ **Mark attendance** (assigned groups/years only)
- ✅ **View attendance** (assigned groups/years only)
- ✅ **Edit attendance** (assigned groups/years only)
- ❌ **Cannot delete attendance** (view-only for reports)
- ✅ **Export attendance** (only for assigned groups)

**Pages:**
- [Attendance.tsx](src/pages/Attendance.tsx#L54)
- [AttendanceAssessment.tsx](src/pages/AttendanceAssessment.tsx#L129)
- [CombinedInput.tsx](src/pages/CombinedInput.tsx#L124)

**Code:**
```typescript
// Filter attendance by trainer assignments
if (user?.assignedGroups && !user.assignedGroups.includes(record.groupId)) {
  return false;
}
if (user?.assignedYears && !user.assignedYears.includes(record.year)) {
  return false;
}
```

---

#### 4. **Assessment Management** (Restricted)
- ✅ **Create assessments** (assigned groups/years only)
- ✅ **View assessments** (assigned groups/years only)
- ✅ **Edit assessments** (assigned groups/years only)
- ❌ **Cannot view other trainers' assessments** (outside assigned groups)
- ✅ **Export assessments** (only for assigned groups)

**Pages:**
- [Assessments.tsx](src/pages/Assessments.tsx#L79)
- [AttendanceAssessment.tsx](src/pages/AttendanceAssessment.tsx#L236)

---

#### 5. **Reports & Analytics** (Limited)
- ✅ **Trainer Reports** (own performance only)
- ✅ **Export own data** to Excel
- ❌ **Cannot view Admin Reports**
- ❌ **Cannot view other trainer reports**
- ❌ **Cannot view system-wide stats**

**Page:** [TrainerReports.tsx](src/pages/TrainerReports.tsx)

---

#### 6. **Navigation & UI**
- ❌ **Admin Panel** not visible in menu
- ✅ **Dashboard** with limited stats (own data only)
- ✅ **Students** page (filtered)
- ✅ **Input Data** page (filtered)
- ✅ **Sync** page access

**Result:** Cleaner UI focused on trainer tasks

---

## ⚖️ **Permission Comparison**

| Feature | Admin | Trainer | Notes |
|---------|-------|---------|-------|
| **User Management** | ✅ Full | ❌ None | Only admins manage users |
| **Group Management** | ✅ Full | ❌ None | Only admins manage groups |
| **View All Students** | ✅ Yes | ❌ No | Trainers see assigned only |
| **Edit Any Student** | ✅ Yes | ❌ No | Trainers edit assigned only |
| **Delete Students** | ✅ Yes | ❌ No | Trainers delete assigned only |
| **View All Attendance** | ✅ Yes | ❌ No | Trainers see assigned only |
| **View All Assessments** | ✅ Yes | ❌ No | Trainers see assigned only |
| **Admin Panel Access** | ✅ Yes | ❌ No | Admin-only route |
| **System Reports** | ✅ Yes | ❌ No | Admin sees all, trainers see own |
| **Export All Data** | ✅ Yes | ❌ No | Trainers export assigned only |
| **Change Passwords** | ✅ All users | ✅ Own only | Trainers can only change own |
| **Delete Data** | ✅ Yes | ❌ Limited | Admin can delete anything |

---

## 🔒 **Data Access Control**

### **How Trainer Restrictions Work:**

#### **1. Group-Based Filtering**
Every trainer has `assignedGroups: string[]`

**Example:**
```typescript
// Trainer1 configuration
{
  username: 'trainer1',
  assignedGroups: ['group-1', 'group-2', 'group-3'],
  assignedYears: [1, 2]
}
```

**Effect:**
- Can only access students in groups 1, 2, 3
- Cannot see students in groups 4, 5, 6, etc.

---

#### **2. Year-Based Filtering**
Every trainer has `assignedYears: number[]`

**Example:**
```typescript
// Trainer2 configuration
{
  username: 'trainer2',
  assignedGroups: ['group-4', 'group-5', 'group-6'],
  assignedYears: [2, 3]  // Only years 2 and 3
}
```

**Effect:**
- Can only access students in years 2 and 3
- Cannot see year 1, 4, 5, or 6 students

---

#### **3. Combined Filtering**
Both filters apply together:

```typescript
// Student must match BOTH conditions
if (user?.role === 'trainer') {
  // Check group assignment
  if (user?.assignedGroups && !user.assignedGroups.includes(student.groupId)) {
    return false; // Hide student
  }
  // Check year assignment
  if (user?.assignedYears && !user.assignedYears.includes(student.year)) {
    return false; // Hide student
  }
}
```

**Example Scenario:**
- Trainer is assigned: Groups [1,2,3] and Years [1,2]
- Student in Group 2, Year 3 → **NOT visible** (year not assigned)
- Student in Group 4, Year 1 → **NOT visible** (group not assigned)
- Student in Group 2, Year 1 → **VISIBLE** ✅ (both match)

---

## 🛠️ **Technical Implementation**

### **1. Role Definition** ([constants/roles.ts](src/constants/roles.ts))

```typescript
export const USER_ROLES = {
  ADMIN: 'admin',
  TRAINER: 'trainer',
} as const;

export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: {
    canManageUsers: true,
    canManageGroups: true,
    canViewAllData: true,
    canExportData: true,
    canDeleteData: true,
    canAccessAdminPanel: true,
  },
  [USER_ROLES.TRAINER]: {
    canManageUsers: false,
    canManageGroups: false,
    canViewAllData: false,
    canExportData: true,      // Can export own data
    canDeleteData: false,
    canAccessAdminPanel: false,
  },
};
```

---

### **2. Route Protection** ([App.tsx](src/App.tsx#L80))

```typescript
// Admin-only route guard
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== USER_ROLES.ADMIN) {
    return <Navigate to="/dashboard" replace />; // Redirect trainers
  }

  return <>{children}</>;
};
```

**Effect:** Trainers trying to access `/admin` are redirected to `/dashboard`

---

### **3. UI Conditional Rendering** ([Layout.tsx](src/components/Layout.tsx#L77))

```typescript
// Show Admin Panel menu item only to admins
if (user?.role === USER_ROLES.ADMIN) {
  menuItems.push(
    { text: 'Admin Panel', icon: <AdminPanelSettings />, path: '/admin' }
  );
}
```

**Effect:** Trainers don't see the Admin Panel link

---

### **4. Data Filtering Examples**

#### **Students Page** ([Students.tsx:86-90](src/pages/Students.tsx#L86))
```typescript
const filteredStudents = useMemo(() => {
  return students.filter(student => {
    if (user?.role === 'trainer') {
      // Filter by assigned groups
      if (user?.assignedGroups && !user.assignedGroups.includes(student.groupId)) {
        return false;
      }
      // Filter by assigned years
      if (user?.assignedYears && !user.assignedYears.includes(student.year)) {
        return false;
      }
    }
    // Admins see all
    return true;
  });
}, [students, user]);
```

#### **Accessible Groups** ([Students.tsx:100-101](src/pages/Students.tsx#L100))
```typescript
const accessibleGroups = user?.role === 'admin' ? groups :
  groups.filter(group => user?.assignedGroups?.includes(group.id));
```

---

## 📊 **Default User Assignments**

### **Production Users** ([authService.ts:9-52](src/services/authService.ts#L9))

| Username | Role | Groups | Years |
|----------|------|--------|-------|
| **admin** | Admin | All | All (1-6) |
| **trainer1** | Trainer | group-1, group-2, group-3 | 1, 2 |
| **trainer2** | Trainer | group-4, group-5, group-6 | 2, 3 |
| **trainer3** | Trainer | group-7, group-8, group-9 | 3, 4 |

**Password (all):** `admin123` for admin, `trainer123` for trainers (hashed with bcrypt)

---

## 🎯 **Key Takeaways**

### **For Admins:**
1. ✅ Complete control over the entire system
2. ✅ Can manage users and assign trainers to groups/years
3. ✅ See all data across all groups and years
4. ✅ No restrictions on any operations

### **For Trainers:**
1. ⚠️ Limited to assigned groups and years only
2. ⚠️ Cannot manage other users or groups
3. ⚠️ Cannot see data outside their assignments
4. ✅ Full control within their assigned scope
5. ✅ Can export their own data

### **Security:**
- ✅ Role-based access control (RBAC) implemented
- ✅ Route protection prevents unauthorized access
- ✅ Data filtering ensures privacy between trainers
- ✅ UI adapts based on user role
- ✅ No way for trainers to escalate privileges

---

## 🔍 **Where Permissions Are Enforced**

| Location | Type | Description |
|----------|------|-------------|
| [App.tsx:80-96](src/App.tsx#L80) | Route Guard | AdminRoute prevents non-admins from accessing /admin |
| [Layout.tsx:77](src/components/Layout.tsx#L77) | UI | Admin Panel menu item visibility |
| [Students.tsx:86-90](src/pages/Students.tsx#L86) | Data Filter | Student list filtered by trainer assignments |
| [Students.tsx:100](src/pages/Students.tsx#L100) | UI | Group dropdown filtered by trainer assignments |
| [Attendance.tsx:54-58](src/pages/Attendance.tsx#L54) | Data Filter | Attendance filtered by trainer assignments |
| [Assessments.tsx:79-83](src/pages/Assessments.tsx#L79) | Data Filter | Assessments filtered by trainer assignments |
| [Admin.tsx:112](src/pages/Admin.tsx#L112) | Permission | Only admins can load user management |
| [authService.ts:524](src/services/authService.ts#L524) | Business Logic | Prevent deletion of main admin account |

---

**Document created:** 2025-11-06
**Last updated:** 2025-11-06
**Version:** 1.0
