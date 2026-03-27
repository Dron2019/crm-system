import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export default function SecuritySettingsPage() {
  const queryClient = useQueryClient();
  const [setupOpen, setSetupOpen] = useState(false);
  const [totpCode, setTotpCode] = useState('');

  const { data: mfaStatus } = useQuery<{ enabled: boolean; qr_svg?: string; secret?: string }>({
    queryKey: ['mfa-status'],
    queryFn: async () => {
      const { data } = await api.get('/auth/mfa/status');
      return data.data;
    },
  });

  const enableMutation = useMutation({
    mutationFn: () => api.post('/auth/mfa/enable'),
    onSuccess: (res) => {
      queryClient.setQueryData(['mfa-status'], res.data.data);
      setSetupOpen(true);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => api.post('/auth/mfa/confirm', { code: totpCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-status'] });
      setSetupOpen(false);
      setTotpCode('');
    },
  });

  const disableMutation = useMutation({
    mutationFn: () => api.delete('/auth/mfa/disable'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mfa-status'] }),
  });

  return (
    <Box maxWidth={600}>
      <Typography variant="h6" fontWeight={600} mb={2}>
        Security
      </Typography>

      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <SecurityIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={600}>
              Two-Factor Authentication
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" mb={2}>
            Add an extra layer of security to your account by requiring a verification code from your
            authenticator app when signing in.
          </Typography>

          {mfaStatus?.enabled ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Two-factor authentication is enabled.
              </Alert>
              <Button
                variant="outlined"
                color="error"
                onClick={() => disableMutation.mutate()}
                disabled={disableMutation.isPending}
              >
                Disable 2FA
              </Button>
            </Box>
          ) : (
            <Button
              variant="contained"
              onClick={() => enableMutation.mutate()}
              disabled={enableMutation.isPending}
            >
              Enable 2FA
            </Button>
          )}
        </CardContent>
      </Card>

      {/* MFA Setup Dialog */}
      <Dialog open={setupOpen} onClose={() => setSetupOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then
            enter the 6-digit code below to verify.
          </Typography>

          {mfaStatus?.qr_svg && (
            <Box display="flex" justifyContent="center" mb={2} dangerouslySetInnerHTML={{ __html: mfaStatus.qr_svg }} />
          )}

          {mfaStatus?.secret && (
            <Typography variant="body2" fontFamily="monospace" textAlign="center" mb={2}>
              {mfaStatus.secret}
            </Typography>
          )}

          {confirmMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>Invalid code. Please try again.</Alert>
          )}

          <TextField
            label="Verification Code"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            fullWidth
            placeholder="000000"
            inputProps={{ maxLength: 6, inputMode: 'numeric' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSetupOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => confirmMutation.mutate()}
            disabled={confirmMutation.isPending || totpCode.length !== 6}
          >
            Verify & Enable
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
