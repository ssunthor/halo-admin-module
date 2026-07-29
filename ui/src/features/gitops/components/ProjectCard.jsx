import React, { useMemo, useState } from 'react';
import { Typography, Box, Chip, Paper } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ProjectDetailsDialog from './ProjectDetailsDialog.jsx';

export default function ProjectCard({ project, activeImages }) {
    const { name, path, fullPath, branches = [], containers = [] } = project;
    const actualPath = path || fullPath;
    const [detailsOpen, setDetailsOpen] = useState(false);

    const allTagsCount = containers.reduce((acc, c) => acc + (c.tags?.length || 0), 0);
    const activeImagesArray = Array.from(activeImages || new Set());

    const isTagInUse = (tagName) => {
        return activeImagesArray.some(img => img.endsWith(':' + tagName));
    };

    // Merge branches and tags
    const unifiedList = useMemo(() => {
        const list = [];
        const branchMap = {};
        
        branches.forEach(bObj => {
            const bName = typeof bObj === 'string' ? bObj : bObj.name;
            branchMap[bName] = { type: 'branch', name: bName, tags: [] };
        });

        containers.forEach(c => {
            const registryName = c.name || 'root registry';
            if (c.tags) {
                c.tags.forEach(t => {
                    const tagObj = { ...t, registry: registryName, inUse: isTagInUse(t.name) };
                    const isStable = ['main', 'latest', 'demo', 'dev', 'stable', 'master'].includes(t.name) || 
                                     ['main', 'latest', 'demo', 'dev', 'stable', 'master'].includes(t.source_branch);
                    const isDeleted = !t.branch_exists && !isStable;

                    if (t.is_git_tag) {
                        list.push({ type: 'release', name: t.name, tag: tagObj, inUse: tagObj.inUse });
                    } else if (t.branch_exists && branchMap[t.source_branch]) {
                        branchMap[t.source_branch].tags.push(tagObj);
                    } else if (t.branch_exists && branchMap[t.name]) {
                        branchMap[t.name].tags.push(tagObj);
                    } else {
                        list.push({ type: 'deleted', name: t.name, tag: tagObj, isDeleted, inUse: tagObj.inUse });
                    }
                });
            }
        });

        const result = [...Object.values(branchMap), ...list];
        return result.sort((a, b) => {
            if (a.type === 'branch' && b.type !== 'branch') return -1;
            if (a.type !== 'branch' && b.type === 'branch') return 1;
            if (a.type === 'branch' && b.type === 'branch') {
                if (['main', 'master'].includes(a.name)) return -1;
                if (['main', 'master'].includes(b.name)) return 1;
                return a.name.localeCompare(b.name);
            }
            if (a.type === 'release' && b.type === 'deleted') return -1;
            if (a.type === 'deleted' && b.type === 'release') return 1;
            return 0;
        });
    }, [branches, containers, activeImagesArray]);

    const activeBranchChips = useMemo(() => {
        const activeBranches = unifiedList.filter(item => {
            if (item.type !== 'branch') return false;
            return item.tags.some(t => t.inUse) || ['main', 'master'].includes(item.name);
        });
        
        return activeBranches.map(branch => {
            const inUse = branch.tags.some(t => t.inUse);
            return (
                <Chip 
                    key={branch.name}
                    size="small"
                    icon={<AccountTreeIcon />}
                    label={inUse ? `${branch.name} [In Use]` : branch.name}
                    color={inUse ? 'success' : 'default'}
                    variant={inUse ? 'filled' : 'outlined'}
                    sx={{ height: 22, fontSize: '0.7rem' }}
                />
            );
        });
    }, [unifiedList]);

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
                        <Typography variant="caption" color="text.secondary">No Active Branches</Typography>
                    )}
                </Box>
                
                <Box sx={{ mt: 'auto', pt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Chip 
                        size="small" 
                        icon={<AccountTreeIcon fontSize="small"/>} 
                        label={`${branches.length} Branches`} 
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
                unifiedList={unifiedList}
            />
        </>
    );
}
