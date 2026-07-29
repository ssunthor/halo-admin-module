import React, { useMemo, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert, Stack, Chip, Accordion, AccordionSummary, AccordionDetails, Tooltip, TablePagination, FormControl, InputLabel, Select, MenuItem, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import AssessmentIcon from '@mui/icons-material/Assessment';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useQuery } from '@tanstack/react-query';

function getWeekNumber(dateStr) {
    const d = new Date(dateStr);
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return { year: d.getUTCFullYear(), week: weekNo };
}

const getCategoryIcon = (catString) => {
    const match = catString.match(/^[^\w\s]+/);
    return match ? match[0] : '📌';
};

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

export default function GitOpsReleasesWidget() {
    const [page, setPage] = useState(0);
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedAuthor, setSelectedAuthor] = useState('');

    const { data: versions, isLoading, error } = useQuery({
        queryKey: ['gitops_releases_all'],
        queryFn: async () => {
            const response = await fetch('/api/gitops/releases');
            if (!response.ok) throw new Error('Could not fetch releases');
            return response.json();
        },
        refetchInterval: 60000 // 1 minute to reflect UI actions quickly, but backend is cached for 15m
    });

    const { uniqueProjects, uniqueAuthors } = useMemo(() => {
        if (!versions) return { uniqueProjects: [], uniqueAuthors: [] };
        const projects = new Set();
        const authors = new Set();
        versions.forEach(v => {
            if (v.id) projects.add(v.id);
            if (v.author) authors.add(v.author);
        });
        return { 
            uniqueProjects: Array.from(projects).sort(), 
            uniqueAuthors: Array.from(authors).sort() 
        };
    }, [versions]);

    const filteredVersions = useMemo(() => {
        if (!versions) return [];
        return versions.filter(v => {
            if (selectedProject && v.id !== selectedProject) return false;
            if (selectedAuthor && v.author !== selectedAuthor) return false;
            return true;
        });
    }, [versions, selectedProject, selectedAuthor]);

    const groupedByWeek = useMemo(() => {
        if (!filteredVersions) return [];
        const groups = {};
        
        filteredVersions.forEach(v => {
            const { year, week } = getWeekNumber(v.date);
            const weekKey = `Week ${week}, ${year}`;
            const sortKey = `${year}-${String(week).padStart(2, '0')}`;

            if (!groups[weekKey]) groups[weekKey] = { weekKey, sortKey, year, week, releases: [], stats: {}, totalItems: 0 };
            groups[weekKey].releases.push(v);

            if (v.changes) {
                v.changes.forEach(c => {
                    const count = c.items ? c.items.length : 0;
                    groups[weekKey].stats[c.category] = (groups[weekKey].stats[c.category] || 0) + count;
                    groups[weekKey].totalItems += count;
                });
            }
        });
        return Object.values(groups).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    }, [filteredVersions]);

    const globalTotals = useMemo(() => {
        if (!filteredVersions) return { total: 0, categories: {} };
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

    const hasData = groupedByWeek && groupedByWeek.length > 0;
    const totalPages = hasData ? groupedByWeek.length : 0;
    const currentWeekGroup = hasData ? (groupedByWeek[page] || groupedByWeek[0]) : { weekKey: '', sortKey: '', year: 0, week: 0, stats: {}, totalItems: 0, releases: [] };

    const availableYears = useMemo(() => {
        if (!hasData) return [];
        return Array.from(new Set(groupedByWeek.map(g => g.year)));
    }, [groupedByWeek, hasData]);

    const weeksInSelectedYear = useMemo(() => {
        if (!hasData) return [];
        return groupedByWeek.filter(g => g.year === currentWeekGroup.year);
    }, [groupedByWeek, currentWeekGroup.year, hasData]);

    if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error" sx={{ mt: 2 }}>Error loading releases: {error.message}</Alert>;

    const handleYearChange = (e) => {
        const newYear = e.target.value;
        const firstIdx = groupedByWeek.findIndex(g => g.year === newYear);
        if (firstIdx !== -1) setPage(firstIdx);
    };

    const handleWeekChange = (e) => {
        const newSortKey = e.target.value;
        const idx = groupedByWeek.findIndex(g => g.sortKey === newSortKey);
        if (idx !== -1) setPage(idx);
    };

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
        <Box sx={{ pt: 1 }}>
            {/* Filters & Pagination Top */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Project Filter</InputLabel>
                        <Select
                            value={selectedProject}
                            label="Project Filter"
                            onChange={(e) => { setSelectedProject(e.target.value); setPage(0); }}
                        >
                            <MenuItem value=""><em>All Projects</em></MenuItem>
                            {uniqueProjects.map(app => (
                                <MenuItem key={app} value={app}>{app}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Author Filter</InputLabel>
                        <Select
                            value={selectedAuthor}
                            label="Author Filter"
                            onChange={(e) => { setSelectedAuthor(e.target.value); setPage(0); }}
                        >
                            <MenuItem value=""><em>All Authors</em></MenuItem>
                            {uniqueAuthors.map(author => (
                                <MenuItem key={author} value={author}>{author}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                {hasData && (
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h6" fontWeight="bold" sx={{ mr: 2 }}>{currentWeekGroup.weekKey}</Typography>
                        <IconButton onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                            <NavigateBeforeIcon />
                        </IconButton>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                                value={currentWeekGroup.sortKey || ''}
                                onChange={handleWeekChange}
                                sx={{ fontWeight: 'bold' }}
                                MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
                            >
                                {weeksInSelectedYear.map(group => (
                                    <MenuItem key={group.sortKey} value={group.sortKey}>Week {group.week}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <Select
                                value={currentWeekGroup.year || ''}
                                onChange={handleYearChange}
                                sx={{ fontWeight: 'bold' }}
                                MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
                            >
                                {availableYears.map(yr => (
                                    <MenuItem key={yr} value={yr}>{yr}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <IconButton onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                            <NavigateNextIcon />
                        </IconButton>
                    </Stack>
                )}
            </Box>

            {hasData ? (
                <>
                    {/* Global Stats Banner */}
                    <Paper sx={{ mb: 4, p: 2, borderLeft: '4px solid', borderColor: 'primary.main', bgcolor: 'background.paper', backgroundImage: 'none' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AssessmentIcon color="primary" fontSize="small" /> Ecosystem Velocity
                            </Typography>
                            <Stack direction="row" spacing={2}>
                                <Chip label={`Selected Week: ${currentWeekGroup.totalItems} updates`} size="small" sx={{ bgcolor: 'secondary.main', color: 'background.default', fontWeight: 'bold' }} />
                                <Chip label={`All-Time: ${globalTotals.total} updates`} size="small" sx={{ bgcolor: 'primary.main', color: 'background.default', fontWeight: 'bold' }} />
                            </Stack>
                        </Box>
                <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', gap: 2 }}>
                    {Object.entries(globalTotals.categories).map(([cat, count]) => {
                        const icon = getCategoryIcon(cat);
                        const text = cat.replace(/^[^\w\s]+/, '').trim();
                        const currentCount = currentWeekGroup.stats[cat] || 0;
                        return (
                            <Box key={cat} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography sx={{ fontSize: '1.4rem' }}>{icon}</Typography>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                        {text}
                                    </Typography>
                                    <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1 }}>
                                        {currentCount} <Typography component="span" variant="body2" color="text.secondary" sx={{ fontWeight: 'normal' }}>({count})</Typography>
                                    </Typography>
                                </Box>
                            </Box>
                        );
                    })}
                </Stack>
            </Paper>

            {/* Releases List */}
            <Box sx={{ mb: 4 }}>
                {currentWeekGroup.releases.map((release, rIndex) => {
                    const vStats = {};
                    if (release.changes) release.changes.forEach(c => { vStats[c.category] = c.items ? c.items.length : 0; });
                    
                    const isLatest = rIndex === 0;

                    return (
                        <Accordion key={`${release.id}-${release.version}-${rIndex}`} defaultExpanded={isLatest} elevation={0} square sx={{ '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', mb: 1, borderRadius: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'action.hover' }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%', pr: 2 }}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Chip label={release.id || 'SYS'} size="small" color="primary" variant="outlined" sx={{ height: 22, fontSize: '0.75rem', fontWeight: 'bold', borderWidth: 2 }} />
                                        <Typography variant="subtitle1" fontWeight="bold">Version {release.version}</Typography>
                                        <Typography variant="caption" color="text.secondary">{release.date}</Typography>
                                        {release.author && (
                                            <Typography variant="caption" color="info.main" sx={{ fontStyle: 'italic', ml: 1 }}>by {release.author}</Typography>
                                        )}
                                    </Stack>
                                    <Stack direction="row" spacing={1}>{renderStatBadges(vStats)}</Stack>
                                </Stack>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 3, bgcolor: 'background.default' }}>
                                {renderChanges(release.changes)}
                            </AccordionDetails>
                        </Accordion>
                    );
                })}
            </Box>

            {/* Pagination Bottom */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <IconButton onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                        <NavigateBeforeIcon />
                    </IconButton>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                            value={currentWeekGroup.sortKey || ''}
                            onChange={handleWeekChange}
                            sx={{ fontWeight: 'bold' }}
                            MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
                        >
                            {weeksInSelectedYear.map(group => (
                                <MenuItem key={group.sortKey} value={group.sortKey}>Week {group.week}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <Select
                            value={currentWeekGroup.year || ''}
                            onChange={handleYearChange}
                            sx={{ fontWeight: 'bold' }}
                            MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
                        >
                            {availableYears.map(yr => (
                                <MenuItem key={yr} value={yr}>{yr}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <IconButton onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                        <NavigateNextIcon />
                    </IconButton>
                </Stack>
            </Box>
                </>
            ) : (
                <Typography sx={{ mt: 4, textAlign: 'center', color: 'text.secondary' }}>No releases match the selected filters.</Typography>
            )}
        </Box>
    );
}
