import React from 'react';
import { Box, Typography, Grid, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Card, CardContent, Chip, Tooltip, TextField } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const fetchDeviceDetails = async (deviceName) => {
    const res = await fetch(`/api/repository/device/${deviceName}`);
    if (!res.ok) throw new Error('Failed to fetch device details');
    const json = await res.json();
    return json.data;
};

const SectionCard = ({ title, children, fullWidth = false }) => (
    <Grid item xs={12} md={fullWidth ? 12 : 6}>
        <Card variant="outlined" sx={{ borderRadius: 2, height: '100%', borderColor: 'primary.dark', bgcolor: 'background.default', p: 0 }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="subtitle1" color="primary.main" textAlign="center" sx={{ mb: 1, fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: 0.5 }}>
                    {title}
                </Typography>
                <Grid container spacing={1}>
                    {children}
                </Grid>
            </CardContent>
        </Card>
    </Grid>
);

const DetailRow = ({ label, value }) => (
    <Grid item xs={12} sm={6}>
        <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5, mb: -0.5, display: 'block' }}>{label}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word', fontSize: '0.8rem' }}>
            {value !== undefined && value !== null && value !== '' ? value : <span style={{ color: 'gray', fontStyle: 'italic' }}>None</span>}
        </Typography>
    </Grid>
);

const AuditTooltip = ({ audit, children }) => {
    if (!audit || (!audit.segment_data && !audit.gnid_data)) return children;
    const content = (
        <Box sx={{ p: 1, width: 800 }}>
            <Grid container spacing={2}>
                {audit.segment_data && (
                    <Grid item xs={audit.gnid_data ? 6 : 12}>
                        <Typography variant="caption" fontWeight="bold" color="primary.light">Segment Data:</Typography>
                        <pre style={{ margin: 0, fontSize: '10px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(audit.segment_data, null, 2)}</pre>
                    </Grid>
                )}
                {audit.gnid_data && (
                    <Grid item xs={audit.segment_data ? 6 : 12}>
                        <Typography variant="caption" fontWeight="bold" color="primary.light">GNID Data:</Typography>
                        <pre style={{ margin: 0, fontSize: '10px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(audit.gnid_data, null, 2)}</pre>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
    return (
        <Tooltip 
            title={content} 
            arrow 
            placement="top" 
            disableInteractive={false}
            slotProps={{
                tooltip: {
                    sx: { maxWidth: 'none', bgcolor: 'background.paper', color: 'text.primary', border: '1px solid', borderColor: 'divider', boxShadow: 5 }
                },
                arrow: {
                    sx: { color: 'background.paper', "&::before": { border: '1px solid', borderColor: 'divider' } }
                }
            }}
        >
            <span style={{ borderBottom: '1px dotted', cursor: 'help' }}>{children}</span>
        </Tooltip>
    );
};

const AliasesEditor = ({ deviceName, aliases }) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(aliases ? aliases.join(', ') : '');
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (newAliases) => {
            const res = await fetch(`/api/repository/device/${deviceName}/aliases`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aliases: newAliases })
            });
            if (!res.ok) throw new Error('Failed to update aliases');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['deviceDetails', deviceName]);
            setIsEditing(false);
        }
    });

    const handleSave = () => {
        const newAliases = inputValue.split(',').map(s => s.trim()).filter(s => s.length > 0);
        mutation.mutate(newAliases);
    };

    if (isEditing) {
        return (
            <Box display="flex" alignItems="center" gap={1}>
                <TextField 
                    value={inputValue} 
                    onChange={e => setInputValue(e.target.value)} 
                    size="small"
                    placeholder="alias1, alias2"
                    variant="standard"
                    disabled={mutation.isPending}
                    InputProps={{ style: { fontSize: '0.8rem' } }}
                    sx={{ flexGrow: 1 }}
                />
                <Button size="small" onClick={handleSave} disabled={mutation.isPending} sx={{ minWidth: 'auto', p: 0.5 }}>Save</Button>
                <Button size="small" color="inherit" onClick={() => { setIsEditing(false); setInputValue(aliases ? aliases.join(', ') : ''); }} disabled={mutation.isPending} sx={{ minWidth: 'auto', p: 0.5 }}>Cancel</Button>
            </Box>
        );
    }

    return (
        <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word', fontSize: '0.8rem' }}>
                {aliases && aliases.length > 0 ? aliases.join(', ') : <span style={{ color: 'gray', fontStyle: 'italic' }}>None</span>}
            </Typography>
            <Button size="small" variant="text" sx={{ p: 0, minWidth: 0, fontSize: '0.7rem' }} onClick={() => setIsEditing(true)}>Edit</Button>
        </Box>
    );
};

