import React from 'react';
import { Box, Typography, Chip, Grid, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StorageIcon from '@mui/icons-material/Storage';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import ResourceTable from './ResourceTable.jsx';

export default function LocationDetails({ locationName, details }) {
    const resources = details.resources || {};
    const resourceKeys = Object.keys(resources).filter(k => resources[k] && resources[k].length > 0);

    return (
        <Accordion sx={{ mb: 1, backgroundColor: 'rgba(0,0,0,0.2)', '&:before': { display: 'none' }, borderRadius: '8px !important', overflow: 'hidden' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <StorageIcon color="secondary" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{locationName}</Typography>
                    <Chip label={`TIER: ${details.tier?.toUpperCase()}`} size="small" variant="outlined" color="primary" />
                </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 2, pt: 0 }}>
                {resourceKeys.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No resources found for this location.
                    </Typography>
                ) : (
                    <Grid container spacing={2}>
                        {resourceKeys.map(key => (
                            <Grid item xs={12} lg={4} key={key}>
                                <ResourceTable title={key.replace(/_/g, ' ')} items={resources[key]} />
                            </Grid>
                        ))}
                    </Grid>
                )}
            </AccordionDetails>
        </Accordion>
    );
}
