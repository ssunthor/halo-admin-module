import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Typography, Box, IconButton, Tabs, Tab, Snackbar, Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AuditDetailsDialog from './AuditDetailsDialog';
import ReleaseProgressDialog from './ReleaseProgressDialog';
import ProjectChangelogTab from '../components/ProjectChangelogTab';
import ProjectDocsTab from '../components/ProjectDocsTab';
import ProjectGitOpsTab from '../components/ProjectGitOpsTab';
import ProjectAuditTab from '../components/ProjectAuditTab';
import { useQuery, useQueryClient } from '@tanstack/react-query';

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`project-tabpanel-${index}`}
            {...other}
            style={{ height: '100%', overflow: 'auto' }}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export default function ProjectDetailsDialog({ open, onClose, project }) {
    const [tabIndex, setTabIndex] = useState(2);
    const [selectedAuditLog, setSelectedAuditLog] = useState(null);
    const [releaseTaskId, setReleaseTaskId] = useState(null);
    const [showReleaseProgress, setShowReleaseProgress] = useState(false);

    const [snackbarState, setSnackbarState] = useState({ open: false, message: '', severity: 'error' });
    const handleSnackbarClose = () => setSnackbarState(prev => ({ ...prev, open: false }));
    const showError = (msg, severity = 'error') => setSnackbarState({ open: true, message: msg, severity });
    const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', onConfirm: null });

    const projectName = project?.name;
    const fullPath = project?.path || project?.fullPath || projectName;

    const handleConfirmClose = () => setConfirmState(prev => ({ ...prev, open: false }));

    const { data: activeTasksData, refetch: refetchTasks } = useQuery({
        queryKey: ['gitopsTasks', fullPath],
        queryFn: async () => {
            if (!fullPath) return null;
            const res = await fetch(`/api/gitops/tasks?project_name=${encodeURIComponent(fullPath)}`);
            if (!res.ok) {
                if (res.status === 404) return [];
                throw new Error('Failed to fetch tasks');
            }
            return res.json();
        },
        enabled: open && !!fullPath,
        refetchInterval: 3000
    });

    const { data: changelogData, isLoading: changelogLoading } = useQuery({
        queryKey: ['gitopsChangelog', projectName],
        queryFn: async () => {
            if (!projectName) return null;
            const res = await fetch(`/api/gitops/changelog/${projectName}`);
            if (!res.ok) throw new Error('Failed to fetch changelog');
            const json = await res.json();
            return json.data;
        },
        enabled: open && !!projectName && tabIndex === 0
    });

    const { data: docsData, isLoading: docsLoading } = useQuery({
        queryKey: ['gitopsDocs', projectName],
        queryFn: async () => {
            if (!projectName) return null;
            const res = await fetch(`/api/gitops/documentation/${projectName}`);
            if (!res.ok) throw new Error('Failed to fetch documentation');
            const json = await res.json();
            return json.data;
        },
        enabled: open && !!projectName && tabIndex === 1
    });

    const { data: auditLogs, isLoading: auditLogsLoading } = useQuery({
        queryKey: ['gitopsAudit', fullPath],
        queryFn: async () => {
            if (!fullPath) return null;
            const res = await fetch(`/api/gitops/audit?project_name=${encodeURIComponent(fullPath)}`);
            if (!res.ok) throw new Error('Failed to fetch audit logs');
            const json = await res.json();
            return json.data;
        },
        enabled: open && !!fullPath && (tabIndex === 2 || tabIndex === 3)
    });

    // Take the most recent task state purely from the Redis backend. 
    // We intentionally removed the auditLogs cross-overwrite here to prevent new retries from falsely snapping to 'FAILED'.
    let activeTask = activeTasksData?.tasks?.[0];

    const handleTriggerRelease = async (sourceBranch, targetBranch, isAlreadyMerged) => {
        const title = 'Confirm Release';
        const message = isAlreadyMerged
            ? `Warning: The branch ${sourceBranch} seems to be already merged. Do you want to proceed with a release anyway?`
            : `Are you sure you want to merge and release ${sourceBranch} to ${targetBranch}?`;

        setConfirmState({
            open: true,
            title,
            message,
            onConfirm: async () => {
                setConfirmState(prev => ({ ...prev, open: false }));
                try {
                    const res = await fetch('/api/gitops/release', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            project_name: fullPath,
                            source_branch: sourceBranch,
                            target_branch: targetBranch,
                            author: user?.full_name || user?.display_name || user?.username || 'Unknown'
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        setReleaseTaskId(data.task_id);
                        setShowReleaseProgress(true);
                        refetchTasks();
                    } else {
                        showError("Failed to start release task");
                    }
                } catch (e) {
                    showError("Error triggering release: " + e.message);
                }
            }
        });
    };

    const handleTriggerRetry = async (pipelineId, mergeId) => {
        setConfirmState({
            open: true,
            title: 'Confirm Retry',
            message: 'Are you sure you want to retry this release pipeline?',
            onConfirm: async () => {
                setConfirmState(prev => ({ ...prev, open: false }));
                try {
                    const res = await fetch('/api/gitops/retry', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            project_name: fullPath,
                            pipeline_id: parseInt(pipelineId) || 0,
                            merge_id: parseInt(mergeId) || 0,
                            author: user?.full_name || user?.display_name || user?.username || 'Unknown'
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        setReleaseTaskId(data.task_id);
                        setShowReleaseProgress(true);
                        refetchTasks();
                    } else {
                        showError("Failed to start retry task");
                    }
                } catch (err) {
                    showError("Error triggering retry: " + err.message);
                }
            }
        });
    };

    const { data: user } = useQuery({ queryKey: ['user'] });
    const queryClient = useQueryClient();

    const handleTriggerDelete = (branchName, containerTag) => {
        const targetName = branchName || containerTag;
        setConfirmState({
            open: true,
            title: 'Confirm Deletion',
            message: `Are you sure you want to delete ${targetName}? This action cannot be undone.`,
            onConfirm: async () => {
                setConfirmState(prev => ({ ...prev, open: false }));
                showError(`Deleting ${targetName}...`, 'info');
                try {
                    const res = await fetch('/api/gitops/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            project_name: fullPath,
                            branch_name: branchName || "",
                            container_tag: containerTag || "",
                            author: user?.full_name || user?.display_name || user?.username || "Unknown"
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        showError(`Successfully deleted ${targetName}.`, 'success');
                        queryClient.invalidateQueries({ queryKey: ['gitopsInventory'] });
                        queryClient.invalidateQueries({ queryKey: ['gitopsAudit'] });
                    } else {
                        showError(`Failed to delete ${targetName}.`);
                    }
                } catch (e) {
                    showError("Error triggering deletion: " + e.message);
                }
            }
        });
    };

    if (!project) return null;

    let latestChangelogVersion = null;
    if (changelogData && changelogData.length > 0) {
        latestChangelogVersion = changelogData[0].version;
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { height: '85vh' } }}>
            <DialogTitle sx={{ p: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 1 }}>
                    <Box>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Inventory2Icon color="primary" />
                            {project.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                            {project.path || project.fullPath}
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
                </Box>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
                    <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} textColor="primary" indicatorColor="primary">
                        <Tab label="CHANGELOG" />
                        <Tab label="DOCUMENTATION" />
                        <Tab label="GITOPS" />
                        <Tab label="AUDIT" />
                    </Tabs>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
                <TabPanel value={tabIndex} index={0}>
                    <ProjectChangelogTab changelogData={changelogData} isLoading={changelogLoading} />
                </TabPanel>

                <TabPanel value={tabIndex} index={1}>
                    <ProjectDocsTab docsData={docsData} isLoading={docsLoading} latestChangelogVersion={latestChangelogVersion} />
                </TabPanel>

                <TabPanel value={tabIndex} index={2}>
                    <ProjectGitOpsTab
                        project={project}
                        auditLogs={auditLogs}
                        activeTask={activeTask}
                        handleTriggerRelease={handleTriggerRelease}
                        handleTriggerRetry={handleTriggerRetry}
                        handleTriggerDelete={handleTriggerDelete}
                        setSelectedAuditLog={setSelectedAuditLog}
                        setReleaseTaskId={setReleaseTaskId}
                        setShowReleaseProgress={setShowReleaseProgress}
                    />
                </TabPanel>

                <TabPanel value={tabIndex} index={3}>
                    <ProjectAuditTab
                        auditLogs={auditLogs}
                        isLoading={auditLogsLoading}
                        onShowAuditDetails={setSelectedAuditLog}
                    />
                </TabPanel>
            </DialogContent>

            {selectedAuditLog && (
                <AuditDetailsDialog
                    open={!!selectedAuditLog}
                    onClose={() => setSelectedAuditLog(null)}
                    auditData={selectedAuditLog}
                    project={project}
                    onRetry={(task_id) => {
                        setSelectedAuditLog(null);
                        setReleaseTaskId(task_id);
                        setShowReleaseProgress(true);
                        refetchTasks();
                    }}
                />
            )}

            <Snackbar open={snackbarState.open} autoHideDuration={6000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleSnackbarClose} severity={snackbarState.severity} sx={{ width: '100%', variant: 'filled' }}>
                    {snackbarState.message}
                </Alert>
            </Snackbar>

            <ReleaseProgressDialog
                open={showReleaseProgress}
                onClose={() => {
                    setShowReleaseProgress(false);
                    refetchTasks();
                }}
                taskId={releaseTaskId}
                project={projectName}
            />

            <Dialog open={confirmState.open} onClose={handleConfirmClose} maxWidth="xs" fullWidth>
                <DialogTitle>{confirmState.title}</DialogTitle>
                <DialogContent>
                    <Typography>{confirmState.message}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleConfirmClose} color="inherit">Cancel</Button>
                    <Button onClick={confirmState.onConfirm} color="primary" variant="contained" disableElevation>Confirm</Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
}