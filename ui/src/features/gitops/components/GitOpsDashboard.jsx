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
        
        const filteredProjects = data.projects.filter(p => p.type === 'APPLICATION');
        
        filteredProjects.forEach(proj => {
            let parentPath = proj.path || proj.fullPath || '';
            const lastSlash = parentPath.lastIndexOf('/');
            if (lastSlash > 0) {
                parentPath = parentPath.substring(0, lastSlash);
            }
            if (!groups[parentPath]) {
                groups[parentPath] = [];
            }
            groups[parentPath].push(proj);
        });
        return groups;
    }, [data]);

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
                <Paper sx={{ p: 4, textAlign: 'center', width: '100%' }}>
                    <Typography color="text.secondary">No GitOps data available.</Typography>
                </Paper>
            ) : (
                <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', 
                    gap: 3, 
                    gridAutoFlow: 'dense' 
                }}>
                    {Object.keys(groupedProjects).sort().map(groupPath => {
                        const projCount = groupedProjects[groupPath].length;
                        return (
                            <Box key={groupPath} sx={{ 
                                display: 'flex', flexDirection: 'column',
                                gridColumn: { 
                                    xs: 'span 1', 
                                    md: `span ${Math.min(projCount, 2)}`,
                                    xl: `span ${Math.min(projCount, 4)}`
                                }
                            }}>
                                <Typography variant="overline" sx={{ display: 'block', mb: 1, ml: 1, color: 'text.secondary', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                    📁 {groupPath}
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 2 }}>
                                    {groupedProjects[groupPath].sort((a,b) => a.name.localeCompare(b.name)).map((proj, idx) => (
                                        <Box key={proj.path || proj.fullPath || idx}>
                                            <ProjectCard project={proj} />
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            )}
        </Box>
    );
}
