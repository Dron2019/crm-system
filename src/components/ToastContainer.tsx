import { Snackbar, Alert, Stack } from '@mui/material';
import { useToastStore } from '@/stores/toastStore';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <Stack spacing={1} sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000 }}>
      {toasts.map((toast) => (
        <Snackbar key={toast.id} open anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} sx={{ position: 'static' }}>
          <Alert
            severity={toast.severity}
            variant="filled"
            onClose={() => removeToast(toast.id)}
            sx={{ minWidth: 280 }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  );
}
