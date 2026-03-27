import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import api, { getCsrfCookie } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const acceptSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  });

type AcceptForm = z.infer<typeof acceptSchema>;

export default function AcceptInvitationPage() {
  const [error, setError] = useState('');
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptForm>({
    resolver: zodResolver(acceptSchema),
  });

  const onSubmit = async (data: AcceptForm) => {
    try {
      setError('');
      await getCsrfCookie();
      const response = await api.post(`/auth/invitation/${token}`, data);
      useAuthStore.setState({ user: response.data.data, isAuthenticated: true });
      navigate('/');
    } catch {
      setError('Unable to accept invitation. The link may have expired or already been used.');
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="background.default"
    >
      <Card sx={{ width: 400, maxWidth: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight={500} textAlign="center" mb={1} color="primary">
            CRM System
          </Typography>
          <Typography variant="body2" textAlign="center" color="text.secondary" mb={3}>
            Accept your invitation
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              {...register('name')}
              label="Full Name"
              fullWidth
              margin="normal"
              error={!!errors.name}
              helperText={errors.name?.message}
              autoFocus
            />
            <TextField
              {...register('password')}
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <TextField
              {...register('password_confirmation')}
              label="Confirm Password"
              type="password"
              fullWidth
              margin="normal"
              error={!!errors.password_confirmation}
              helperText={errors.password_confirmation?.message}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isSubmitting}
              sx={{ mt: 2, mb: 2 }}
            >
              {isSubmitting ? 'Joining...' : 'Accept & Join Team'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
