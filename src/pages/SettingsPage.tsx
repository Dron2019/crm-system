import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  Alert,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useAuthStore } from '@/stores/authStore';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

export default function SettingsPage() {
  const { user, fetchUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [timezone, setTimezone] = useState(user?.timezone ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const profileMutation = useMutation({
    mutationFn: () => api.put('/user/profile', { name, email, timezone }),
    onSuccess: () => {
      fetchUser();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      api.put('/user/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    },
  });

  return (
    <Box maxWidth={680}>
      <Typography variant="h5" fontWeight={700} mb={3}>Settings</Typography>

      {/* Profile */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={2}>Profile</Typography>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 22 }}>
              {user?.name?.charAt(0) ?? '?'}
            </Avatar>
            <Box>
              <Typography fontWeight={600}>{user?.name}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
            </Box>
          </Box>

          {profileSuccess && <Alert severity="success" sx={{ mb: 2 }}>Profile updated.</Alert>}
          {profileMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Failed to update profile.</Alert>}

          <Box display="flex" flexDirection="column" gap={2}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth type="email" />
            <TextField label="Timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} fullWidth placeholder="UTC" />
          </Box>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            sx={{ mt: 2 }}
            onClick={() => profileMutation.mutate()}
            disabled={profileMutation.isPending}
          >
            {profileMutation.isPending ? 'Saving…' : 'Save Profile'}
          </Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={2}>Change Password</Typography>

          {passwordSuccess && <Alert severity="success" sx={{ mb: 2 }}>Password changed.</Alert>}
          {passwordMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Failed to change password. Check your current password.</Alert>}

          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              fullWidth
            />
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
            />
            <TextField
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
            />
          </Box>
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => passwordMutation.mutate()}
            disabled={passwordMutation.isPending || !currentPassword || !newPassword || newPassword !== confirmPassword}
          >
            {passwordMutation.isPending ? 'Updating…' : 'Change Password'}
          </Button>
        </CardContent>
      </Card>

      {/* Team info */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={2}>Team</Typography>
          <Typography variant="body2" color="text.secondary">
            Current team: <strong>{user?.current_team?.name ?? 'None'}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Plan: {user?.current_team?.billing_plan ?? 'Free'}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
