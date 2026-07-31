import React, { useMemo, useState } from 'react';
import { Typography, Box, Chip, Paper, Tooltip, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ProjectDetailsDialog from '../dialogs/ProjectDetailsDialog';

export default function ProjectCard({ project }) {
    const { name, path, fullPath, inventory = {} } = project;
    const actualPath = path || fullPath;
    const [detailsOpen, setDetailsOpen] = useState(false);

    const tooltipProps = {
        arrow: true,
        placement: 'top',
        PopperProps: { sx: { '& .MuiTooltip-tooltip': { maxWidth: 'none', bgcolor: '#0a0e1a', border: '1px solid #333', boxShadow: 6, borderRadius: 2 } } }
    };

    const buildNamespacesTooltip = (namespaces) => {
        if (!namespaces || namespaces.length === 0) return null;
        
        const chunked = [];
        for (let i = 0; i < namespaces.length; i += 4) {
            chunked.push(namespaces.slice(i, i + 4));
        }

        return (
            <Box sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, pb: 1, borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }}>
                    <InfoOutlinedIcon fontSize="small" /> Active Namespaces
                </Typography>
                <Table size="small" sx={{ '& td': { color: '#a9b3c1', py: 0.5, px: 2, whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.05)' } }}>
                    <TableBody>
                        {chunked.map((row, rIdx) => (
                            <TableRow key={rIdx} sx={{ '&:last-child td': { borderBottom: 'none' } }}>
                                {row.map((ns, cIdx) => (
                                    <TableCell key={cIdx} sx={{ fontFamily: 'monospace', borderRight: cIdx < row.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                                        {ns}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Box>
        );
    };

    const activeBranchChips = useMemo(() => {
        const chips = [];
        
        const checkContainers = (list) => {
            (list || []).forEach(c => {
                const name = c.branch || c.tag || c.container_tag || 'unknown';
                const inUse = c.active_deployments > 0;
                if (inUse) {
                    let existing = chips.find(chip => chip.name === name);
                    if (existing) {
                        existing.activeDeployments += c.active_deployments;
                        if (c.active_namespaces) existing.namespaces.push(...c.active_namespaces);
                    } else {
                        chips.push({ 
                            name: name, 
                            inUse: true, 
                            activeDeployments: c.active_deployments,
                            namespaces: c.active_namespaces ? [...c.active_namespaces] : [] 
                        });
                    }
                }
            });
        };

        checkContainers(inventory.releases);
        checkContainers(inventory.pre_releases);
        checkContainers(inventory.features);
        checkContainers(inventory.standalone_features);
        
        return chips.map(branch => {
            const uniqueNs = Array.from(new Set(branch.namespaces || []));
            const hasNs = uniqueNs.length > 0;
            return (
                <Tooltip key={branch.name} title={hasNs ? buildNamespacesTooltip(uniqueNs) : `Active Deployments: ${branch.activeDeployments}`} {...tooltipProps}>
                    <Chip 
                        size="small"
                        icon={<AccountTreeIcon />}
                        label={`${branch.name} [${branch.activeDeployments}]`}
                        color="success"
                        variant="outlined"
                        sx={{ 
                            height: 22, 
                            fontSize: '0.7rem',
                            bgcolor: 'rgba(46, 125, 50, 0.1)',
                            borderColor: 'success.main'
                        }}
                    />
                </Tooltip>
            );
        });
    }, [inventory]);

    const activeStandaloneFeatures = (inventory.standalone_features || []).filter(c => c.active_deployments > 0);

    const allTagsCount = (inventory.releases?.length || 0) + 
                         (inventory.pre_releases?.length || 0) + 
                         (inventory.features?.length || 0) + 
                         activeStandaloneFeatures.length;

    const allBranchesCount = (inventory.features?.length || 0) + 
                             (inventory.active_branches_without_containers?.length || 0);

    return (
        <>
            <Paper 
                sx={{ 
                    p: 2, 
                    backgroundColor: 'background.paper',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    boxShadow: 2
                }}
                onClick={() => setDetailsOpen(true)}
            >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ overflow: 'hidden' }}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <Inventory2Icon color="primary" fontSize="small" />
                            {name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block', mt: 0.5 }}>
                            {actualPath}
                        </Typography>
                    </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                    {activeBranchChips.length > 0 ? activeBranchChips : (
                        <Typography variant="caption" color="text.secondary">No Active Deployments</Typography>
                    )}
                </Box>
                
                <Box sx={{ mt: 'auto', pt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Chip 
                        size="small" 
                        icon={<AccountTreeIcon fontSize="small"/>} 
                        label={`${allBranchesCount} Branches`} 
                        variant="outlined" 
                        sx={{ border: 'none' }}
                    />
                    <Chip 
                        size="small" 
                        icon={<LocalOfferIcon fontSize="small"/>} 
                        label={`${allTagsCount} Tags`} 
                        color={allTagsCount > 0 ? "primary" : "default"}
                        variant="outlined" 
                        sx={{ border: 'none' }}
                    />
                </Box>
            </Paper>

            <ProjectDetailsDialog 
                open={detailsOpen}
                onClose={() => setDetailsOpen(false)}
                project={project}
            />
        </>
    );
}
