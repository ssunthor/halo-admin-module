import React, { useMemo } from 'react';
import { Box, Typography, Stack, Paper, Chip, Tooltip, IconButton, Button, Table, TableBody, TableRow, TableCell } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TerminalIcon from '@mui/icons-material/Terminal';
import ReplayIcon from '@mui/icons-material/Replay';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useQuery } from '@tanstack/react-query';

export default function ProjectGitOpsTab({ 
    project, 
    auditLogs, 
    activeTask, 
    handleTriggerRelease,
    handleTriggerRetry,
    setSelectedAuditLog, 
    setReleaseTaskId, 
    setShowReleaseProgress 
}) {
    const { data: user } = useQuery({ queryKey: ['user'] });
    const canPromote = user?.permissions?.can_promote_release;

    const { data: taskLogs } = useQuery({
        queryKey: ['taskLogs', activeTask?.task_id],
        queryFn: async () => {
            if (!activeTask?.task_id) return null;
            const res = await fetch(`/api/gitops/tasks/${activeTask.task_id}/logs`);
            const data = await res.json();
            return data.logs || [];
        },
        enabled: !!activeTask?.task_id
    });

    const activeTaskBranch = useMemo(() => {
        if (!taskLogs || taskLogs.length === 0) return null;
        const firstMsg = typeof taskLogs[0] === 'string' ? taskLogs[0] : taskLogs[0].message;
        const match = firstMsg?.match(/Starting release: (.*?) ->/);
        return match ? match[1] : null;
    }, [taskLogs]);

    const isTaskActiveOrFailed = activeTask?.status === 'RUNNING' || activeTask?.status === 'FAILED';

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

    const mergedFeatures = new Set();
    project?.inventory?.pre_releases?.forEach(r => r.source_feature && mergedFeatures.add(r.source_feature));
    project?.inventory?.releases?.forEach(r => r.source_feature && mergedFeatures.add(r.source_feature));

    const renderTaskActions = (branchName, targetBranch, author, isMerged) => {
        const onRetryClick = () => {
            const latestAuditForBranch = auditLogs?.find(a => a.source_branch === branchName || a.version_tag === branchName);
            const pipelineId = latestAuditForBranch?.job_details_json?.pipeline_id || latestAuditForBranch?.pipeline_id;
            const mergeId = latestAuditForBranch?.merge_request_id;

            if (pipelineId || mergeId) {
                handleTriggerRetry(pipelineId, mergeId, author);
            } else {
                handleTriggerRelease(branchName, targetBranch, author, isMerged);
            }
        };

        if (activeTaskBranch === branchName) {
            if (activeTask.status === 'FAILED') {
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                        <Button 
                            variant="outlined" 
                            color="error" 
                            size="small" 
                            startIcon={<ErrorOutlineIcon fontSize="small" />}
                            sx={{ height: 24, fontSize: '0.7rem' }}
                            onClick={() => { setReleaseTaskId(activeTask.task_id); setShowReleaseProgress(true); }}
                        >
                            View Failure
                        </Button>
                        {canPromote && (
                            <>
                                <Button 
                                    variant="contained" 
                                    color="warning" 
                                    size="small" 
                                    startIcon={<ReplayIcon fontSize="small" />}
                                    sx={{ height: 24, fontSize: '0.7rem' }}
                                    onClick={onRetryClick}
                                >
                                    Retry Release
                                </Button>
                                <Button 
                                    variant="outlined" 
                                    color="primary" 
                                    size="small" 
                                    startIcon={<RocketLaunchIcon fontSize="small" />}
                                    sx={{ height: 24, fontSize: '0.7rem' }}
                                    onClick={() => handleTriggerRelease(branchName, targetBranch, author, isMerged)}
                                >
                                    Fresh Release
                                </Button>
                            </>
                        )}
                    </Box>
                );
            }
            if (activeTask.status === 'RUNNING') {
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                        <Button 
                            variant="outlined" 
                            color="info" 
                            size="small" 
                            startIcon={<TerminalIcon fontSize="small" />}
                            sx={{ height: 24, fontSize: '0.7rem' }}
                            onClick={() => { setReleaseTaskId(activeTask.task_id); setShowReleaseProgress(true); }}
                        >
                            Task Running...
                        </Button>
                        {canPromote && (
                            <Button 
                                variant="outlined" 
                                color="warning" 
                                size="small" 
                                startIcon={<ReplayIcon fontSize="small" />}
                                sx={{ height: 24, fontSize: '0.7rem' }}
                                onClick={onRetryClick}
                            >
                                Force Retry
                            </Button>
                        )}
                    </Box>
                );
            }
        }

        if (!canPromote) return null;

        return (
            <Button 
                variant="contained" 
                size="small" 
                color={targetBranch === 'master' ? 'secondary' : 'primary'}
                startIcon={<RocketLaunchIcon fontSize="small" />}
                sx={{ ml: 2, height: 24, fontSize: '0.7rem' }}
                onClick={() => handleTriggerRelease(branchName, targetBranch, author, isMerged)}
            >
                {targetBranch === 'master' ? 'Promote to Master' : 'Promote'}
            </Button>
        );
    };

    const renderBranchCard = (b) => {
        const isTaskTarget = isTaskActiveOrFailed && activeTaskBranch === b.branch;
        const cardBorderColor = isTaskTarget && activeTask?.status === 'FAILED' ? 'error.main' : (isTaskTarget ? 'info.main' : 'primary.main');
        const bgColor = isTaskTarget && activeTask?.status === 'FAILED' ? 'rgba(211, 47, 47, 0.05)' : 'background.paper';
        const auditsForBranch = auditLogs?.filter(a => a.source_branch === b.branch) || [];

        return (
            <Paper key={b.branch} sx={{ p: 1.5, borderLeft: 4, borderColor: cardBorderColor, bgcolor: bgColor }} variant="outlined">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountTreeIcon color={isTaskTarget && activeTask?.status === 'FAILED' ? 'error' : (isTaskTarget ? 'info' : 'primary')} fontSize="small" />
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{b.branch}</Typography>
                    
                    {auditsForBranch.length > 0 && (
                        <Tooltip title={auditsForBranch.length > 1 ? "Multiple Audits Found" : "View Audit Details"}>
                            <IconButton
                                size="small"
                                onClick={() => setSelectedAuditLog(auditsForBranch)}
                                sx={{ p: 0.5 }}
                            >
                                <FactCheckIcon fontSize="inherit" color={auditsForBranch.length > 1 ? "warning" : "info"} />
                            </IconButton>
                        </Tooltip>
                    )}

                    {b.branch === 'dev' && renderTaskActions(b.branch, 'master', b.author, false)}
                    {b.branch !== 'dev' && b.branch !== 'master' && b.branch !== 'main' && renderTaskActions(b.branch, 'dev', b.author, false)}

                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                        Author: {b.author || 'Unknown'}
                    </Typography>
                </Box>
            </Paper>
        );
    };

    const renderContainerGroup = (title, items, borderColor, hideTitle = false) => {
        if (!items || items.length === 0) return null;
        
        const sortedItems = [...items].sort((a, b) => {
            const dateA = new Date(a.created_at || a.container_created || 0);
            const dateB = new Date(b.created_at || b.container_created || 0);
            return dateB - dateA;
        });
        
        return (
            <Box>
                {!hideTitle && title && <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>{title}</Typography>}
                <Stack spacing={1}>
                    {sortedItems.map((t, idx) => {
                        const tagName = t.tag || t.container_tag;
                        const activeDeployments = t.active_deployments || 0;
                        const inUse = activeDeployments > 0;
                        const author = t.author || t.branch_author || 'Unknown';
                        const created = t.created_at || t.container_created;
                        const auditsForTag = auditLogs?.filter(a => 
                            (tagName && a.version_tag === tagName) || 
                            (t.branch && a.source_branch === t.branch)
                        ) || [];
                        const isMerged = t.branch && mergedFeatures.has(t.branch);
                        
                        const isTaskTarget = isTaskActiveOrFailed && activeTaskBranch === t.branch;
                        const cardBorderColor = isTaskTarget && activeTask?.status === 'FAILED' ? 'error.main' : borderColor;
                        const bgColor = isTaskTarget && activeTask?.status === 'FAILED' ? 'rgba(211, 47, 47, 0.05)' : 'background.paper';

                        return (
                            <Paper key={idx} sx={{ p: 1.5, borderLeft: 4, borderColor: cardBorderColor, bgcolor: bgColor }} variant="outlined">
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                            <StorageIcon fontSize="inherit" color={isTaskTarget && activeTask?.status === 'FAILED' ? 'error' : (isTaskTarget ? 'info' : 'action')} />
                                            <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                                                {tagName}
                                            </Typography>
                                            {t.has_native_release && (
                                                <Tooltip title="View GitLab Release">
                                                    <IconButton
                                                        component="a"
                                                        href={`https://gitlab.gt-t.net/${project.path || project.fullPath}/-/releases/${tagName}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        size="small"
                                                        sx={{ p: 0.5 }}
                                                    >
                                                        <OpenInNewIcon fontSize="inherit" color="primary" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {auditsForTag.length > 0 && (
                                                <Tooltip title={auditsForTag.length > 1 ? "Multiple Audits Found" : "View Audit Details"}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => setSelectedAuditLog(auditsForTag)}
                                                        sx={{ p: 0.5 }}
                                                    >
                                                        <FactCheckIcon fontSize="inherit" color={auditsForTag.length > 1 ? "warning" : "info"} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {isMerged && (
                                                <Tooltip title="Already merged to dev branch">
                                                    <IconButton size="small" sx={{ p: 0.5, cursor: 'default' }} disableRipple>
                                                        <CallMergeIcon fontSize="inherit" color="secondary" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {(title === null || title.includes("Active Features")) && renderTaskActions(t.branch, 'dev', author, isMerged)}
                                            {inUse && (
                                                <Tooltip title={t.active_namespaces?.length > 0 ? buildNamespacesTooltip(t.active_namespaces) : ''} {...tooltipProps}>
                                                    <Chip size="small" label={`Active Deployments: ${activeDeployments}`} color="success" sx={{ height: 20, fontSize: '0.7rem', bgcolor: 'rgba(46, 125, 50, 0.1)' }} variant="outlined" />
                                                </Tooltip>
                                            )}
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 2 }}>
                                            {t.branch && <span><strong>Branch:</strong> {t.branch}</span>}
                                            {t.source_feature && t.source_feature !== 'Unknown' && <span><strong>Feature:</strong> {t.source_feature}</span>}
                                            <span><strong>Author:</strong> {author}</span>
                                        </Typography>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                        {created ? new Date(created).toLocaleString() : 'unknown'}
                                    </Typography>
                                </Box>
                            </Paper>
                        );
                    })}
                </Stack>
            </Box>
        );
    };

    let activeBranchItem = null;
    let activeContainerItem = null;

    const checkActiveFilter = (item) => {
        const name = item.branch || item.tag || item.container_tag;
        if (isTaskActiveOrFailed && activeTaskBranch && name === activeTaskBranch) {
            activeContainerItem = item;
            return false;
        }
        return true;
    };

    const activeBranches = (project.inventory?.active_branches_without_containers || []).filter(b => {
        if (isTaskActiveOrFailed && activeTaskBranch && b.branch === activeTaskBranch) {
            activeBranchItem = b;
            return false;
        }
        return true;
    });

    const releases = (project.inventory?.releases || []).filter(checkActiveFilter);
    const preReleases = (project.inventory?.pre_releases || []).filter(checkActiveFilter);
    const features = (project.inventory?.features || []).filter(checkActiveFilter);
    const standalone = (project.inventory?.standalone_features || []).filter(c => {
        if (c.active_deployments === 0) return false;
        return checkActiveFilter(c);
    });

    const isItemFound = activeBranchItem || activeContainerItem;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    Branches & Container Tags
                </Typography>
                
                {activeTask && isTaskActiveOrFailed && (!activeTaskBranch || !isItemFound) && (
                    <Button 
                        variant="outlined" 
                        color={activeTask.status === 'RUNNING' ? 'info' : 'error'}
                        size="small" 
                        startIcon={<TerminalIcon />}
                        onClick={() => {
                            setReleaseTaskId(activeTask.task_id);
                            setShowReleaseProgress(true);
                        }}
                    >
                        Release Task {activeTask.status}
                    </Button>
                )}
            </Box>
            
            <Stack spacing={3}>
                {isTaskActiveOrFailed && activeTaskBranch && isItemFound && (
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: activeTask?.status === 'FAILED' ? 'error.main' : 'info.main', fontWeight: 'bold' }}>
                            {activeTask?.status === 'FAILED' ? '🚨 Failed Release Target' : '🎯 Active Release Target'}
                        </Typography>
                        <Stack spacing={1}>
                            {activeBranchItem && renderBranchCard(activeBranchItem)}
                            {activeContainerItem && renderContainerGroup(null, [activeContainerItem], activeTask?.status === 'FAILED' ? 'error.main' : 'info.main', true)}
                        </Stack>
                    </Box>
                )}

                {activeBranches.length > 0 && (
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>🌱 Active Branches (No Container)</Typography>
                        <Stack spacing={1}>
                            {activeBranches.sort((a, b) => {
                                if (a.branch === 'dev') return -1;
                                if (b.branch === 'dev') return 1;
                                return a.branch.localeCompare(b.branch);
                            }).map(b => renderBranchCard(b))}
                        </Stack>
                    </Box>
                )}

                {renderContainerGroup("🚀 Releases", releases, 'success.main')}
                {renderContainerGroup("🚧 Pre-releases (-dev)", preReleases, 'warning.main')}
                {renderContainerGroup("✨ Active Features", features, 'info.main')}
                {renderContainerGroup("👻 Standalone Containers (Branch Deleted)", standalone, 'error.main')}
                
                {!project.inventory?.releases?.length && !project.inventory?.pre_releases?.length && !project.inventory?.features?.length && !(project.inventory?.standalone_features?.filter(c => c.active_deployments > 0)?.length) && !project.inventory?.active_branches_without_containers?.length && (
                    <Typography variant="body2" color="text.secondary">No branches or tags found.</Typography>
                )}
            </Stack>
        </Box>
    );
}