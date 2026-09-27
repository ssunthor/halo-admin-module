import React, { useState, useMemo } from 'react';
import { Box, Typography, Chip, CircularProgress, Tooltip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, InputAdornment, Grid, MenuItem, TablePagination, TableSortLabel, Checkbox } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import SearchIcon from '@mui/icons-material/Search';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DeviceDetailsDialog from './DeviceDetailsDialog.jsx';

const fetchTenants = async () => {
    const res = await fetch('/api/repository/tenants');
    if (!res.ok) throw new Error('Failed to fetch tenants');
    const json = await res.json();
    return json.data || [];
};

const StyledChip = ({ label, color }) => (
    <Chip 
        size="small" 
        variant="outlined" 
        label={label} 
        color={color} 
        sx={{ 
            borderRadius: '4px', 
            fontWeight: 'bold', 
            fontSize: '0.65rem',
            height: '20px',
            textTransform: 'uppercase',
            borderWidth: '1px',
            px: 0.5
        }} 
    />
);

const getDeviceIssues = (dev) => {
    const issues = [];
    if (dev.category === 'unknown') issues.push('Unknown Category');
    if (!dev.has_ip) issues.push('Missing IP Address');
    if (!dev.site_code) issues.push('Missing Site Code');
    if (dev.audit_status && dev.audit_status.includes("Mismatch")) {
        issues.push('CMD Data Mismatch');
    }
    if (dev.audit_status && dev.audit_status.includes("Not Found")) {
        issues.push('Not Found in CMD');
    }
    return issues;
};

