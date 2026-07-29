import React from 'react';
import { Box, Typography, Grid, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StatusChip from './StatusChip.jsx';

export default function ResourceTable({ title, items }) {
    if (!items || items.length === 0) return null;
    
    // Get all unique keys except 'name' to use as columns
    const allKeys = new Set();
    items.forEach(item => {
        Object.keys(item).forEach(k => {
            if (k !== 'name' && k !== 'cluster') allKeys.add(k);
        });
    });
    const columns = Array.from(allKeys);

    return (
        <Accordion variant="outlined" sx={{ mb: 2, backgroundColor: 'background.paper', overflow: 'hidden' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: 'rgba(0,0,0,0.2)', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {title} ({items.length})
                </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
                {items.map((item, idx) => (
                    <Box key={idx} sx={{ 
                        p: 1.5, 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: 1,
                        borderBottom: idx < items.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                        '&:hover': { backgroundColor: 'action.hover' }
                    }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                {item.name}
                            </Typography>
                            {item.cluster && (
                                <Typography variant="caption" color="text.secondary">
                                    {item.cluster}
                                </Typography>
                            )}
                        </Box>
                        <Grid container spacing={2}>
                            {columns.map(col => (
                                <Grid item xs={12} sm={6} key={col} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: '80px', textTransform: 'uppercase' }}>
                                        {col.replace(/_/g, ' ')}:
                                    </Typography>
                                    {col === 'status' || col === 'phase' ? (
                                        <StatusChip status={String(item[col])} />
                                    ) : (
                                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                                            {item[col]}
                                        </Typography>
                                    )}
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                ))}
            </AccordionDetails>
        </Accordion>
    );
}
