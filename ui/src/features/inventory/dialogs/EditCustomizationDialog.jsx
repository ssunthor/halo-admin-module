import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, MenuItem, Box, CircularProgress, Typography
} from '@mui/material';

const CATEGORY_OPTIONS = ['CUSTOMER', 'INTERNAL', 'INFRASTRUCTURE'];
const TIER_OPTIONS = ['UNKNOWN', 'DEV', 'SANDBOX', 'STAGING', 'ALPHA', 'PRODUCTION', 'SYSTEM_CORE'];
const POLICY_OPTIONS = ['MANUAL_ONLY', 'GATED_RELEASE', 'AUTO_LATEST'];

export default function EditCustomizationDialog({ open, onClose, tenantSlug, currentData, onSaveSuccess }) {
    const [formData, setFormData] = useState({
        tenant_category: '',
        tenant_tier: '',
        update_policy: '',
        owner: '',
        purpose: '',
        maintenance_window: '',
        configuration_payload: ''
    });
    
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open && currentData) {
            let payloadStr = '';
            if (typeof currentData.configuration_payload === 'object') {
                payloadStr = JSON.stringify(currentData.configuration_payload, null, 2);
            } else {
                payloadStr = currentData.configuration_payload || '';
            }

            setFormData({
                tenant_category: currentData.tenant_category || 'CUSTOMER',
                tenant_tier: currentData.tenant_tier || 'UNKNOWN',
                update_policy: currentData.update_policy || 'MANUAL_ONLY',
                owner: currentData.owner || 'UNASSIGNED',
                purpose: currentData.purpose || '',
                maintenance_window: currentData.maintenance_window || '',
                configuration_payload: payloadStr
            });
            setError('');
        }
    }, [open, currentData]);

    const handleChange = (field) => (event) => {
        setFormData({ ...formData, [field]: event.target.value });
    };

    const handleSave = async () => {
        setError('');
        
        // Validate JSON payload if not empty
        if (formData.configuration_payload.trim()) {
            try {
                JSON.parse(formData.configuration_payload);
            } catch (e) {
                setError('Invalid JSON in Configuration Payload');
                return;
            }
        }
        
        setIsSaving(true);
        try {
            const res = await fetch('/api/inventory/update-customization', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_slug: tenantSlug,
                    ...formData
                })
            });
            
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || data.message || 'Failed to update customization');
            }
            
            if (onSaveSuccess) {
                onSaveSuccess();
            }
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Tenant: {tenantSlug}</DialogTitle>
            <DialogContent dividers>
                {error && (
                    <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                        {error}
                    </Typography>
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        select
                        label="Category"
                        value={formData.tenant_category}
                        onChange={handleChange('tenant_category')}
                        fullWidth
                        size="small"
                    >
                        {CATEGORY_OPTIONS.map((opt) => (
                            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        label="Tier"
                        value={formData.tenant_tier}
                        onChange={handleChange('tenant_tier')}
                        fullWidth
                        size="small"
                    >
                        {TIER_OPTIONS.map((opt) => (
                            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        label="Update Policy"
                        value={formData.update_policy}
                        onChange={handleChange('update_policy')}
                        fullWidth
                        size="small"
                    >
                        {POLICY_OPTIONS.map((opt) => (
                            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        label="Owner"
                        value={formData.owner}
                        onChange={handleChange('owner')}
                        fullWidth
                        size="small"
                    />

                    <TextField
                        label="Purpose"
                        value={formData.purpose}
                        onChange={handleChange('purpose')}
                        fullWidth
                        size="small"
                    />

                    <TextField
                        label="Maintenance Window"
                        value={formData.maintenance_window}
                        onChange={handleChange('maintenance_window')}
                        fullWidth
                        size="small"
                        placeholder="e.g. Sat 02:00-04:00 UTC"
                    />

                    <TextField
                        label="Configuration Payload (JSON)"
                        value={formData.configuration_payload}
                        onChange={handleChange('configuration_payload')}
                        fullWidth
                        multiline
                        rows={4}
                        size="small"
                        placeholder="{}"
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit" disabled={isSaving}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" color="primary" disabled={isSaving}>
                    {isSaving ? <CircularProgress size={24} /> : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
