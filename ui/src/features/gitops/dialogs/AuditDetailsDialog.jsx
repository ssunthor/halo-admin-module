import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Typography, Box, IconButton, Table, TableHead, TableRow, TableCell, TableBody,
    Paper, Chip, Grid, Link, Accordion, AccordionSummary, AccordionDetails, Snackbar, Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const getStatusIcon = (s) => {
    if (s?.toLowerCase() === 'success') return <CheckCircleIcon color="success" fontSize="small" />;
    if (s?.toLowerCase() === 'failed' || s?.toLowerCase() === 'error') return <ErrorIcon color="error" fontSize="small" />;
    return <PendingIcon color="warning" fontSize="small" />;
};

const getStatusColor = (s) => {
    if (s?.toLowerCase() === 'success') return 'success';
    if (s?.toLowerCase() === 'failed' || s?.toLowerCase() === 'error') return 'error';
    return 'warning';
};

import ReplayIcon from '@mui/icons-material/Replay';

function AuditAccordion({ audit, defaultExpanded, project, onRetry, setConfirmState, showError }) {
    const {
        id, timestamp, source_branch, target_branch, merge_request_id,
        version_tag, action, actor, status, error_message, job_details_json
    } = audit;

    const jobs = job_details_json?.jobs || [];
    const footprint = job_details_json?.footprint_mb;
    const pipeline_id = job_details_json?.pipeline_id || audit.pipeline_id;
    const traceLogs = job_details_json?.trace_logs || [];

    const handleRetry = (e) => {
        e.stopPropagation();
        setConfirmState({
            open: true,
            title: 'Confirm Retry',
            message: 'Are you sure you want to retry this release pipeline?',
            onConfirm: async () => {
                setConfirmState(prev => ({ ...prev, open: false }));
                try {
                    const fullPath = project?.path || project?.fullPath || project?.name;
                    const res = await fetch('/api/gitops/retry', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            project_name: fullPath,
                            pipeline_id: parseInt(pipeline_id) || 0,
                            merge_id: parseInt(merge_request_id) || 0,
                            author: 'GIA AI Bot'
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        if (onRetry) onRetry(data.task_id);
                    } else {
                        showError("Failed to start retry task");
                    }
                } catch (err) {
                    showError("Error triggering retry: " + err.message);
                }
            }
        });
    };

    return (
        <Accordion defaultExpanded={defaultExpanded} variant="outlined" sx={{ mb: 2, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography variant="subtitle1" sx={{ fontFamily: 'monospace' }}>
                        {new Date(timestamp).toLocaleString()}
                    </Typography>
                    <Chip 
                        icon={getStatusIcon(status)} 
                        label={status} 
                        size="small" 
                        color={getStatusColor(status)} 
                        variant="outlined" 
                    />
                    <Chip label={action} size="small" />
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', mr: 2, fontFamily: 'monospace' }}>
                        ID: {id?.substring(0, 8)}
                    </Typography>
                    {(status?.toLowerCase() === 'failed' || status?.toLowerCase() === 'error') && (
                        <Button 
                            variant="outlined" 
                            color="warning" 
                            size="small" 
                            startIcon={<ReplayIcon />}
                            onClick={handleRetry}
                            disabled={!pipeline_id && !merge_request_id}
                        >
                            Retry
                        </Button>
                    )}
                </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 2, pt: 0 }}>
                <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Release Information</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2"><strong>Version:</strong></Typography>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{version_tag || 'N/A'}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2"><strong>Action:</strong></Typography>
                                    <Chip label={action} size="small" variant="outlined" color="primary" />
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2"><strong>Status:</strong></Typography>
                                    <Chip 
                                        icon={getStatusIcon(status)} 
                                        label={status} 
                                        size="small" 
                                        color={getStatusColor(status)} 
                                        variant="outlined" 
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2"><strong>Actor:</strong></Typography>
                                    <Typography variant="body2">{actor || 'Unknown'}</Typography>
                                </Box>
                            </Box>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Git Details</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2"><strong>Source:</strong></Typography>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{source_branch || 'N/A'}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2"><strong>Target:</strong></Typography>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{target_branch || 'N/A'}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2"><strong>MR ID:</strong></Typography>
                                    <Typography variant="body2">{merge_request_id ? `!${merge_request_id}` : 'N/A'}</Typography>
                                </Box>
                                {footprint != null && (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2"><strong>Footprint:</strong></Typography>
                                        <Typography variant="body2" color="info.main">{footprint} MB</Typography>
                                    </Box>
                                )}
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>

                {error_message && (
                    <Paper variant="outlined" sx={{ p: 2, mb: 3, borderColor: 'error.main', bgcolor: 'rgba(211, 47, 47, 0.05)' }}>
                        <Typography variant="subtitle2" color="error.main" gutterBottom>Error Message</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{error_message}</Typography>
                    </Paper>
                )}

                {jobs.length > 0 && (
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>Pipeline Jobs</Typography>
                        <Table size="small" component={Paper} variant="outlined" sx={{ '& th': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Job Name</TableCell>
                                    <TableCell>Stage</TableCell>
                                    <TableCell>Duration</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Link</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {jobs.map((job) => (
                                    <TableRow key={job.id}>
                                        <TableCell sx={{ fontFamily: 'monospace' }}>{job.name}</TableCell>
                                        <TableCell>{job.stage}</TableCell>
                                        <TableCell>{job.duration ? `${job.duration.toFixed(1)}s` : 'N/A'}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {getStatusIcon(job.status)}
                                                <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                                                    {job.status}
                                                    {job.allow_failure && job.status?.toLowerCase() === 'failed' && (
                                                        <span style={{ color: '#ed6c02', marginLeft: '4px' }}>(allowed to fail)</span>
                                                    )}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">
                                            {job.web_url && (
                                                <Link href={job.web_url} target="_blank" rel="noopener noreferrer">
                                                    <IconButton size="small" sx={{ p: 0.5 }}>
                                                        <OpenInNewIcon fontSize="small" color="primary" />
                                                    </IconButton>
                                                </Link>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}
                
                {traceLogs.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>Orchestration Trace Logs</Typography>
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: '#1e1e1e', color: '#d4d4d4', overflowX: 'auto' }}>
                            <Box sx={{ fontFamily: 'monospace', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {traceLogs.map((log, idx) => {
                                    if (typeof log === 'string') {
                                        return <Typography key={idx} variant="inherit" sx={{ whiteSpace: 'pre-wrap' }}>{log}</Typography>;
                                    }
                                    if (log && typeof log === 'object') {
                                        const color = log.success === false ? '#f44336' : (log.success === true ? '#4caf50' : 'inherit');
                                        return (
                                            <Typography key={idx} variant="inherit" sx={{ color, whiteSpace: 'pre-wrap' }}>
                                                [{log.stage || 'INFO'}] {log.message || JSON.stringify(log)}
                                            </Typography>
                                        );
                                    }
                                    return null;
                                })}
                            </Box>
                        </Paper>
                    </Box>
                )}
            </AccordionDetails>
        </Accordion>
    );
}

export default function AuditDetailsDialog({ open, onClose, auditData, project, onRetry }) {
    const [confirmState, setConfirmState] = React.useState({ open: false, title: '', message: '', onConfirm: null });
    const handleConfirmClose = () => setConfirmState(prev => ({ ...prev, open: false }));

    const [snackbarState, setSnackbarState] = React.useState({ open: false, message: '', severity: 'error' });
    const handleSnackbarClose = () => setSnackbarState(prev => ({ ...prev, open: false }));
    const showError = (msg) => setSnackbarState({ open: true, message: msg, severity: 'error' });

    if (!auditData || auditData.length === 0) return null;

    const version_tag = auditData[0]?.version_tag || 'N/A';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ p: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FactCheckIcon color="primary" />
                            Git Release Audit Details ({version_tag})
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 3, pt: 2 }}>
                {auditData.map((audit, index) => (
                    <AuditAccordion 
                        key={audit.id || index} 
                        audit={audit} 
                        defaultExpanded={auditData.length === 1 || index === 0} 
                        project={project}
                        onRetry={onRetry}
                        setConfirmState={setConfirmState}
                        showError={showError}
                    />
                ))}
            </DialogContent>

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

            <Snackbar open={snackbarState.open} autoHideDuration={6000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleSnackbarClose} severity={snackbarState.severity} sx={{ width: '100%', variant: 'filled' }}>
                    {snackbarState.message}
                </Alert>
            </Snackbar>
        </Dialog>
    );
}
