import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    Switch, FormControlLabel, Box, Typography, IconButton, Grid, MenuItem, Select,
    FormControl, InputLabel, Alert, Divider, Table, TableHead, TableRow, TableCell, TableBody
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useQuery } from '@tanstack/react-query';

const fetchGitOpsInventory = async () => {
    const res = await fetch('/api/gitops/inventory');
    if (!res.ok) throw new Error('Failed to fetch GitOps inventory');
    const json = await res.json();
    return json.data || { projects: [] };
};

export default function EditFeatureDialog({ open, onClose, feature, onSaveSuccess }) {
    const [formData, setFormData] = useState({});
    const [dependencies, setDependencies] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const { data: inventoryData, isLoading: isLoadingProjects } = useQuery({
        queryKey: ['gitopsInventory'],
        queryFn: fetchGitOpsInventory,
        staleTime: Infinity
    });

    const projects = (inventoryData?.projects || []).filter(p => p.type === 'APPLICATION');

    const getVersionsForProject = (projectPath) => {
        const proj = projects.find(p => p.path === projectPath);
        if (!proj || !proj.inventory) return [];
        
        const versions = new Set();
        const addVersions = (list) => {
            (list || []).forEach(item => {
                const tag = item.tag || item.container_tag;
                if (item.has_native_release && tag) {
                    let v = tag;
                    if (v.startsWith('v')) v = v.substring(1);
                    if (v.endsWith('-dev')) v = v.substring(0, v.length - 4);
                    versions.add(v);
                }
            });
        };
        
        addVersions(proj.inventory.releases);
        addVersions(proj.inventory.pre_releases);
        addVersions(proj.inventory.core_environments);
        
        return Array.from(versions).sort().reverse();
    };

    const PRODUCT_CATEGORIES = [
        "Defense Halo Detect",
        "Defense Halo Command",
        "Defense Halo Recon - Configuration",
        "Defense Halo Recon - CVE"
    ];

    useEffect(() => {
        if (feature) {
            setFormData({
                feature_name: feature.feature_name,
                description: feature.description || '',
                product_category: feature.product_category,
                ui_grouping: feature.ui_grouping,
                env_variable: feature.env_variable,
                is_paid_addon: feature.is_paid_addon,
                enabled_by_default: feature.enabled_by_default,
                pricing_tiers_json: feature.pricing_tiers_json
            });

            // Parse dependencies
            try {
                const depsObj = JSON.parse(feature.gitops_dependencies_json || '{}');
                const depsArray = Object.keys(depsObj).map(key => ({
                    project: key,
                    version: depsObj[key]
                }));
                setDependencies(depsArray);
            } catch (e) {
                setDependencies([]);
            }
        }
    }, [feature]);

    const handleChange = (e) => {
        const { name, value, checked, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleAddDependency = () => {
        setDependencies(prev => [...prev, { project: '', version: '>=v0.1.0' }]);
    };

    const handleRemoveDependency = (index) => {
        setDependencies(prev => prev.filter((_, i) => i !== index));
    };

    const handleDependencyChange = (index, field, value) => {
        setDependencies(prev => {
            const newDeps = [...prev];
            newDeps[index][field] = value;
            return newDeps;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        // Convert dependencies array back to JSON object
        const depsObj = {};
        dependencies.forEach(d => {
            if (d.project.trim()) {
                depsObj[d.project.trim()] = d.version.trim() || '*';
            }
        });

        const payload = {
            ...formData,
            gitops_dependencies_json: JSON.stringify(depsObj)
        };

        try {
            const res = await fetch('/api/configuration/features', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.detail || json.message || 'Failed to save feature');
            }
            onSaveSuccess();
            onClose();
        } catch (e) {
            setError(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const renderPricingTable = (jsonStr) => {
        if (!jsonStr || jsonStr === '{}') return <Typography variant="body2">No pricing tiers configured.</Typography>;
        try {
            const tiers = JSON.parse(jsonStr);
            const keys = Object.keys(tiers);
            if (keys.length === 0) return <Typography variant="body2">No pricing tiers configured.</Typography>;
            
            return (
                <Table size="small" sx={{ mt: 1, backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                    <TableHead sx={{ backgroundColor: 'background.default' }}>
                        <TableRow>
                            <TableCell><strong>Assets Range</strong></TableCell>
                            <TableCell><strong>Monthly Price</strong></TableCell>
                            <TableCell><strong>Install Price</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {keys.map(k => (
                            <TableRow key={k} hover>
                                <TableCell>{k}</TableCell>
                                <TableCell>${tiers[k].monthly}</TableCell>
                                <TableCell>${tiers[k].install}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            );
        } catch (e) {
            return <Typography variant="body2" color="error">Invalid JSON formatting</Typography>;
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Edit Feature: {feature?.feature_name}</DialogTitle>
            <DialogContent dividers>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Product Category</InputLabel>
                            <Select
                                name="product_category"
                                value={formData.product_category || ''}
                                label="Product Category"
                                onChange={handleChange}
                            >
                                {PRODUCT_CATEGORIES.map(cat => (
                                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                ))}
                                {/* Allow existing custom categories if any */}
                                {formData.product_category && !PRODUCT_CATEGORIES.includes(formData.product_category) && (
                                    <MenuItem value={formData.product_category}>{formData.product_category} (Legacy)</MenuItem>
                                )}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Feature Name"
                            name="feature_name"
                            value={formData.feature_name || ''}
                            onChange={handleChange}
                            margin="normal"
                        />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Environment Variable"
                            name="env_variable"
                            value={formData.env_variable || ''}
                            onChange={handleChange}
                            margin="normal"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="UI Grouping"
                            name="ui_grouping"
                            value={formData.ui_grouping || ''}
                            onChange={handleChange}
                            margin="normal"
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Description"
                            name="description"
                            value={formData.description || ''}
                            onChange={handleChange}
                            multiline
                            rows={2}
                            margin="normal"
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.enabled_by_default || false}
                                    onChange={handleChange}
                                    name="enabled_by_default"
                                    color="primary"
                                />
                            }
                            label="Enabled by Default"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.is_paid_addon || false}
                                    onChange={handleChange}
                                    name="is_paid_addon"
                                    color="warning"
                                />
                            }
                            label="Paid Add-on"
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                                GitOps Dependencies
                            </Typography>
                            <Button 
                                startIcon={<AddIcon />} 
                                size="small" 
                                variant="outlined"
                                onClick={handleAddDependency}
                            >
                                Add Dependency
                            </Button>
                        </Box>

                        {dependencies.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                No GitOps dependencies configured.
                            </Typography>
                        ) : (
                            dependencies.map((dep, index) => (
                                <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Project</InputLabel>
                                        <Select
                                            value={dep.project}
                                            label="Project"
                                            onChange={(e) => handleDependencyChange(index, 'project', e.target.value)}
                                        >
                                            {isLoadingProjects ? (
                                                <MenuItem value="" disabled>Loading...</MenuItem>
                                            ) : (
                                                projects.map(p => (
                                                    <MenuItem key={p.path} value={p.path}>{p.name}</MenuItem>
                                                ))
                                            )}
                                            {dep.project && !projects.find(p => p.path === dep.project) && (
                                                <MenuItem value={dep.project} disabled>
                                                    {dep.project.split('/').pop()} (Legacy)
                                                </MenuItem>
                                            )}
                                        </Select>
                                    </FormControl>
                                    
                                    <FormControl size="small" sx={{ minWidth: 150 }}>
                                        <InputLabel>Version</InputLabel>
                                        <Select
                                            value={dep.version}
                                            label="Version"
                                            onChange={(e) => handleDependencyChange(index, 'version', e.target.value)}
                                        >
                                            {getVersionsForProject(dep.project).map(v => (
                                                <MenuItem key={v} value={`>=v${v}`}>{`>=v${v}`}</MenuItem>
                                            ))}
                                            {dep.version && !getVersionsForProject(dep.project).some(v => `>=v${v}` === dep.version) && (
                                                <MenuItem value={dep.version}>{dep.version}</MenuItem>
                                            )}
                                        </Select>
                                    </FormControl>
                                    
                                    <IconButton color="error" onClick={() => handleRemoveDependency(index)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </Box>
                            ))
                        )}
                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            Pricing Configuration
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                            {renderPricingTable(formData.pricing_tiers_json)}
                        </Box>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2, pr: 3 }}>
                <Button onClick={onClose} disabled={isSaving}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Configuration'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
