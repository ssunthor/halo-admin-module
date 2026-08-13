import React from 'react';
import { Box, Typography, CircularProgress, Paper, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import FeatureCatalogTable from '../features/configuration/components/FeatureCatalogTable.jsx';

const fetchFeatures = async () => {
    const res = await fetch('/api/configuration/features');
    if (!res.ok) throw new Error('Failed to fetch features');
    const json = await res.json();
    return json.data || [];
};

export default function ConfigurationPage() {
    const { data: features, isLoading, error } = useQuery({
        queryKey: ['featureCatalog'],
        queryFn: fetchFeatures,
        refetchInterval: 60000 // Refetch every 1 min
    });

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">Error loading feature catalog: {error.message}</Alert>
            </Box>
        );
    }

    // Group features by product category
    const groupedFeatures = {};
    if (features) {
        features.forEach(f => {
            if (!groupedFeatures[f.product_category]) {
                groupedFeatures[f.product_category] = [];
            }
            groupedFeatures[f.product_category].push(f);
        });
    }

    return (
        <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
                Feature Catalog Configuration
            </Typography>
            
            {Object.keys(groupedFeatures).length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No features available in the catalog.</Typography>
                </Paper>
            ) : (
                Object.keys(groupedFeatures).sort((a, b) => {
                    const order = [
                        "Defense Halo Detect",
                        "Defense Halo Command",
                        "Defense Halo Recon - Configuration",
                        "Defense Halo Recon - CVE"
                    ];
                    let indexA = order.indexOf(a);
                    let indexB = order.indexOf(b);
                    if (indexA === -1) indexA = 999;
                    if (indexB === -1) indexB = 999;
                    
                    if (indexA !== indexB) return indexA - indexB;
                    return a.localeCompare(b);
                }).map(category => (
                    <Box key={category} sx={{ mb: 4 }}>
                        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                            {category}
                        </Typography>
                        <FeatureCatalogTable features={groupedFeatures[category]} />
                    </Box>
                ))
            )}
        </Box>
    );
}
