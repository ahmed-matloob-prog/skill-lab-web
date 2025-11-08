import React from 'react';
import { Alert, Button, Snackbar } from '@mui/material';
import { Refresh } from '@mui/icons-material';

interface UpdateBannerProps {
  open: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

const UpdateBanner: React.FC<UpdateBannerProps> = ({ open, onUpdate, onDismiss }) => {
  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ top: { xs: 16, sm: 24 } }}
    >
      <Alert
        severity="info"
        variant="filled"
        icon={<Refresh />}
        action={
          <>
            <Button
              color="inherit"
              size="small"
              onClick={onUpdate}
              sx={{ fontWeight: 'bold' }}
            >
              Update Now
            </Button>
            <Button
              color="inherit"
              size="small"
              onClick={onDismiss}
              sx={{ ml: 1 }}
            >
              Later
            </Button>
          </>
        }
        sx={{
          width: '100%',
          maxWidth: 600,
          '& .MuiAlert-message': {
            fontSize: '1rem',
            fontWeight: 500
          }
        }}
      >
        A new version is available! Update now for the latest features and fixes.
      </Alert>
    </Snackbar>
  );
};

export default UpdateBanner;
