import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  LinearProgress,
} from '@mui/material';
import { useAuthStore } from '@/stores/authStore';

export default function BillingSettingsPage() {
  const { user } = useAuthStore();
  const plan = user?.current_team?.billing_plan ?? 'free';

  return (
    <Box maxWidth={600}>
      <Typography variant="h6" fontWeight={600} mb={2}>
        Billing & Plan
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1" fontWeight={600}>
              Current Plan
            </Typography>
            <Chip
              label={plan.charAt(0).toUpperCase() + plan.slice(1)}
              color={plan === 'free' ? 'default' : 'primary'}
              variant="outlined"
            />
          </Box>

          <Typography variant="body2" color="text.secondary" mb={2}>
            {plan === 'free'
              ? 'You are on the free plan with limited features. Upgrade to unlock advanced features like custom fields, reports, and more.'
              : 'You are on a paid plan with full access to all features.'}
          </Typography>

          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2">Contacts</Typography>
              <Typography variant="body2" color="text.secondary">
                {plan === 'free' ? '250 / 500' : 'Unlimited'}
              </Typography>
            </Box>
            {plan === 'free' && <LinearProgress variant="determinate" value={50} />}
          </Box>

          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2">Team Members</Typography>
              <Typography variant="body2" color="text.secondary">
                {plan === 'free' ? '3 / 5' : 'Unlimited'}
              </Typography>
            </Box>
            {plan === 'free' && <LinearProgress variant="determinate" value={60} />}
          </Box>

          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2">Storage</Typography>
              <Typography variant="body2" color="text.secondary">
                {plan === 'free' ? '120 MB / 500 MB' : 'Unlimited'}
              </Typography>
            </Box>
            {plan === 'free' && <LinearProgress variant="determinate" value={24} />}
          </Box>

          {plan === 'free' && (
            <Button variant="contained" fullWidth sx={{ mt: 1 }}>
              Upgrade Plan
            </Button>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
