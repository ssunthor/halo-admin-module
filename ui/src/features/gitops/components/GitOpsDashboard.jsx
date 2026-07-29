import React, { useMemo, useState } from 'react';
import { Box, Typography, CircularProgress, Paper, Grid } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import ProjectCard from './ProjectCard.jsx';

const fetchGitOpsInventory = async () => {
    const res = await fetch('/api/gitops/inventory');
    if (!res.ok) throw new Error('Failed to fetch GitOps inventory');
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Error from server');
    return json.data;
};

export default function GitOpsDashboard() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['gitopsInventory'],
        queryFn: fetchGitOpsInventory,
        refetchInterval: 60000 // Refetch every 1 min
    });

    const [expandedProject, setExpandedProject] = useState(null);

    const handleAccordionChange = (projName) => (event, isExpanded) => {
        setExpandedProject(isExpanded ? projName : null);
    };

    const groupedProjects = useMemo(() => {
        if (!data || !data.projects) return {};
        const groups = {};
        data.projects.forEach(proj => {
            let parentPath = proj.path || proj.fullPath || '';
            if (parentPath.endsWith('/' + proj.name)) {
                parentPath = parentPath.substring(0, parentPath.lastIndexOf('/'));
            }
            if (!groups[parentPath]) {
                groups[parentPath] = [];
            }
            groups[parentPath].push(proj);
        });
        return groups;
    }, [data]);

    const fetchInventory = async () => {
        const res = await fetch('/api/inventory');
        if (!res.ok) throw new Error('Failed to fetch cluster inventory');
        const json = await res.json();
        return json.data || {};
    };

    const { data: inventoryData, isLoading: invLoading } = useQuery({
        queryKey: ['clusterInventoryForGitOps'],
        queryFn: fetchInventory,
        refetchInterval: 60000
    });

    const activeImages = useMemo(() => {
        const images = new Set();
        if (!inventoryData) return images;
        
        Object.values(inventoryData).forEach(clusters => {
            Object.values(clusters).forEach(cluster => {
                const res = cluster.resources || {};
                Object.values(res).forEach(resourceList => {
                    resourceList.forEach(item => {
                        if (item.image) {
                            images.add(item.image);
                        }
                    });
                });
            });
        });
        return images;
    }, [inventoryData]);

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2, color: 'text.secondary' }}>
                    Fetching Real-Time Git Inventory...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography color="error">Error loading GitOps inventory: {error.message}</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 1, height: '100%', overflow: 'auto' }}>
            {Object.keys(groupedProjects).length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No GitOps data available.</Typography>
                </Paper>
            ) : (
                Object.keys(groupedProjects).sort().map(groupPath => (
                    <Box key={groupPath} sx={{ mb: 4 }}>
                        <Typography variant="overline" sx={{ display: 'block', mb: 1, ml: 1, color: 'text.secondary', fontWeight: 'bold', fontSize: '0.85rem' }}>
                            📁 {groupPath}
                        </Typography>
                        <Grid container spacing={2}>
                            {groupedProjects[groupPath].sort((a,b) => a.name.localeCompare(b.name)).map((proj, idx) => (
                                <Grid item xs={12} md={6} lg={4} xl={3} key={proj.path || proj.fullPath || idx}>
                                    <ProjectCard 
                                        project={proj} 
                                        activeImages={activeImages}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                ))
            )}
        </Box>
    );
}
