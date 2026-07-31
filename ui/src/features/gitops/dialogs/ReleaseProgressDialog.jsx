import React, { useEffect, useRef, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Typography, Box, IconButton, CircularProgress, Chip, Stack,
    FormControlLabel, Switch
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TerminalIcon from '@mui/icons-material/Terminal';

export default function ReleaseProgressDialog({ open, onClose, taskId, project }) {
    const [logs, setLogs] = useState([]);
    const [status, setStatus] = useState('RUNNING');
    const [showDebug, setShowDebug] = useState(false);
    const logsEndRef = useRef(null);

    useEffect(() => {
        if (!open || !taskId) return;

        setLogs([]);
        setStatus('RUNNING');

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/gitops/tasks/${taskId}/logs`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setLogs(data.logs || []);
                        setStatus(data.status);

                        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
                            clearInterval(interval);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch logs", e);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [open, taskId]);

    if (!taskId) return null;

    const getStatusColor = (s) => {
        if (s === 'COMPLETED' || s === 'SUCCESS') return 'success.main';
        if (s === 'FAILED') return 'error.main';
        return 'info.main';
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
            <DialogTitle sx={{ p: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TerminalIcon color="primary" />
                            Release Progress
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                            {project} | Task ID: {taskId.substring(0, 8)}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <FormControlLabel
                            control={<Switch size="small" checked={showDebug} onChange={(e) => setShowDebug(e.target.checked)} />}
                            label={<Typography variant="caption" color="text.secondary">Debug Logs</Typography>}
                            sx={{ m: 0 }}
                        />
                        {status === 'RUNNING' && <CircularProgress size={20} />}
                        <Chip 
                            label={status} 
                            size="small" 
                            sx={{ bgcolor: getStatusColor(status), color: '#fff', fontWeight: 'bold' }} 
                        />
                        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
                    </Box>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 0, bgcolor: '#0a0a0a' }}>
                <Box sx={{ 
                    height: '500px', 
                    overflowY: 'auto', 
                    p: 2, 
                    fontFamily: 'monospace', 
                    fontSize: '0.85rem',
                    color: '#c9d1d9'
                }}>
                    <Stack spacing={0.5}>
                        {logs.filter(log => {
                            if (showDebug) return true;
                            let msg = typeof log === 'string' ? log : log.message;
                            if (msg?.startsWith('      [') && msg?.includes('] ')) return false;
                            return true;
                        }).map((log, i) => {
                            let msg = typeof log === 'string' ? log : log.message;
                            let isErr = msg?.toLowerCase().includes('failed') || msg?.toLowerCase().includes('error');
                            let color = log.success === false || isErr ? '#ff7b72' : (log.success === true ? '#3fb950' : '#c9d1d9');
                            
                            return (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                    <span style={{ color: '#8b949e', whiteSpace: 'nowrap' }}>
                                        {log.ts ? new Date(log.ts * 1000).toLocaleTimeString() : ''}
                                    </span>
                                    <Typography variant="body2" sx={{ fontFamily: 'inherit', color, whiteSpace: 'pre-wrap' }}>
                                        {msg}
                                    </Typography>
                                </Box>
                            );
                        })}
                        <div ref={logsEndRef} />
                    </Stack>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Close Background Dialog</Button>
            </DialogActions>
        </Dialog>
    );
}