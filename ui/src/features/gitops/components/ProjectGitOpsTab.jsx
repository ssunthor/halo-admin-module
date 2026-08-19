import React, { useMemo } from 'react';
import { Box, Typography, Stack, Paper, Chip, Tooltip, IconButton, Button, Table, TableBody, TableRow, TableCell, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TerminalIcon from '@mui/icons-material/Terminal';
import ReplayIcon from '@mui/icons-material/Replay';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PendingIcon from '@mui/icons-material/Pending';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useQuery } from '@tanstack/react-query';

export default function ProjectGitOpsTab({
    project,
    auditLogs,
    activeTask,
    handleTriggerRelease,
    handleTriggerRetry,
    handleTriggerDelete,
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

    const renderTaskActions = (branchName, targetBranch, isMerged) => {
        const onRetryClick = () => {
            const latestAuditForBranch = auditLogs?.find(a => a.source_branch === branchName || a.version_tag === branchName);
            const pipelineId = latestAuditForBranch?.job_details_json?.pipeline_id || latestAuditForBranch?.pipeline_id;
            const mergeId = latestAuditForBranch?.merge_request_id;

            if (pipelineId || mergeId) {
                handleTriggerRetry(pipelineId, mergeId);
            } else {
                handleTriggerRelease(branchName, targetBranch, isMerged);
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
                                    onClick={() => handleTriggerRelease(branchName, targetBranch, isMerged)}
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

        const isAuditRunning = auditLogs?.some(a =>
            (a.source_branch === branchName || a.version_tag === branchName) &&
            a.status === 'RUNNING'
        );

        if (isAuditRunning) {
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                    {activeTask?.status === 'RUNNING' ? (
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
                    ) : (
                        <Chip
                            size="small"
                            icon={<PendingIcon fontSize="small" />}
                            label="RUNNING"
                            color="warning"
                            variant="outlined"
                            sx={{ height: 24, fontSize: '0.7rem', fontWeight: 'bold' }}
                        />
                    )}
                </Box>
            );
        }

        if (!canPromote) return null;

        return (
            <Button
                variant="contained"
                size="small"
                color={targetBranch === 'main' ? 'secondary' : 'primary'}
                startIcon={<RocketLaunchIcon fontSize="small" />}
                sx={{ ml: 2, height: 24, fontSize: '0.7rem' }}
                onClick={() => handleTriggerRelease(branchName, targetBranch, isMerged)}
            >
                {targetBranch === 'main' ? 'Promote to Main' : 'Promote'}
            </Button>
        );
    };

    const renderDeleteAction = (branchName, containerTag, disableDeletion) => {
        if (!canPromote) return null;
        if (disableDeletion) return null;

        return (
            <Tooltip title="Delete">
                <IconButton
                    size="small"
                    color="error"
                    sx={{ p: 0.5, ml: 1 }}
                    onClick={() => handleTriggerDelete(branchName, containerTag)}
                >
                    <DeleteOutlineIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        );
    };

    const isItemActiveTarget = (name) => {
        if (!name) return false;
        if (isTaskActiveOrFailed && activeTaskBranch && name === activeTaskBranch) return true;
        return auditLogs?.some(a => (a.source_branch === name || a.version_tag === name) && a.status === 'RUNNING') || false;
    };

    const isItemFailedTarget = (name) => {
        if (!name) return false;
        return isTaskActiveOrFailed && activeTaskBranch && name === activeTaskBranch && activeTask?.status === 'FAILED';
    };

    const renderBranchCard = (b) => {
        const isTaskTarget = isItemActiveTarget(b.branch);
        const isFailed = isItemFailedTarget(b.branch);
        const cardBorderColor = isFailed ? 'error.main' : (isTaskTarget ? 'info.main' : 'primary.main');
        const bgColor = isFailed ? 'rgba(211, 47, 47, 0.05)' : 'background.paper';
        const auditsForBranch = auditLogs?.filter(a => a.source_branch === b.branch) || [];
        const author = b.author || b.branch_author || 'Unknown';

        return (
            <Paper key={b.branch} sx={{ p: 1.5, borderLeft: 4, borderColor: cardBorderColor, bgcolor: bgColor }} variant="outlined">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <AccountTreeIcon color={isFailed ? 'error' : (isTaskTarget ? 'info' : 'primary')} fontSize="small" />
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{b.branch}</Typography>
                            <Chip label="Branch" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 'bold' }} />

                            {b.branch && (
                                <Tooltip title="View Branch on GitLab">
                                    <IconButton
                                        component="a"
                                        href={`https://gitlab.gt-t.net/${project.path || project.fullPath}/-/tree/${b.branch}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        size="small"
                                        sx={{ p: 0.5 }}
                                    >
                                        <OpenInNewIcon fontSize="inherit" color="primary" />
                                    </IconButton>
                                </Tooltip>
                            )}

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

                            {b.branch === 'dev' && renderTaskActions(b.branch, 'main', false)}
                            {b.branch !== 'dev' && b.branch !== 'master' && b.branch !== 'main' && renderTaskActions(b.branch, 'dev', false)}
                            {renderDeleteAction(b.branch, null, b.branch === 'dev' || b.branch === 'main' || b.branch === 'master')}
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 2 }}>
                                {(b.branch === 'main' || b.branch === 'master')
                                    ? <span><strong>Version:</strong> {b.container_tag || b.tag || 'Unknown'}</span>
                                    : <span><strong>Branch:</strong> {b.branch}</span>
                                }
                                <span><strong>Author:</strong> {author}</span>
                            </Typography>

                            <Box sx={{ textAlign: 'right' }}>
                                {(b.created_at || b.container_created) && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                        Container Created: {new Date(b.created_at || b.container_created).toLocaleString()}
                                    </Typography>
                                )}
                                {b.last_updated_at && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                        Branch Updated: {new Date(b.last_updated_at).toLocaleString()}
                                    </Typography>
                                )}
                                {!(b.created_at || b.container_created) && !b.last_updated_at && (
                                    <Typography variant="caption" color="text.secondary">
                                        Created: unknown
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </Box>
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

                        const isTaskTarget = isItemActiveTarget(t.branch) || isItemActiveTarget(tagName);
                        const isFailed = isItemFailedTarget(t.branch) || isItemFailedTarget(tagName);
                        const cardBorderColor = isFailed ? 'error.main' : (isTaskTarget ? 'info.main' : borderColor);
                        const bgColor = isFailed ? 'rgba(211, 47, 47, 0.05)' : 'background.paper';

                        return (
                            <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                {hideTitle && (
                                    <SubdirectoryArrowRightIcon color="action" sx={{ mt: 2, mr: 1, opacity: 0.5 }} />
                                )}
                                <Paper sx={{ flex: 1, p: 1.5, borderLeft: 4, borderColor: cardBorderColor, bgcolor: bgColor }} variant="outlined">
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                <StorageIcon fontSize="inherit" color={isFailed ? 'error' : (isTaskTarget ? 'info' : 'action')} />
                                                <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace', textDecoration: t.is_inactive ? 'line-through' : 'none', color: t.is_inactive ? 'text.disabled' : 'inherit' }}>
                                                    {tagName}
                                                </Typography>
                                                {t.is_inactive ? (
                                                    <Chip label="Deleted Container" size="small" color="default" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 'bold' }} />
                                                ) : (
                                                    <Chip label="Container" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 'bold' }} />
                                                )}

                                                {t.branch && (
                                                    <Tooltip title="View Branch on GitLab">
                                                        <IconButton
                                                            component="a"
                                                            href={`https://gitlab.gt-t.net/${project.path || project.fullPath}/-/tree/${t.branch}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            size="small"
                                                            sx={{ p: 0.5 }}
                                                        >
                                                            <OpenInNewIcon fontSize="inherit" color="primary" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}

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
                                                {t.branch !== 'dev' && t.branch !== 'master' && t.branch !== 'main' && ((title && title.includes("Active Features")) || hideTitle) && renderTaskActions(t.branch, 'dev', isMerged)}
                                                {inUse && (
                                                    <Tooltip title={t.active_namespaces?.length > 0 ? buildNamespacesTooltip(t.active_namespaces) : ''} {...tooltipProps}>
                                                        <Chip size="small" label={`Active Deployments: ${activeDeployments}`} color="success" sx={{ height: 20, fontSize: '0.7rem', bgcolor: 'rgba(46, 125, 50, 0.1)' }} variant="outlined" />
                                                    </Tooltip>
                                                )}
                                                {renderDeleteAction(t.branch, tagName, t.branch === 'dev' || t.branch === 'main' || t.branch === 'master' || inUse || (title === "Releases" && idx === 0) || t.is_inactive)}
                                            </Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 2 }}>
                                                {t.branch && <span><strong>Branch:</strong> {t.branch}</span>}
                                                {t.source_feature && t.source_feature !== 'Unknown' && <span><strong>Feature:</strong> {t.source_feature}</span>}
                                                <span><strong>Author:</strong> {author}</span>
                                            </Typography>
                                        </Box>
                                        <Box sx={{ textAlign: 'right' }}>
                                            {created && created !== 'unknown' && (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                    Container Created: {new Date(created).toLocaleString()}
                                                </Typography>
                                            )}
                                            {t.branch_last_updated && (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                    Branch Updated: {new Date(t.branch_last_updated).toLocaleString()}
                                                </Typography>
                                            )}
                                            {!created && !t.branch_last_updated && (
                                                <Typography variant="caption" color="text.secondary">
                                                    Created: unknown
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                </Paper>
                            </Box>
                        );
                    })}
                </Stack>
            </Box>
        );
    };

    const activeBranchItems = [];
    const activeContainerItems = [];

    const checkActiveFilter = (item) => {
        const name = item.branch || item.tag || item.container_tag;
        if (isItemActiveTarget(name)) {
            activeContainerItems.push(item);
            return false;
        }
        return true;
    };

    const activeBranches = (project.inventory?.active_branches_without_containers || []).filter(b => {
        if (isItemActiveTarget(b.branch)) {
            activeBranchItems.push(b);
            return false;
        }
        return true;
    });

    const coreEnvironments = (project.inventory?.core_environments || []).filter(checkActiveFilter);
    const mainBranch = coreEnvironments.find(e => e.branch === 'main' || e.branch === 'master');
    const devBranch = coreEnvironments.find(e => e.branch === 'dev');

    const releases = (project.inventory?.releases || []).filter(checkActiveFilter);
    const preReleases = (project.inventory?.pre_releases || []).filter(checkActiveFilter);
    const features = (project.inventory?.features || []).filter(checkActiveFilter);
    const standalone = (project.inventory?.standalone_features || []).filter(c => c.active_deployments > 0).filter(checkActiveFilter);
    const inactiveReleases = (project.inventory?.inactive_releases || []).filter(checkActiveFilter);

    const isItemFound = activeBranchItems.length > 0 || activeContainerItems.length > 0;

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
                {isItemFound && (
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: activeTask?.status === 'FAILED' ? 'error.main' : 'info.main', fontWeight: 'bold' }}>
                            {activeTask?.status === 'FAILED' ? '🚨 Failed Release Target' : '🎯 Active Release Target(s)'}
                        </Typography>
                        <Stack spacing={1}>
                            {activeBranchItems.map(b => renderBranchCard(b))}
                            {activeContainerItems.length > 0 && renderContainerGroup(null, activeContainerItems, 'info.main', true)}
                        </Stack>
                    </Box>
                )}

                {(mainBranch || releases.length > 0) && (
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: 'success.main', fontWeight: 'bold' }}>🟢 Main Environment</Typography>
                        <Stack spacing={1}>
                            {mainBranch && renderBranchCard(mainBranch)}
                            {releases.length > 0 && renderContainerGroup("Releases", releases, 'success.main', true)}
                        </Stack>
                    </Box>
                )}

                {(devBranch || preReleases.length > 0) && (
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: 'warning.main', fontWeight: 'bold' }}>🟡 Dev Environment</Typography>
                        <Stack spacing={1}>
                            {devBranch && renderBranchCard(devBranch)}
                            {preReleases.length > 0 && renderContainerGroup("Pre-releases", preReleases, 'warning.main', true)}
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

                {renderContainerGroup("✨ Active Features", features, 'info.main')}
                {renderContainerGroup("👻 Standalone Containers (Branch Deleted)", standalone, 'error.main')}

                {inactiveReleases.length > 0 && (
                    <Accordion disableGutters elevation={0} sx={{
                        bgcolor: 'transparent',
                        '&:before': { display: 'none' },
                        mt: 4,
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon color="action" />}
                            sx={{
                                minHeight: '48px',
                                '& .MuiAccordionSummary-content': { my: 0 }
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <DeleteOutlineIcon fontSize="small" />
                                Inactive / Deleted Releases ({inactiveReleases.length})
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 2, pt: 0 }}>
                            {renderContainerGroup(null, inactiveReleases, 'text.disabled', true)}
                        </AccordionDetails>
                    </Accordion>
                )}

                {!project.inventory?.core_environments?.length && !project.inventory?.releases?.length && !project.inventory?.pre_releases?.length && !project.inventory?.features?.length && !(project.inventory?.standalone_features?.filter(c => c.active_deployments > 0)?.length) && !project.inventory?.active_branches_without_containers?.length && !project.inventory?.inactive_releases?.length && (
                    <Typography variant="body2" color="text.secondary">No branches or tags found.</Typography>
                )}
            </Stack>
        </Box>
    );
}