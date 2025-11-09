# Export to Admin Feature - Implementation Guide

## ✅ **COMPLETED: Backend Implementation**

The complete backend for the "Export to Admin" workflow (Option 1B) has been implemented and committed (commit `0d8ee48`).

### What's Done:

1. **Data Model** ✅
   - Updated `AssessmentRecord` type with export fields
   - All fields are optional to support migration

2. **Permission System** ✅
   - `src/utils/assessmentPermissions.ts` - Complete permission utility
   - Trainers can only edit drafts
   - Admins can edit/unlock anything

3. **Database Layer** ✅
   - Export functions in `DatabaseService`
   - Context integration in `DatabaseContext`
   - Auto-sync to Firebase

4. **Migration Script** ✅
   - `public/migrate-assessments-export.js`
   - Run once in browser console after deployment

5. **Handler Functions** ✅ (PARTIALLY ADDED)
   - Export handlers added to Assessments.tsx
   - Edit handlers added
   - Delete handlers added

---

## 🚧 **REMAINING WORK: UI Updates**

### Step 1: Update Saved Scores Table

**Location**: `src/pages/Assessments.tsx` line ~450

**Replace the existing saved scores table with**:

```tsx
{showSavedScores && selectedGroup !== 'all' && (
  <Card sx={{ mb: 3 }}>
    <CardContent>
      {/* Group assessments by name+date */}
      {(() => {
        // Group logic
        const assessmentGroups = savedAssessments.reduce((acc, assessment) => {
          const key = `${assessment.assessmentName}-${assessment.date}-${assessment.groupId}`;
          if (!acc[key]) {
            acc[key] = {
              name: assessment.assessmentName,
              type: assessment.assessmentType,
              date: assessment.date,
              maxScore: assessment.maxScore,
              assessments: [],
              allExported: true
            };
          }
          acc[key].assessments.push(assessment);
          if (assessment.exportedToAdmin !== true) {
            acc[key].allExported = false;
          }
          return acc;
        }, {} as Record<string, any>);

        return Object.entries(assessmentGroups).map(([key, group]) => {
          const draftCount = group.assessments.filter((a: AssessmentRecord) => a.exportedToAdmin !== true).length;
          const exportedCount = group.assessments.filter((a: AssessmentRecord) => a.exportedToAdmin === true).length;

          return (
            <Card key={key} sx={{ mb: 2, border: '1px solid #e0e0e0' }}>
              <CardContent>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6">
                      {group.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Chip
                        label={group.type}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        label={`${group.date}`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`Max: ${group.maxScore}`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`${group.assessments.length} students`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Box>

                  {/* Status & Actions */}
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {group.allExported ? (
                      <Chip
                        icon={<Lock />}
                        label="Exported to Admin"
                        color="primary"
                        variant="filled"
                      />
                    ) : (
                      <>
                        {draftCount > 0 && (
                          <Chip
                            icon={<Edit />}
                            label={`${draftCount} Draft`}
                            color="warning"
                            variant="outlined"
                          />
                        )}
                        {exportedCount > 0 && (
                          <Chip
                            icon={<Lock />}
                            label={`${exportedCount} Locked`}
                            color="default"
                            size="small"
                          />
                        )}
                        {user?.role === 'trainer' && draftCount > 0 && (
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            startIcon={<Send />}
                            onClick={() => handleExportClick(group.assessments)}
                          >
                            Export to Admin
                          </Button>
                        )}
                      </>
                    )}
                  </Box>
                </Box>

                {/* Student Scores Table */}
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Student</TableCell>
                        <TableCell align="center">Score</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {group.assessments.map((assessment: AssessmentRecord) => {
                        const canEdit = user && assessmentPermissions.canEdit(assessment, user);
                        const canDelete = user && assessmentPermissions.canDelete(assessment, user);
                        const statusIcon = assessmentPermissions.getStatusIcon(assessment);
                        const statusMessage = assessmentPermissions.getStatusMessage(assessment);

                        return (
                          <TableRow key={assessment.id}>
                            <TableCell>{getStudentName(assessment.studentId)}</TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">
                                {assessment.score}/{assessment.maxScore}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ({Math.round((assessment.score / assessment.maxScore) * 100)}%)
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={<span>{statusIcon}</span>}
                                label={statusMessage}
                                size="small"
                                color={assessmentPermissions.getStatusColor(assessment)}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                {canEdit ? (
                                  <>
                                    <Button
                                      size="small"
                                      startIcon={<Edit />}
                                      onClick={() => handleEditClick(assessment)}
                                    >
                                      Edit
                                    </Button>
                                    {canDelete && (
                                      <Button
                                        size="small"
                                        color="error"
                                        startIcon={<Delete />}
                                        onClick={() => handleDeleteClick(assessment)}
                                      >
                                        Delete
                                      </Button>
                                    )}
                                  </>
                                ) : (
                                  <Chip
                                    icon={<Lock />}
                                    label="Locked"
                                    size="small"
                                    disabled
                                  />
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          );
        });
      })()}
    </CardContent>
  </Card>
)}
```

