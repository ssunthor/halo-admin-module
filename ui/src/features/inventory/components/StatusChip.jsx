import React from 'react';
import { Chip } from '@mui/material';

export default function StatusChip({ status }) {
    let color = 'default';
    if (status.includes('1/1') || status.includes('Ready') || status.includes('Running') || status.includes('Bound')) color = 'success';
    if (status.includes('0/1') || status.includes('Pending')) color = 'warning';
    if (status.includes('0/0') || status.includes('No active')) color = 'default';
    if (status.includes('Crash') || status.includes('Error')) color = 'error';

    return <Chip label={status} color={color} size="small" sx={{ fontWeight: 'bold' }} />;
}
