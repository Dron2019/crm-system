import React from 'react';
import { Box, Typography, Button } from '@mui/material';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="60vh"
          textAlign="center"
          px={3}
        >
          <Typography variant="h4" fontWeight={700} color="error" mb={1}>
            Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </Typography>
          <Box display="flex" gap={2}>
            <Button variant="contained" onClick={this.handleReset}>
              Try Again
            </Button>
            <Button variant="outlined" onClick={() => window.location.assign('/')}>
              Go Home
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
