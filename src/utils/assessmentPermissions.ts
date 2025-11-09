/**
 * Assessment Permission Utility
 * Manages permissions for edit, delete, and export operations on assessments
 */

import { AssessmentRecord, User } from '../types';

export const assessmentPermissions = {
  /**
   * Can user edit this assessment?
   */
  canEdit: (assessment: AssessmentRecord, user: User): boolean => {
    // Admin can ALWAYS edit (super user privilege)
    if (user.role === 'admin') {
      return true;
    }

    // Trainer can only edit their own assessments
    if (user.role === 'trainer') {
      // Must be the creator
      if (assessment.trainerId !== user.id) {
        return false;
      }

      // LOCKED if exported to admin
      if (assessment.exportedToAdmin === true) {
        return false; // ❌ Cannot edit after export
      }

      return true; // ✅ Can edit (not yet exported)
    }

    return false;
  },

  /**
   * Can user delete this assessment?
   */
  canDelete: (assessment: AssessmentRecord, user: User): boolean => {
    // Admin can always delete
    if (user.role === 'admin') {
      return true;
    }

    // Trainer can only delete if NOT exported
    if (user.role === 'trainer') {
      return (
        assessment.trainerId === user.id && assessment.exportedToAdmin !== true
      );
    }

    return false;
  },

  /**
   * Can user export this assessment to admin?
   */
  canExportToAdmin: (assessment: AssessmentRecord, user: User): boolean => {
    // Only trainers can export
    if (user.role !== 'trainer') {
      return false;
    }

    // Must be creator and not yet exported
    return assessment.trainerId === user.id && assessment.exportedToAdmin !== true;
  },

  /**
   * Can admin unlock this assessment for trainer to edit?
   */
  canUnlock: (assessment: AssessmentRecord, user: User): boolean => {
    // Only admins can unlock
    if (user.role !== 'admin') {
      return false;
    }

    // Must be exported to unlock
    return assessment.exportedToAdmin === true;
  },

  /**
   * Get user-friendly status message
   */
  getStatusMessage: (assessment: AssessmentRecord): string => {
    if (assessment.exportedToAdmin === true) {
      if (assessment.reviewedByAdmin === true) {
        return '✅ Reviewed by Admin';
      }
      return '📤 Exported to Admin (Locked)';
    }
    return '📝 Draft (Editable)';
  },

  /**
   * Get status chip color
   */
  getStatusColor: (
    assessment: AssessmentRecord
  ): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
    if (assessment.exportedToAdmin === true) {
      if (assessment.reviewedByAdmin === true) {
        return 'success'; // Green for reviewed
      }
      return 'primary'; // Blue for exported
    }
    return 'warning'; // Orange for draft
  },

  /**
   * Get detailed restriction message explaining why action not allowed
   */
  getRestrictionMessage: (assessment: AssessmentRecord): string => {
    if (assessment.exportedToAdmin === true && assessment.exportedAt) {
      const exportDate = new Date(assessment.exportedAt).toLocaleString();
      return `This assessment was exported to admin on ${exportDate} and can no longer be edited. Contact your administrator if changes are needed.`;
    }
    return '';
  },

  /**
   * Get export warning message
   */
  getExportWarningMessage: (): string => {
    return (
      'Once exported, you will NOT be able to edit or delete these assessments. ' +
      'Please ensure all scores are correct before exporting.'
    );
  },

  /**
   * Check if assessment is editable by current user
   */
  isEditable: (assessment: AssessmentRecord, user: User): boolean => {
    return assessmentPermissions.canEdit(assessment, user);
  },

  /**
   * Check if assessment is locked (exported)
   */
  isLocked: (assessment: AssessmentRecord): boolean => {
    return assessment.exportedToAdmin === true;
  },

  /**
   * Get icon for assessment status
   */
  getStatusIcon: (assessment: AssessmentRecord): string => {
    if (assessment.exportedToAdmin === true) {
      if (assessment.reviewedByAdmin === true) {
        return '✅'; // Checkmark for reviewed
      }
      return '🔒'; // Lock for exported
    }
    return '✏️'; // Pencil for editable
  },
};
