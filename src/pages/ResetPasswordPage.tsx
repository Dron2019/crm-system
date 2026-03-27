import { useState } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
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
  Link,
  Alert,
} from '@mui/material';
import api, { getCsrfCookie } from '@/lib/api';

const resetPasswordSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: emailParam },
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    try {
      setError('');
      setSuccess('');
      await getCsrfCookie();
      await api.post('/auth/reset-password', { ...data, token });
      setSuccess('Password has been reset successfully.');
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      setError('Unable to reset password. The link may have expired.');
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
          <Typography variant="h4" fontWeight={700} textAlign="center" mb={1} color="primary">
            CRM System
          </Typography>
          <Typography variant="body2" textAlign="center" color="text.secondary" mb={3}>
            Set your new password
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              {...register('email')}
              label="Email"
              type="email"
              fullWidth
              margin="normal"
              error={!!errors.email}
              helperText={errors.email?.message}
              autoComplete="email"
            />
            <TextField
              {...register('password')}
              label="New Password"
              type="password"
              fullWidth
              margin="normal"
              error={!!errors.password}
              helperText={errors.password?.message}
              autoFocus
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
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </Box>

          <Typography variant="body2" textAlign="center">
            <Link component={RouterLink} to="/login">
              Back to sign in
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