### Step 2: Add Dialogs (Add before closing `</LocalizationProvider>`)

```tsx
{/* Export Confirmation Dialog */}
<Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="sm" fullWidth>
  <DialogTitle>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Warning color="warning" />
      Export to Admin
    </Box>
  </DialogTitle>
  <DialogContent>
    <Alert severity="warning" sx={{ mb: 2 }}>
      <strong>Important:</strong> Once exported, you will NOT be able to edit or delete these assessments.
    </Alert>

    <Typography variant="body1" gutterBottom>
      You are about to export <strong>{selectedForExport.length} assessment(s)</strong> to admin.
    </Typography>

    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
      After export, assessments will be locked. Contact your administrator if you need to make changes.
    </Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setExportDialogOpen(false)} disabled={exportLoading}>
      Cancel
    </Button>
    <Button
      variant="contained"
      color="primary"
      startIcon={<Send />}
      onClick={handleExportConfirm}
      disabled={exportLoading}
    >
      {exportLoading ? <CircularProgress size={24} /> : 'Confirm Export'}
    </Button>
  </DialogActions>
</Dialog>

{/* Edit Dialog */}
<Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
  <DialogTitle>Edit Assessment Score</DialogTitle>
  <DialogContent>
    {editingAssessment && (
      <>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Student: {getStudentName(editingAssessment.studentId)}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Assessment: {editingAssessment.assessmentName}
        </Typography>

        <TextField
          fullWidth
          label="Score"
          type="number"
          value={editScore}
          onChange={(e) => setEditScore(e.target.value)}
          inputProps={{ min: 0, max: editingAssessment.maxScore }}
          helperText={`Max score: ${editingAssessment.maxScore}`}
          sx={{ mt: 2 }}
          autoFocus
        />
      </>
    )}
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
    <Button variant="contained" onClick={handleEditSave}>
      Save
    </Button>
  </DialogActions>
</Dialog>

{/* Delete Confirmation Dialog */}
<Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
  <DialogTitle>Delete Assessment</DialogTitle>
  <DialogContent>
    {deletingAssessment && (
      <>
        <Alert severity="error" sx={{ mb: 2 }}>
          This action cannot be undone.
        </Alert>
        <Typography variant="body1">
          Are you sure you want to delete this assessment?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Student: {getStudentName(deletingAssessment.studentId)}<br />
          Assessment: {deletingAssessment.assessmentName}<br />
          Score: {deletingAssessment.score}/{deletingAssessment.maxScore}
        </Typography>
      </>
    )}
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
    <Button variant="contained" color="error" onClick={handleDeleteConfirm}>
      Delete
    </Button>
  </DialogActions>
</Dialog>
```

---

## 📦 **Deployment Steps**

### 1. Run Migration (ONE TIME ONLY)

After deploying, run this in browser console as admin:

```javascript
// Paste content from public/migrate-assessments-export.js
```

### 2. Build & Deploy

```bash
npm run build
git add -A
git commit -m "UI: Complete Export to Admin workflow"
git push
vercel --prod
```

### 3. Test Workflow

**As Trainer**:
1. Create assessments → All start as drafts (editable)
2. Edit scores freely
3. Click "Export to Admin" when ready
4. Confirm export
5. Verify assessments are now locked

**As Admin**:
1. View exported assessments
2. (Optional) Unlock if trainer needs changes

---

## 🎯 **Features Summary**

✅ **Trainers Can**:
- Create assessments (all start as drafts)
- Edit/delete draft assessments
- Export to admin when ready
- Cannot edit after export

✅ **Admins Can**:
- View all assessments
- Edit anything (even exported)
- Unlock assessments for trainers
- Delete anything

✅ **System Tracks**:
- Export status (draft vs exported)
- Who exported and when
- Edit count and history
- Last editor

---

## 📝 **Notes**

- All handler functions already added to Assessments.tsx
- Only UI replacement needed (saved scores table + dialogs)
- Build tested and working
- Migration script ready
- Backend fully functional

**Estimated time to complete UI**: 15-20 minutes of careful copy-paste

Let me know if you need help with any step!
