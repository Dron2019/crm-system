import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="60vh"
      textAlign="center"
    >
      <Typography variant="h1" fontWeight={800} color="primary" sx={{ fontSize: 120, lineHeight: 1 }}>
        404
      </Typography>
      <Typography variant="h5" fontWeight={600} mt={2}>
        Page not found
      </Typography>
      <Typography variant="body1" color="text.secondary" mt={1} mb={3}>
        The page you're looking for doesn't exist or has been moved.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/')}>
        Go to Dashboard
      </Button>
    </Box>
  );
}
