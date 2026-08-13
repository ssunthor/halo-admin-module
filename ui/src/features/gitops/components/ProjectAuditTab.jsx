import React, { useState } from 'react';
import { 
    Box, Typography, Table, TableBody, TableCell, TableContainer, 
    TableHead, TableRow, Paper, Chip, IconButton, TablePagination,
    TextField, InputAdornment, Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';

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

export default function ProjectAuditTab({ auditLogs, isLoading, onShowAuditDetails }) {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [searchTerm, setSearchTerm] = useState('');

    if (isLoading) {
        return <Typography sx={{ p: 3 }}>Loading audit logs...</Typography>;
    }

    if (!auditLogs || auditLogs.length === 0) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">No audit logs found for this project.</Typography>
            </Box>
        );
    }

    const filteredLogs = auditLogs.filter(log => {
        const term = searchTerm.toLowerCase();
        return (
            log.id?.toString().toLowerCase().includes(term) ||
            log.version_tag?.toString().toLowerCase().includes(term) ||
            log.action?.toString().toLowerCase().includes(term) ||
            log.actor?.toString().toLowerCase().includes(term) ||
            log.source_branch?.toString().toLowerCase().includes(term) ||
            log.target_branch?.toString().toLowerCase().includes(term) ||
            log.status?.toString().toLowerCase().includes(term)
        );
    });

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const paginatedLogs = filteredLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    Project Audit History
                </Typography>
                <TextField
                    size="small"
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        )
                    }}
                    sx={{ width: 300 }}
                />
            </Box>
            
            <TableContainer component={Paper} variant="outlined" sx={{ flexGrow: 1, borderLeft: 'none', borderRight: 'none', borderRadius: 0 }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Version</TableCell>
                            <TableCell>MR</TableCell>
                            <TableCell>Action</TableCell>
                            <TableCell>Actor</TableCell>
                            <TableCell>Path (Src &rarr; Tgt)</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Method</TableCell>
                            <TableCell align="center">Details</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedLogs.map((log) => {
                            const path = (log.source_branch || 'N/A') + (log.target_branch ? ` ➔ ${log.target_branch}` : '');
                            
                            return (
                                <TableRow key={log.id} hover>
                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                        {log.id?.substring(0, 8)}
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        {new Date(log.timestamp || log.created_at).toLocaleString()}
                                    </TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                        {log.version_tag || 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        {log.merge_request_id || 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={log.action} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                                    </TableCell>
                                    <TableCell>{log.actor || 'Unknown'}</TableCell>
                                    <TableCell sx={{ maxWidth: 200, wordBreak: 'break-word', whiteSpace: 'normal' }}>
                                        {path}
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            icon={getStatusIcon(log.status)} 
                                            label={log.status || 'UNKNOWN'} 
                                            size="small" 
                                            color={getStatusColor(log.status)} 
                                            variant="outlined" 
                                            sx={{ height: 20, fontSize: '0.7rem' }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.75rem' }}>
                                        {log.triggered_by || log.method || log.changelog_generation_method || 'N/A'}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="View Details">
                                            <IconButton size="small" onClick={() => onShowAuditDetails([log])}>
                                                <FactCheckIcon fontSize="small" color="info" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {paginatedLogs.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={10} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                    No audit logs match your search.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            
            <TablePagination
                rowsPerPageOptions={[15, 30, 50, 100]}
                component="div"
                count={filteredLogs.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                sx={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
            />
        </Box>
    );
}
