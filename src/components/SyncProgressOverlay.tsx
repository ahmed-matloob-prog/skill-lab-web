import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Paper,
} from '@mui/material';
import { CloudSync } from '@mui/icons-material';
import { SyncProgress } from '../contexts/DatabaseContext';

interface SyncProgressOverlayProps {
  syncProgress: SyncProgress;
  show: boolean;
}

/**
 * Overlay component showing sync progress during initial data load
 */
const SyncProgressOverlay: React.FC<SyncProgressOverlayProps> = ({
  syncProgress,
  show,
}) => {
  if (!show) return null;

  const progressPercent = (syncProgress.stepsCompleted / syncProgress.totalSteps) * 100;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        zIndex: 9999,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          borderRadius: 3,
          textAlign: 'center',
          maxWidth: 400,
          width: '90%',
        }}
      >
        <Box sx={{ mb: 3 }}>
          <CloudSync
            sx={{
              fontSize: 64,
              color: 'primary.main',
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.5 },
                '100%': { opacity: 1 },
              },
            }}
          />
        </Box>

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Syncing with Cloud
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, minHeight: 40 }}
        >
          {syncProgress.currentStep || 'Preparing...'}
        </Typography>

        <Box sx={{ width: '100%', mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
              },
            }}
          />
        </Box>

        <Typography variant="caption" color="text.secondary">
          Step {syncProgress.stepsCompleted} of {syncProgress.totalSteps}
        </Typography>

        <Typography
          variant="caption"
          display="block"
          color="text.secondary"
          sx={{ mt: 2, opacity: 0.7 }}
        >
          This may take a moment for large datasets...
        </Typography>
      </Paper>
    </Box>
  );
};

export default SyncProgressOverlay;
