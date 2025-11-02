# Troubleshooting JavaScript Syntax Error

## Quick Fix Steps

### 1. Clear Browser Cache
- Press `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac) to hard refresh
- Or open Developer Tools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"

### 2. Check Browser Console
- Open Developer Tools (F12)
- Go to Console tab
- Look for the exact line number where the syntax error occurs
- The error should show something like: `SyntaxError: unexpected token: identifier at line X`

### 3. Clear localStorage (if needed)
If the error persists, run this in the browser console:
```javascript
localStorage.clear();
location.reload();
```

### 4. Check for Browser Extensions
- Try opening the app in an incognito/private window
- Disable browser extensions temporarily

## Debug Excel Import Issue

### Check Current Students
Run this in the browser console to see existing students:
```javascript
const students = JSON.parse(localStorage.getItem('students') || '[]');
const groups = JSON.parse(localStorage.getItem('groups') || '[]');
const groupMap = new Map(groups.map(g => [g.id, g.name]));

console.log('Current students:', students.length);
students.forEach((student, i) => {
  const groupName = groupMap.get(student.groupId) || student.groupId;
  console.log(`${i+1}. ${student.name} - Year ${student.year}, ${groupName}`);
});
```

### Clear All Students (if needed)
```javascript
localStorage.removeItem('students');
location.reload();
```

## Common Excel Import Issues

1. **Group Format**: Use "Group1", "Group2", etc. (not "group-1")
2. **Year Format**: Use numbers 1-6 (not text)
3. **Name Format**: Avoid extra spaces, use consistent capitalization
4. **File Format**: Use .xlsx or .xls files

## If Error Persists

The syntax error might be from:
- Browser cache issues
- Corrupted localStorage data
- Browser extension conflicts
- Network issues

Try the hard refresh first, then clear localStorage if needed.