export default function RepositoryDashboard() {
    const { data: tenants, isLoading, isError, error } = useQuery({
        queryKey: ['repositoryTenants'],
        queryFn: fetchTenants
    });

    const [selectedDeviceName, setSelectedDeviceName] = useState(null);
    const [filterAcronym, setFilterAcronym] = useState('');
    const [filterDevice, setFilterDevice] = useState('');
    const [filterSite, setFilterSite] = useState('');
    const [filterCountry, setFilterCountry] = useState([]);
    
    const [filterStatus, setFilterStatus] = useState([]);
    const [filterIP, setFilterIP] = useState('');
    const [filterConfig, setFilterConfig] = useState('');
    const [filterIssues, setFilterIssues] = useState('');

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(250);
    
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    // Reset pagination when filters change
    React.useEffect(() => {
        setPage(0);
    }, [filterAcronym, filterDevice, filterSite, filterCountry, filterStatus, filterIP, filterConfig, filterIssues]);

    const allDevices = useMemo(() => {
        if (!tenants) return [];
        return tenants.flatMap(t => 
            (t.devices || []).map(d => ({
                ...d,
                tenant_acronym: t.acronym
            }))
        );
    }, [tenants]);

    const uniqueStatuses = useMemo(() => {
        const statuses = new Set();
        allDevices.forEach(d => {
            if (d.status) statuses.add(d.status);
        });
        return Array.from(statuses).sort();
    }, [allDevices]);

    const uniqueCountries = useMemo(() => {
        const countries = new Set();
        allDevices.forEach(d => {
            if (d.country) countries.add(d.country);
        });
        return Array.from(countries).sort();
    }, [allDevices]);

    const filteredDevices = useMemo(() => {
        let result = allDevices.filter(dev => {
            const matchAcronym = filterAcronym === '' || dev.tenant_acronym === filterAcronym;
            const matchDevice = filterDevice === '' || (dev.name && dev.name.toLowerCase().includes(filterDevice.toLowerCase()));
            const matchSite = filterSite === '' || (dev.site_code && dev.site_code.toLowerCase().includes(filterSite.toLowerCase()));
            const matchCountry = filterCountry.length === 0 || filterCountry.includes(dev.country);
            
            const matchStatus = filterStatus.length === 0 || filterStatus.includes(dev.status);
            const matchIP = filterIP === '' || (filterIP === 'yes' ? dev.has_ip : !dev.has_ip);
            const matchConfig = filterConfig === '' || (filterConfig === 'yes' ? dev.has_config : !dev.has_config);
            
            const issues = getDeviceIssues(dev);
            const hasIssues = issues.length > 0;
            const matchIssues = filterIssues === '' || (filterIssues === 'yes' ? hasIssues : !hasIssues);
            
            return matchAcronym && matchDevice && matchSite && matchCountry && matchStatus && matchIP && matchConfig && matchIssues;
        });
        
        result.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            
            if (sortConfig.key === 'issues') {
                valA = getDeviceIssues(a).length;
                valB = getDeviceIssues(b).length;
            } else {
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [allDevices, filterAcronym, filterDevice, filterSite, filterCountry, filterStatus, filterIP, filterConfig, filterIssues, sortConfig]);

    if (isLoading) {
        return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
    }

    if (isError) {
        return <Typography color="error">Error loading repository data: {error.message}</Typography>;
    }
    
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <Box sx={{ p: 2 }}>
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, borderColor: 'divider', bgcolor: 'background.default' }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={2}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="Tenant Acronym"
                            value={filterAcronym}
                            onChange={(e) => setFilterAcronym(e.target.value)}
                        >
                            <MenuItem value=""><em>All Tenants</em></MenuItem>
                            {tenants?.map(t => (
                                <MenuItem key={t.slug} value={t.acronym}>
                                    {t.acronym}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Device Name..."
                            value={filterDevice}
                            onChange={(e) => setFilterDevice(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Site Code..."
                            value={filterSite}
                            onChange={(e) => setFilterSite(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <TextField 
                            select 
                            fullWidth 
                            size="small" 
                            label="Country" 
                            value={filterCountry} 
                            onChange={(e) => {
                                const { value } = e.target;
                                setFilterCountry(typeof value === 'string' ? value.split(',') : value);
                            }}
                            InputLabelProps={{ shrink: true }}
                            SelectProps={{
                                multiple: true,
                                renderValue: (selected) => {
                                    if (selected.length === 0) return <em>All</em>;
                                    if (selected.length === 1) return selected[0];
                                    return `${selected.length} Selected`;
                                },
                                displayEmpty: true,
                                MenuProps: {
                                    PaperProps: { sx: { maxWidth: 350 } },
                                    MenuListProps: { sx: { display: 'flex', flexWrap: 'wrap' } }
                                }
                            }}
                        >
                            <MenuItem disabled value="" sx={{ display: 'none' }}>
                                <em>All</em>
                            </MenuItem>
                            {uniqueCountries.map(c => (
                                <MenuItem key={c} value={c} sx={{ px: 1, width: '25%' }}>
                                    <Checkbox checked={filterCountry.indexOf(c) > -1} size="small" sx={{ p: 0.5, mr: 0.5 }} />
                                    {c}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={1}>
                        <TextField 
                            select 
                            fullWidth 
                            size="small" 
                            label="Status" 
                            value={filterStatus} 
                            onChange={(e) => {
                                const { value } = e.target;
                                setFilterStatus(typeof value === 'string' ? value.split(',') : value);
                            }}
                            InputLabelProps={{ shrink: true }}
                            SelectProps={{
                                multiple: true,
                                renderValue: (selected) => {
                                    if (selected.length === 0) return <em>All</em>;
                                    if (selected.length === 1) return selected[0].charAt(0).toUpperCase() + selected[0].slice(1);
                                    return `${selected.length} Selected`;
                                },
                                displayEmpty: true
                            }}
                        >
                            <MenuItem disabled value="" sx={{ display: 'none' }}>
                                <em>All</em>
                            </MenuItem>
                            {uniqueStatuses.map(s => (
                                <MenuItem key={s} value={s} sx={{ px: 1 }}>
                                    <Checkbox checked={filterStatus.indexOf(s) > -1} size="small" sx={{ p: 0.5, mr: 0.5 }} />
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={1}>
                        <TextField select fullWidth size="small" label="IP" value={filterIP} onChange={(e) => setFilterIP(e.target.value)}>
                            <MenuItem value=""><em>All</em></MenuItem>
                            <MenuItem value="yes">Yes</MenuItem>
                            <MenuItem value="no">No</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={1}>
                        <TextField select fullWidth size="small" label="Config" value={filterConfig} onChange={(e) => setFilterConfig(e.target.value)}>
                            <MenuItem value=""><em>All</em></MenuItem>
                            <MenuItem value="yes">Backed Up</MenuItem>
                            <MenuItem value="no">Missing</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={1}>
                        <TextField select fullWidth size="small" label="Issues" value={filterIssues} onChange={(e) => setFilterIssues(e.target.value)}>
                            <MenuItem value=""><em>All</em></MenuItem>
                            <MenuItem value="no">Healthy</MenuItem>
                            <MenuItem value="yes">Has Issues</MenuItem>
                        </TextField>
                    </Grid>
                </Grid>
            </Paper>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: 'background.default' }}>
                        <TableRow>
                            <TableCell>
                                <TableSortLabel active={sortConfig.key === 'tenant_acronym'} direction={sortConfig.direction} onClick={() => handleSort('tenant_acronym')}>
                                    Tenant
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel active={sortConfig.key === 'name'} direction={sortConfig.direction} onClick={() => handleSort('name')}>
                                    Device Name
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel active={sortConfig.key === 'category'} direction={sortConfig.direction} onClick={() => handleSort('category')}>
                                    Category
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel active={sortConfig.key === 'status'} direction={sortConfig.direction} onClick={() => handleSort('status')}>
                                    Status
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel active={sortConfig.key === 'has_ip'} direction={sortConfig.direction} onClick={() => handleSort('has_ip')}>
                                    IP Address
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel active={sortConfig.key === 'has_config'} direction={sortConfig.direction} onClick={() => handleSort('has_config')}>
                                    Config
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel active={sortConfig.key === 'country'} direction={sortConfig.direction} onClick={() => handleSort('country')}>
                                    Country
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel active={sortConfig.key === 'site_code'} direction={sortConfig.direction} onClick={() => handleSort('site_code')}>
                                    Site Code
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel active={sortConfig.key === 'issues'} direction={sortConfig.direction} onClick={() => handleSort('issues')}>
                                    Issues / Flags
                                </TableSortLabel>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredDevices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(dev => {
                            const issues = getDeviceIssues(dev);
                            return (
                                <TableRow key={dev.id} hover onClick={() => setSelectedDeviceName(dev.name)} sx={{ cursor: 'pointer' }}>
                                    <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>{dev.tenant_acronym}</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>{dev.name}</TableCell>
                                    <TableCell>
                                        <StyledChip label={dev.category} color={dev.category === 'unknown' ? 'error' : 'info'} />
                                    </TableCell>
                                    <TableCell>
                                        <StyledChip label={dev.status} color={dev.status === 'active' ? 'success' : 'default'} />
                                    </TableCell>
                                    <TableCell>
                                        <StyledChip label={dev.has_ip ? 'Yes' : 'No'} color={dev.has_ip ? 'success' : 'error'} />
                                    </TableCell>
                                    <TableCell>
                                        <StyledChip label={dev.has_config ? 'Backed Up' : 'Missing'} color={dev.has_config ? 'success' : 'warning'} />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 500 }}>{dev.country || 'UNK'}</TableCell>
                                    <TableCell sx={{ fontWeight: 500 }}>{dev.site_code || '-'}</TableCell>
                                    <TableCell>
                                        {issues.length > 0 ? (
                                            <Tooltip title={issues.join(', ')}>
                                                <Chip 
                                                    size="small" 
                                                    icon={<WarningAmberIcon sx={{ fontSize: '1rem' }} />} 
                                                    label={`${issues.length} Issues`} 
                                                    color="warning" 
                                                    variant="outlined"
                                                    sx={{ borderRadius: '4px', fontWeight: 'bold', height: '22px' }}
                                                />
                                            </Tooltip>
                                        ) : (
                                            <Chip size="small" label="Healthy" color="success" variant="outlined" sx={{ borderRadius: '4px', height: '22px', borderStyle: 'dashed' }} />
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {filteredDevices.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>No devices found matching your filters.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[50, 100, 250, 500, 1000]}
                    component="div"
                    count={filteredDevices.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    sx={{ borderTop: '1px solid', borderColor: 'divider' }}
                />
            </TableContainer>

            <DeviceDetailsDialog 
                deviceName={selectedDeviceName} 
                open={!!selectedDeviceName} 
                onClose={() => setSelectedDeviceName(null)} 
            />
        </Box>
    );
}
