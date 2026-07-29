import React from 'react';
import { Box } from '@mui/material';
import GitOpsReleasesWidget from '../features/gitops/components/GitOpsReleasesWidget.jsx';

export default function ReleasesPage() {
    return (
        <Box sx={{ p: 3 }}>
            <GitOpsReleasesWidget />
        </Box>
    );
}