export default function DeviceDetailsDialog({ deviceName, open, onClose }) {
    const { data: device, isLoading, isError } = useQuery({
        queryKey: ['deviceDetails', deviceName],
        queryFn: () => fetchDeviceDetails(deviceName),
        enabled: !!deviceName,
    });

    const netboxUrl = device ? (device.netbox_type === 'virtual_machine' 
        ? `https://netbox.gt-t.net/virtualization/virtual-machines/${device.netbox_id}/` 
        : `https://netbox.gt-t.net/dcim/devices/${device.netbox_id}/`) 
        : '#';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth PaperProps={{ sx: { borderRadius: 3, bgcolor: 'background.paper' } }}>
            <DialogTitle sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', pb: 2, pt: 3, px: 4 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Typography variant="h5" fontWeight="bold">Device Details: {deviceName}</Typography>
                        {device && device.netbox_id && (
                            <Tooltip title="View in Netbox" arrow>
                                <a href={netboxUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', color: '#90caf9', textDecoration: 'none' }}>
                                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                </a>
                            </Tooltip>
                        )}
                    </Box>
                    {device && (
                        <Chip 
                            label={device.status} 
                            color={device.status === 'active' ? 'success' : 'default'} 
                            variant="outlined"
                            sx={{ borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem', height: '24px', textTransform: 'uppercase', borderWidth: '1px', px: 0.5 }}
                        />
                    )}
                </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 2, bgcolor: 'background.paper' }}>
                {isLoading && (
                    <Box display="flex" justifyContent="center" alignItems="center" height="300px">
                        <CircularProgress size={30} />
                    </Box>
                )}
                {isError && (
                    <Typography color="error">Failed to load device details from Netbox.</Typography>
                )}
                {device && !isLoading && !isError && (
                    <Grid container spacing={2}>
                        <SectionCard title="General Info">
                            <DetailRow label="Netbox ID" value={device.netbox_id} />
                            <DetailRow label="Type" value={device.netbox_type} />
                            <DetailRow label="Role" value={device.role} />
                            <DetailRow label="Tenant Acronym" value={device.tenant_info?.acronym} />
                            <DetailRow label="Tenant Name" value={device.tenant_info?.name} />
                            <DetailRow label="Primary IP" value={device.primary_ip} />
                            <Grid item xs={12} sm={6}>
                                <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5, mb: -0.5, display: 'block' }}>Aliases</Typography>
                                <AliasesEditor deviceName={device.name} aliases={device.aliases} />
                            </Grid>
                        </SectionCard>

                        <SectionCard title="Location & Network">
                            <DetailRow label="Site" value={device.site?.name} />
                            <DetailRow label="Site Code" value={device.site?.code} />
                            <DetailRow label="Country" value={device.site?.country || device.country} />
                            <DetailRow label="Facility" value={device.site?.facility} />
                            <DetailRow label="CMD Fac ID" value={device.site?.cmd_fac_id} />
                            <DetailRow label="Category" value={device.site?.category} />
                            <DetailRow label="Address" value={device.site?.physical_address} />
                            <DetailRow label="Coordinates" value={(device.site?.latitude && device.site?.longitude) ? `${device.site.latitude}, ${device.site.longitude}` : null} />
                            <DetailRow label="Cluster" value={device.cluster_name} />
                            <DetailRow label="Site Status" value={device.site?.status} />
                        </SectionCard>

                        <SectionCard title="Hardware & OS">
                            <DetailRow label="Manufacturer" value={device.manufacturer} />
                            <DetailRow label="Model" value={device.model} />
                            <DetailRow label="Category" value={device.category} />
                            <DetailRow label="Platform" value={device.platform} />
                            <DetailRow label="OS Build" value={device.os_build} />
                            <DetailRow label="Serial" value={device.serial_number} />
                        </SectionCard>

                        <SectionCard title="CMD Audit & Validation">
                            <Grid item xs={12} sm={12}>
                                <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5, mb: -0.5, display: 'block' }}>Validation Status</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word', fontSize: '0.8rem' }}>
                                    {device.audit?.validation_status ? (
                                        <AuditTooltip audit={device.audit}>{device.audit.validation_status}</AuditTooltip>
                                    ) : <span style={{ color: 'gray', fontStyle: 'italic' }}>None</span>}
                                </Typography>
                            </Grid>
                            <DetailRow label="Segment ID" value={device.audit?.segment_id} />
                            <DetailRow label="Client Match" value={device.audit?.is_client_match ? 'True' : (device.audit?.is_client_match === false ? 'False' : null)} />
                            <DetailRow label="Address Match" value={device.audit?.is_address_match ? 'True' : (device.audit?.is_address_match === false ? 'False' : null)} />
                            <DetailRow label="CMD SLID" value={device.cmd?.slid} />
                            <DetailRow label="CMD GNID" value={device.cmd?.gnid} />
                            <DetailRow label="Audit Updated" value={device.audit?.updated_at} />
                        </SectionCard>

                        <SectionCard title="Tenant Details">
                            <DetailRow label="CMD Customer Group" value={device.tenant_info?.custom_fields?.cmd_cst_group} />
                            <DetailRow label="CMD Tier" value={device.tenant_info?.custom_fields?.cmd_cst_tier} />
                            <DetailRow label="CMD Status" value={device.tenant_info?.custom_fields?.cmd_cst_status} />
                            <DetailRow label="CMD Group ID" value={device.tenant_info?.custom_fields?.cmd_cst_group_id} />
                            <DetailRow label="CMD Legacy ID" value={device.tenant_info?.custom_fields?.cmd_cst_legacy_id} />
                            <DetailRow label="CMD Customer ID" value={device.tenant_info?.custom_fields?.cmd_cst_id} />
                        </SectionCard>

                        {((device.associated_ips?.length > 0) || (device.associated_prefixes?.length > 0)) && (
                            <SectionCard title="Networking (IPs & Prefixes)">
                                {device.associated_ips?.length > 0 && (
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>Associated IPs</Typography>
                                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                                            {device.associated_ips.map((ip, idx) => (
                                                <Chip key={idx} size="small" variant="outlined" sx={{ fontSize: '0.75rem', height: '20px' }} label={`${ip.interface_name || 'unknown'}: ${ip.address}`} />
                                            ))}
                                        </Box>
                                    </Grid>
                                )}
                                {device.associated_prefixes?.length > 0 && (
                                    <Grid item xs={12} sx={{ mt: 1 }}>
                                        <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>Associated Prefixes</Typography>
                                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                                            {device.associated_prefixes.map((pref, idx) => (
                                                <Chip key={idx} size="small" variant="outlined" sx={{ fontSize: '0.75rem', height: '20px' }} label={`${pref.prefix} (${pref.network_category})`} />
                                            ))}
                                        </Box>
                                    </Grid>
                                )}
                            </SectionCard>
                        )}

                        <SectionCard title="Configuration & Device Metadata" fullWidth={true}>
                            <DetailRow label="Active Config File" value={device.config?.filename} />
                            <DetailRow label="Latest Backup Sync" value={device.config?.history?.length > 0 ? device.config.history[0].created_at : null} />
                            <DetailRow label="Netbox Record Created" value={device.netbox_created_at} />
                            <DetailRow label="Netbox Record Updated" value={device.netbox_updated_at} />
                        </SectionCard>
                        
                        {(device.config?.history?.length > 0) && (
                            <SectionCard title="Configuration Backup History" fullWidth>
                                <Grid item xs={12}>
                                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'transparent' }}>
                                        <Table size="small">
                                            <TableHead sx={{ bgcolor: 'background.paper' }}>
                                                <TableRow>
                                                    <TableCell>Date</TableCell>
                                                    <TableCell>Type</TableCell>
                                                    <TableCell>File Path</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {device.config.history.map((cfg, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell>{cfg.date}</TableCell>
                                                        <TableCell>{cfg.type}</TableCell>
                                                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{cfg.path}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Grid>
                            </SectionCard>
                        )}
                    </Grid>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Button onClick={onClose} variant="contained" size="large">Close</Button>
            </DialogActions>
        </Dialog>
    );
}
