import React, { useMemo, useState } from 'react';
import { Box, Typography, Chip, Stack, Accordion, AccordionSummary, AccordionDetails, Tooltip, Tabs, Tab, Paper } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import AssessmentIcon from '@mui/icons-material/Assessment';

const renderItemWithNeedsDocs = (itemString) => {
    const needsDocsTag = '[NEEDS_DOCS]';
    if (!itemString.includes(needsDocsTag)) return itemString;

    const parts = itemString.split(needsDocsTag);
    const result = [];
    parts.forEach((part, index) => {
        if (part) result.push(<span key={`text-${index}`}>{part}</span>);
        if (index < parts.length - 1) {
            result.push(
                <Tooltip title="Documentation for this feature is pending" key={`icon-${index}`} placement="right">
                    <LibraryBooksIcon color="info" sx={{ fontSize: '0.9rem', ml: 0.8, verticalAlign: 'text-bottom', cursor: 'help' }} />
                </Tooltip>
            );
        }
    });
    return <>{result}</>;
};

function ChangelogViewer({ versions, isPopup = false }) {
    const [activeTab, setActiveTab] = useState('ALL');

    if (!versions || versions.length === 0) return <Typography>No changelog data available.</Typography>;

    const getCategoryIcon = (catString) => {
        const match = catString.match(/^[^\w\s]+/);
        return match ? match[0] : '📌';
    };

    const latestDate = useMemo(() => {
        return versions.reduce((latest, current) => (current.date > latest ? current.date : latest), versions[0].date);
    }, [versions]);

    const availableModules = useMemo(() => {
        const modules = new Map();
        versions.forEach(v => {
            const id = v.id || 'SYS';
            if (!modules.has(id)) modules.set(id, v.service || 'System Updates');
        });
        return Array.from(modules.entries()).map(([id, service]) => ({ id, service }));
    }, [versions]);

    const filteredVersions = useMemo(() => {
        if (isPopup || activeTab === 'ALL') return versions;
        return versions.filter(v => (v.id || 'SYS') === activeTab);
    }, [versions, activeTab, isPopup]);

    const categoryTotals = useMemo(() => {
        const totals = { total: 0, categories: {} };
        filteredVersions.forEach(v => {
            if (v.changes) {
                v.changes.forEach(c => {
                    const count = c.items ? c.items.length : 0;
                    totals.total += count;
                    totals.categories[c.category] = (totals.categories[c.category] || 0) + count;
                });
            }
        });
        return totals;
    }, [filteredVersions]);

    const groupedByMonth = useMemo(() => {
        if (activeTab !== 'ALL' && !isPopup) return [];
        const groups = {};
        
        filteredVersions.forEach(v => {
            const dateParts = v.date.split('-');
            const year = dateParts[0];
            const monthNum = parseInt(dateParts[1], 10);
            const dateObj = new Date(year, monthNum - 1);
            const monthYear = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
            
            const sortKey = `${year}-${dateParts[1]}`;

            if (!groups[monthYear]) groups[monthYear] = { month: monthYear, sortKey, releases: [], stats: {} };
            groups[monthYear].releases.push(v);

            if (v.changes) {
                v.changes.forEach(c => {
                    const count = c.items ? c.items.length : 0;
                    groups[monthYear].stats[c.category] = (groups[monthYear].stats[c.category] || 0) + count;
                });
            }
        });
        return Object.values(groups).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    }, [filteredVersions, activeTab, isPopup]);

    const groupedByVersion = useMemo(() => {
        if (activeTab === 'ALL' || isPopup) return [];
        const groups = {};
        
        filteredVersions.forEach(v => {
            const parts = v.version.split('.');
            const versionGroup = parts.length >= 2 ? `Version ${parts[0]}.${parts[1]}.x` : `Version ${v.version}`;
            
            if (!groups[versionGroup]) groups[versionGroup] = { versionGroup, releases: [], stats: {} };
            groups[versionGroup].releases.push(v);

            if (v.changes) {
                v.changes.forEach(c => {
                    const count = c.items ? c.items.length : 0;
                    groups[versionGroup].stats[c.category] = (groups[versionGroup].stats[c.category] || 0) + count;
                });
            }
        });
        return Object.values(groups);
    }, [filteredVersions, activeTab, isPopup]);

    const renderStatBadges = (stats) => {
        return Object.entries(stats).map(([cat, count]) => (
            <Tooltip title={`${count} items in ${cat}`} key={cat}>
                <Chip size="small" label={`${getCategoryIcon(cat)} ${count}`} sx={{ bgcolor: 'background.paper', fontWeight: 'bold', border: '1px solid', borderColor: 'divider', fontSize: '0.75rem' }} />
            </Tooltip>
        ));
    };

    const renderChanges = (changes) => (
        <Box sx={{ pt: 1 }}>
            {changes && changes.map((category, catIndex) => (
                <Box key={catIndex} sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {category.category}
                    </Typography>
                    <Stack spacing={1}>
                        {category.items.map((item, itemIndex) => (
                            <Stack direction="row" spacing={1} alignItems="flex-start" key={itemIndex}>
                                <CheckCircleIcon color="disabled" sx={{ fontSize: 16, mt: 0.3 }} />
                                <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{renderItemWithNeedsDocs(item)}</Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Box>
            ))}
        </Box>
    );

    return (
        <Box>
            {!isPopup && availableModules.length > 1 && (
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
                        <Tab label="All Updates" value="ALL" />
                        {availableModules.map(mod => (
                            <Tab key={mod.id} label={mod.id} value={mod.id} title={mod.service} />
                        ))}
                    </Tabs>
                </Box>
            )}

            {!isPopup && (
                <Paper sx={{ mb: 3, p: 2, borderLeft: '4px solid', borderColor: 'primary.main', bgcolor: 'background.paper', backgroundImage: 'none' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AssessmentIcon color="primary" fontSize="small" /> Total Delivery
                        </Typography>
                        <Chip label={`Total: ${categoryTotals.total} items`} size="small" sx={{ bgcolor: 'primary.main', color: 'background.default', fontWeight: 'bold' }} />
                    </Box>
                    <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', gap: 2 }}>
                        {Object.entries(categoryTotals.categories).map(([cat, count]) => {
                            const icon = getCategoryIcon(cat);
                            const text = cat.replace(/^[^\w\s]+/, '').trim();
                            return (
                                <Box key={cat} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography sx={{ fontSize: '1.4rem' }}>{icon}</Typography>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                            {text}
                                        </Typography>
                                        <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1 }}>
                                            {count}
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Stack>
                </Paper>
            )}

            {(isPopup || activeTab === 'ALL') && groupedByMonth.map((group, groupIndex) => (
                <Accordion key={group.month} defaultExpanded={groupIndex === 0} sx={{ mb: 2, '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'rgba(0,0,0,0.2)', borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%', pr: 2 }}>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ letterSpacing: 1 }}>{group.month}</Typography>
                            <Stack direction="row" spacing={1}>{renderStatBadges(group.stats)}</Stack>
                        </Stack>
                    </AccordionSummary>
                    
                    <AccordionDetails sx={{ p: 0, bgcolor: 'background.default' }}>
                        {group.releases.map((release, rIndex) => {
                            const vStats = {};
                            if (release.changes) release.changes.forEach(c => { vStats[c.category] = c.items ? c.items.length : 0; });
                            
                            const isLatest = release.date === latestDate;

                            return (
                                <Accordion key={`${release.id}-${release.version}`} defaultExpanded={isLatest} elevation={0} square sx={{ '&:before': { display: 'none' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'action.hover' }}>
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%', pr: 2 }}>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Chip label={release.id} size="small" color="primary" variant="outlined" sx={{ height: 22, fontSize: '0.75rem', fontWeight: 'bold', borderWidth: 2 }} />
                                                <Typography variant="subtitle1" fontWeight="bold">Version {release.version}</Typography>
                                                <Typography variant="caption" color="text.secondary">{release.date}</Typography>
                                            </Stack>
                                            <Stack direction="row" spacing={1}>{renderStatBadges(vStats)}</Stack>
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ p: 3 }}>
                                        {renderChanges(release.changes)}
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })}
                    </AccordionDetails>
                </Accordion>
            ))}

            {!isPopup && activeTab !== 'ALL' && groupedByVersion.map((group, groupIndex) => (
                <Accordion key={group.versionGroup} defaultExpanded={groupIndex === 0} sx={{ mb: 1, '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'action.hover' }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%', pr: 2 }}>
                            <Typography variant="h6">{group.versionGroup}</Typography>
                            <Stack direction="row" spacing={1}>{renderStatBadges(group.stats)}</Stack>
                        </Stack>
                    </AccordionSummary>

                    <AccordionDetails sx={{ p: 0 }}>
                        {group.releases.map((release, rIndex) => {
                            const vStats = {};
                            if (release.changes) release.changes.forEach(c => { vStats[c.category] = c.items ? c.items.length : 0; });
                            
                            const isFirst = groupIndex === 0 && rIndex === 0;

                            return (
                                <Accordion key={release.version} defaultExpanded={isFirst} elevation={0} square sx={{ '&:before': { display: 'none' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'background.default' }}>
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%', pr: 2 }}>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Typography variant="subtitle1" fontWeight="bold">Version {release.version}</Typography>
                                                <Chip label={release.date} size="small" variant="outlined" />
                                            </Stack>
                                            <Stack direction="row" spacing={1}>{renderStatBadges(vStats)}</Stack>
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ p: 3 }}>
                                        {renderChanges(release.changes)}
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })}
                    </AccordionDetails>
                </Accordion>
            ))}
        </Box>
    );
}

export default ChangelogViewer;