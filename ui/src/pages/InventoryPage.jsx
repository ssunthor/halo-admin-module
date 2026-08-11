import React, { useState } from 'react';
import { 
    Box, Typography, CircularProgress, Accordion, AccordionSummary, AccordionDetails, 
    Chip, Paper, Button, IconButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import LaunchIcon from '@mui/icons-material/Launch';
import EditIcon from '@mui/icons-material/Edit';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import LocationDetails from '../features/inventory/components/LocationDetails.jsx';
import EditCustomizationDialog from '../features/inventory/dialogs/EditCustomizationDialog.jsx';

const fetchInventory = async () => {
    const res = await fetch('/api/inventory');
    if (!res.ok) throw new Error('Failed to fetch inventory');
    const json = await res.json();
    return json.data || {};
};

export default function InventoryPage() {
    const { data: inventoryData, isLoading, error } = useQuery({
        queryKey: ['inventoryList'],
        queryFn: fetchInventory,
        refetchInterval: 60000 // Refetch every 1 min
    });
    
    const queryClient = useQueryClient();
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editTenantSlug, setEditTenantSlug] = useState('');
    const [editTenantData, setEditTenantData] = useState(null);

    const handleEditClick = (ns, tenantData) => (e) => {
        e.stopPropagation();
        setEditTenantSlug(ns);
        setEditTenantData(tenantData);
        setEditDialogOpen(true);
    };

    const [expandedNamespace, setExpandedNamespace] = useState(null);

    const handleAccordionChange = (ns) => (event, isExpanded) => {
        setExpandedNamespace(isExpanded ? ns : null);
    };

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
                <Typography color="error">Error loading inventory: {error.message}</Typography>
            </Box>
        );
    }

    const namespaces = Object.keys(inventoryData || {}).sort();

    const filteredNamespaces = namespaces.filter(ns => {
        const clustersData = inventoryData[ns] || {};
        let cat = 'CUSTOMER';
        Object.keys(clustersData).forEach(clusterName => {
            if (clustersData[clusterName].tenant_category) {
                cat = clustersData[clusterName].tenant_category;
            }
        });
        return cat !== 'INFRASTRUCTURE';
    });

    return (
        <Box sx={{ p: 1, height: '100%', overflow: 'auto' }}>
            {filteredNamespaces.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No inventory data available.</Typography>
                </Paper>
            ) : (
                filteredNamespaces.map(ns => {
                    const clustersData = inventoryData[ns] || {};
                    const locations = {};
                    let namespaceUrl = '';
                    let tenantCategory = 'CUSTOMER';
                    let tenantTier = 'UNKNOWN';
                    let fullTenantData = {};

                    Object.keys(clustersData).forEach(clusterName => {
                        const loc = clusterName.split('-')[0].toUpperCase();
                        if (!locations[loc]) {
                            locations[loc] = { 
                                clusters: [], 
                                resources: {}, 
                                tier: clustersData[clusterName].tenant_tier || 'UNKNOWN'
                            };
                        }
                        locations[loc].clusters.push(clusterName);
                        
                        const res = clustersData[clusterName].resources || {};
                        Object.keys(res).forEach(k => {
                            if (!locations[loc].resources[k]) locations[loc].resources[k] = [];
                            const itemsWithCluster = res[k].map(item => ({...item, cluster: clusterName}));
                            locations[loc].resources[k].push(...itemsWithCluster);
                        });

                        if (!namespaceUrl && clustersData[clusterName].url) {
                            namespaceUrl = clustersData[clusterName].url;
                        }
                        
                        if (clustersData[clusterName].tenant_category) {
                            tenantCategory = clustersData[clusterName].tenant_category;
                            fullTenantData = clustersData[clusterName];
                        }
                        if (clustersData[clusterName].tenant_tier) {
                            tenantTier = clustersData[clusterName].tenant_tier;
                        }
                    });
                    
                    return (
                        <Accordion 
                            key={ns} 
                            expanded={expandedNamespace === ns} 
                            onChange={handleAccordionChange(ns)}
                            sx={{ 
                                mb: 2, 
                                backgroundColor: 'background.paper',
                                '&:before': { display: 'none' },
                                borderRadius: '8px !important',
                                overflow: 'hidden'
                            }}
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', pr: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main', textTransform: 'uppercase' }}>
                                            {ns}
                                        </Typography>
                                        <Chip 
                                            icon={tenantCategory === 'INTERNAL' ? <LockIcon fontSize="small"/> : <PublicIcon fontSize="small"/>}
                                            label={tenantCategory} 
                                            size="small" 
                                            color={tenantCategory === 'INTERNAL' ? 'warning' : 'info'} 
                                        />
                                        <Chip 
                                            label={tenantTier} 
                                            size="small" 
                                            variant="outlined"
                                        />
                                        <IconButton size="small" onClick={handleEditClick(ns, fullTenantData)}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                    {namespaceUrl && (
                                        <Button 
                                            variant="outlined" 
                                            color="success"
                                            size="small"
                                            endIcon={<LaunchIcon fontSize="small" />}
                                            href={namespaceUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            sx={{ borderRadius: '20px', textTransform: 'none', ml: 2, '&:hover': { backgroundColor: 'rgba(78,216,105,0.1)' } }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {namespaceUrl}
                                        </Button>
                                    )}
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ backgroundColor: 'rgba(0,0,0,0.1)', p: 3 }}>
                                {Object.keys(locations).length === 0 ? (
                                    <Typography color="text.secondary">No locations discovered in this namespace.</Typography>
                                ) : (
                                    Object.keys(locations).sort().map(loc => (
                                        <LocationDetails 
                                            key={loc} 
                                            locationName={loc} 
                                            details={locations[loc]} 
                                        />
                                    ))
                                )}
                            </AccordionDetails>
                        </Accordion>
                    );
                })
            )}
            <EditCustomizationDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                tenantSlug={editTenantSlug}
                currentData={editTenantData}
                onSaveSuccess={() => {
                    queryClient.invalidateQueries(['inventoryList']);
                }}
            />
        </Box>
    );
}
