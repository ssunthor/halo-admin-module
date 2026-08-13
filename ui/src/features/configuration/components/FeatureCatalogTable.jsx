import React, { useState } from 'react';
import { 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
    Chip, IconButton, Tooltip, Box, Typography 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditFeatureDialog from '../dialogs/EditFeatureDialog.jsx';
import { useQueryClient } from '@tanstack/react-query';

export default function FeatureCatalogTable({ features }) {
    const queryClient = useQueryClient();
    const [editFeature, setEditFeature] = useState(null);

    const handleEditClick = (feature) => {
        setEditFeature(feature);
    };

    const handleCloseEdit = () => {
        setEditFeature(null);
    };

    const handleSaveSuccess = () => {
        queryClient.invalidateQueries(['featureCatalog']);
    };

    const formatPricingTiers = (jsonStr) => {
        if (!jsonStr || jsonStr === '{}') return "None";
        try {
            const tiers = JSON.parse(jsonStr);
            const keys = Object.keys(tiers);
            if (keys.length === 0) return "None";
            
            // Find min and max monthly price ignoring 0
            let min = Infinity;
            let max = -Infinity;
            keys.forEach(k => {
                if (tiers[k].monthly !== undefined && tiers[k].monthly > 0) {
                    if (tiers[k].monthly < min) min = tiers[k].monthly;
                    if (tiers[k].monthly > max) max = tiers[k].monthly;
                }
            });
            
            if (min === Infinity) return "Custom";
            if (min === max) return `$${min}/mo`;
            return `$${min} - $${max}/mo`;
        } catch (e) {
            return "Invalid JSON";
        }
    };

    const formatGitOpsDeps = (jsonStr) => {
        if (!jsonStr || jsonStr === '{}') return "None";
        try {
            const deps = JSON.parse(jsonStr);
            const keys = Object.keys(deps);
            if (keys.length === 0) return "None";
            if (keys.length === 1) {
                const basename = keys[0].split('/').pop();
                return `${basename} ${deps[keys[0]]}`;
            }
            return `${keys.length} Dependencies`;
        } catch (e) {
            return "Invalid JSON";
        }
    };

    return (
        <>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                    <TableHead sx={{ backgroundColor: 'background.default' }}>
                        <TableRow>
                            <TableCell align="left" sx={{ width: '25%' }}><strong>Feature Name</strong></TableCell>
                            <TableCell align="left" sx={{ width: '15%' }}><strong>UI Grouping</strong></TableCell>
                            <TableCell align="left" sx={{ width: '25%' }}><strong>Env Variable</strong></TableCell>
                            <TableCell align="left" sx={{ width: '12%' }}><strong>Configuration</strong></TableCell>
                            <TableCell align="left" sx={{ width: '18%' }}><strong>Dependencies</strong></TableCell>
                            <TableCell align="center" sx={{ width: '5%' }}><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {features.map((feature) => (
                            <TableRow key={feature.id} hover>
                                <TableCell align="left">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2">{feature.feature_name}</Typography>
                                        <Tooltip title={feature.description || 'No description'}>
                                            <InfoIcon fontSize="small" color="disabled" />
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                                <TableCell align="left">
                                    <Chip label={feature.ui_grouping || 'Uncategorized'} size="small" variant="outlined" />
                                </TableCell>
                                <TableCell align="left">
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'info.main' }}>
                                        {feature.env_variable}
                                    </Typography>
                                </TableCell>
                                <TableCell align="left">
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                                        {feature.enabled_by_default && (
                                            <Tooltip title="Enabled by default">
                                                <Chip icon={<CheckCircleIcon />} label="Default" size="small" color="success" />
                                            </Tooltip>
                                        )}
                                        {feature.is_paid_addon && (
                                            <Tooltip title={`Pricing: ${formatPricingTiers(feature.pricing_tiers_json)}`}>
                                                <Chip icon={<AttachMoneyIcon />} label="Paid Addon" size="small" color="warning" />
                                            </Tooltip>
                                        )}
                                    </Box>
                                </TableCell>
                                <TableCell align="left">
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                                        {formatGitOpsDeps(feature.gitops_dependencies_json) !== "None" && (
                                            <Tooltip title={`GitOps Deps: ${feature.gitops_dependencies_json}`}>
                                                <Chip label={`Deps: ${formatGitOpsDeps(feature.gitops_dependencies_json)}`} size="small" />
                                            </Tooltip>
                                        )}
                                    </Box>
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton size="small" onClick={() => handleEditClick(feature)} color="primary">
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {editFeature && (
                <EditFeatureDialog 
                    open={!!editFeature} 
                    onClose={handleCloseEdit} 
                    feature={editFeature} 
                    onSaveSuccess={handleSaveSuccess} 
                />
            )}
        </>
    );
}
