import React from 'react';
import { Box, CircularProgress, Stack, Paper, Typography } from '@mui/material';

export default function ProjectChangelogTab({ changelogData, isLoading }) {
    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    if (!changelogData || changelogData.length === 0) {
        return <Typography variant="body2" color="text.secondary">No changelog entries found.</Typography>;
    }

    return (
        <Stack spacing={2}>
            {changelogData.map((release, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">Version {release.version}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">Released: {release.date}</Typography>
                        {release.author && (
                            <Typography variant="caption" color="info.main" sx={{ fontStyle: 'italic', ml: 1 }}>by {release.author}</Typography>
                        )}
                    </Box>
                    {release.changes && release.changes.map((cat, j) => (
                        <Box key={j} sx={{ mt: 1 }}>
                            <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>{cat.category}</Typography>
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                {cat.items?.map((item, k) => (
                                    <li key={k}><Typography variant="body2">{item}</Typography></li>
                                ))}
                            </ul>
                        </Box>
                    ))}
                </Paper>
            ))}
        </Stack>
    );
}