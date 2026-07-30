import React, { useState, useRef, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Typography, Box, IconButton, Tabs, Tab, CircularProgress, Stack, Paper, Chip, Tooltip, Table, TableHead, TableRow, TableCell, TableBody
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import StorageIcon from '@mui/icons-material/Storage';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Alert } from '@mui/material';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

const MermaidBlock = ({ code }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current && code) {
            const id = 'mermaid-' + Math.random().toString(36).substring(2, 10);
            mermaid.render(id, code).then(({ svg }) => {
                if (ref.current) ref.current.innerHTML = svg;
            }).catch(e => {
                console.error('Mermaid render error', e);
                if (ref.current) ref.current.innerHTML = `<pre>${code}</pre>`;
            });
        }
    }, [code]);
    return <Box ref={ref} sx={{ display: 'flex', justifyContent: 'center', my: 2, bgcolor: 'background.default', p: 2, borderRadius: 1 }} />;
};

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`project-tabpanel-${index}`}
            {...other}
            style={{ height: '100%', overflow: 'auto' }}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export default function ProjectDetailsDialog({ open, onClose, project }) {
    const [tabIndex, setTabIndex] = useState(2); // Default to GitOps tab

    const projectName = project?.name;

    const { data: changelogData, isLoading: changelogLoading } = useQuery({
        queryKey: ['gitopsChangelog', projectName],
        queryFn: async () => {
            if (!projectName) return null;
            const res = await fetch(`/api/gitops/changelog/${projectName}`);
            if (!res.ok) throw new Error('Failed to fetch changelog');
            const json = await res.json();
            return json.data;
        },
        enabled: open && !!projectName && tabIndex === 0
    });

    const { data: docsData, isLoading: docsLoading } = useQuery({
        queryKey: ['gitopsDocs', projectName],
        queryFn: async () => {
            if (!projectName) return null;
            const res = await fetch(`/api/gitops/documentation/${projectName}`);
            if (!res.ok) throw new Error('Failed to fetch documentation');
            const json = await res.json();
            return json.data;
        },
        enabled: open && !!projectName && tabIndex === 1
    });

    if (!project) return null;

    let latestChangelogVersion = null;
    if (changelogData && changelogData.length > 0) {
        latestChangelogVersion = changelogData[0].version;
    }

    const tooltipProps = {
        arrow: true,
        placement: 'top',
        PopperProps: { sx: { '& .MuiTooltip-tooltip': { maxWidth: 'none', bgcolor: '#0a0e1a', border: '1px solid #333', boxShadow: 6, borderRadius: 2 } } }
    };

    const buildNamespacesTooltip = (namespaces) => {
        if (!namespaces || namespaces.length === 0) return null;
        
        const chunked = [];
        for (let i = 0; i < namespaces.length; i += 4) {
            chunked.push(namespaces.slice(i, i + 4));
        }

        return (
            <Box sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, pb: 1, borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }}>
                    <InfoOutlinedIcon fontSize="small" /> Active Namespaces
                </Typography>
                <Table size="small" sx={{ '& td': { color: '#a9b3c1', py: 0.5, px: 2, whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.05)' } }}>
                    <TableBody>
                        {chunked.map((row, rIdx) => (
                            <TableRow key={rIdx} sx={{ '&:last-child td': { borderBottom: 'none' } }}>
                                {row.map((ns, cIdx) => (
                                    <TableCell key={cIdx} sx={{ fontFamily: 'monospace', borderRight: cIdx < row.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                                        {ns}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Box>
        );
    };

    const renderContainerGroup = (title, items, borderColor) => {
        if (!items || items.length === 0) return null;
        
        return (
            <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>{title}</Typography>
                <Stack spacing={1}>
                    {items.map((t, idx) => {
                        const tagName = t.tag || t.container_tag;
                        const activeDeployments = t.active_deployments || 0;
                        const inUse = activeDeployments > 0;
                        const author = t.author || t.branch_author || 'Unknown';
                        const created = t.created_at || t.container_created;
                        
                        return (
                            <Paper key={idx} sx={{ p: 1.5, borderLeft: 4, borderColor }} variant="outlined">
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                            <StorageIcon fontSize="inherit" color="action" />
                                            <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                                                {tagName}
                                            </Typography>
                                            {inUse && (
                                                <Tooltip title={t.active_namespaces?.length > 0 ? buildNamespacesTooltip(t.active_namespaces) : ''} {...tooltipProps}>
                                                    <Chip size="small" label={`Active Deployments: ${activeDeployments}`} color="success" sx={{ height: 20, fontSize: '0.7rem', bgcolor: 'rgba(46, 125, 50, 0.1)' }} variant="outlined" />
                                                </Tooltip>
                                            )}
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 2 }}>
                                            {t.branch && <span><strong>Branch:</strong> {t.branch}</span>}
                                            {t.source_feature && t.source_feature !== 'Unknown' && <span><strong>Feature:</strong> {t.source_feature}</span>}
                                            <span><strong>Author:</strong> {author}</span>
                                        </Typography>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                        {created ? new Date(created).toLocaleString() : 'unknown'}
                                    </Typography>
                                </Box>
                            </Paper>
                        );
                    })}
                </Stack>
            </Box>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { height: '85vh' } }}>
            <DialogTitle sx={{ p: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 1 }}>
                    <Box>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Inventory2Icon color="primary" />
                            {project.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                            {project.path || project.fullPath}
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
                </Box>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
                    <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} textColor="primary" indicatorColor="primary">
                        <Tab label="CHANGELOG" />
                        <Tab label="DOCUMENTATION" />
                        <Tab label="GITOPS / ROLLBACK" />
                    </Tabs>
                </Box>
            </DialogTitle>
            
            <DialogContent sx={{ p: 0 }}>
                {/* CHANGELOG TAB */}
                <TabPanel value={tabIndex} index={0}>
                    {changelogLoading ? <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box> : (
                        changelogData && changelogData.length > 0 ? (
                            <Stack spacing={2}>
                                {changelogData.map((release, i) => (
                                    <Paper key={i} variant="outlined" sx={{ p: 2 }}>
                                        <Typography variant="subtitle1" fontWeight="bold">Version {release.version}</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <Typography variant="caption" color="text.secondary">Released: {release.date}</Typography>
                                            {release.author && (
                                                <Typography variant="caption" color="info.main" sx={{ fontStyle: 'italic', ml: 1 }}>by {release.author}</Typography>
                                            )}
                                        </Box>
                                        {release.changes && release.changes.map((cat, j) => (
                                            <Box key={j} sx={{ mt: 1 }}>
                                                <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>{cat.category}</Typography>
                                                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                                    {cat.items?.map((item, k) => (
                                                        <li key={k}><Typography variant="body2">{item}</Typography></li>
                                                    ))}
                                                </ul>
                                            </Box>
                                        ))}
                                    </Paper>
                                ))}
                            </Stack>
                        ) : <Typography variant="body2" color="text.secondary">No changelog entries found.</Typography>
                    )}
                </TabPanel>

                {/* DOCUMENTATION TAB */}
                <TabPanel value={tabIndex} index={1}>
                    {docsLoading ? <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box> : (
                        docsData && docsData.length > 0 ? (
                            <Stack spacing={4}>
                                {docsData.map((doc, i) => {
                                    let parsedDocsContent = doc.raw_markdown || '';
                                    const docsMetadata = {};
                                    let docsOutOfDate = false;

                                    if (parsedDocsContent) {
                                        const extractField = (fieldName) => {
                                            const regex = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+)`, 'i');
                                            const match = parsedDocsContent.match(regex);
                                            if (match) {
                                                parsedDocsContent = parsedDocsContent.replace(regex, '');
                                                return match[1].trim();
                                            }
                                            return null;
                                        };

                                        docsMetadata.version = extractField('Version');
                                        docsMetadata.date = extractField('Date');
                                        docsMetadata.author = extractField('Author');
                                        docsMetadata.category = extractField('Category');
                                        docsMetadata.acronym = extractField('Acronym');
                                        docsMetadata.docType = extractField('Doc_Type');
                                        docsMetadata.name = extractField('Name');
                                        docsMetadata.status = extractField('Status');

                                        if (docsMetadata.version && latestChangelogVersion) {
                                            const parseVersion = v => v.replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n) || 0);
                                            const vDocs = parseVersion(docsMetadata.version);
                                            const vChange = parseVersion(latestChangelogVersion);
                                            
                                            for (let idx = 0; idx < Math.max(vDocs.length, vChange.length); idx++) {
                                                const d = vDocs[idx] || 0;
                                                const c = vChange[idx] || 0;
                                                if (d < c) {
                                                    docsOutOfDate = true;
                                                    break;
                                                } else if (d > c) {
                                                    break;
                                                }
                                            }
                                        }
                                    }

                                    return (
                                        <Box key={i}>
                                            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                                                <Typography variant="subtitle2" sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                                    📄 {doc.filename}
                                                </Typography>

                                                {docsOutOfDate && (
                                                    <Alert severity="warning" sx={{ mb: 3 }}>
                                                        Documentation may be out of date. The latest version in the changelog is <strong>{latestChangelogVersion}</strong>, but this document is for version <strong>{docsMetadata.version}</strong>.
                                                    </Alert>
                                                )}

                                                {Object.keys(docsMetadata).length > 0 && (
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                                                        {docsMetadata.version && <Chip label={`Version: ${docsMetadata.version}`} color="success" size="small" />}
                                                        {docsMetadata.date && <Chip label={`Date: ${docsMetadata.date}`} variant="outlined" size="small" />}
                                                        {docsMetadata.author && <Chip label={`Author: ${docsMetadata.author}`} variant="outlined" size="small" />}
                                                        {docsMetadata.category && <Chip label={`Category: ${docsMetadata.category}`} variant="outlined" size="small" />}
                                                        {docsMetadata.acronym && <Chip label={`Acronym: ${docsMetadata.acronym}`} variant="outlined" size="small" />}
                                                        {docsMetadata.docType && <Chip label={`Doc Type: ${docsMetadata.docType}`} variant="outlined" size="small" />}
                                                        {docsMetadata.name && <Chip label={`Name: ${docsMetadata.name}`} variant="outlined" size="small" />}
                                                        {docsMetadata.status && <Chip label={`Status: ${docsMetadata.status}`} variant="outlined" size="small" />}
                                                    </Box>
                                                )}

                                                <Box sx={{ 
                                                    '& h1, & h2, & h3': { mt: 2, mb: 1, fontWeight: 'bold' }, 
                                                    '& p': { mb: 2, lineHeight: 1.6 }, 
                                                    '& pre': { bgcolor: 'background.paper', p: 1.5, borderRadius: 1, overflowX: 'auto', border: '1px solid', borderColor: 'divider' },
                                                    '& code': { fontFamily: 'monospace', bgcolor: 'rgba(0,0,0,0.05)', px: 0.5, borderRadius: 0.5 }
                                                }}>
                                                    <ReactMarkdown 
                                                        remarkPlugins={[remarkGfm]} 
                                                        rehypePlugins={[rehypeRaw]}
                                                        components={{
                                                            code({node, inline, className, children, ...props}) {
                                                                const match = /language-(\w+)/.exec(className || '');
                                                                if (!inline && match && match[1] === 'mermaid') {
                                                                    return <MermaidBlock code={String(children).replace(/\n$/, '')} />;
                                                                }
                                                                return <code className={className} {...props}>{children}</code>;
                                                            }
                                                        }}
                                                    >
                                                        {parsedDocsContent}
                                                    </ReactMarkdown>
                                                </Box>
                                            </Paper>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        ) : <Typography variant="body2" color="text.secondary">No documentation available.</Typography>
                    )}
                </TabPanel>

                {/* GITOPS TAB */}
                <TabPanel value={tabIndex} index={2}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Branches & Container Tags
                    </Typography>
                    
                    <Stack spacing={3}>
                        {renderContainerGroup("🚀 Releases", project.inventory?.releases, 'success.main')}
                        {renderContainerGroup("🚧 Pre-releases (-dev)", project.inventory?.pre_releases, 'warning.main')}
                        {renderContainerGroup("✨ Active Features", project.inventory?.features, 'info.main')}
                        {renderContainerGroup("👻 Standalone Containers (Branch Deleted)", project.inventory?.standalone_features?.filter(c => c.active_deployments > 0), 'error.main')}
                        
                        {project.inventory?.active_branches_without_containers?.length > 0 && (
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>🌱 Active Branches (No Container)</Typography>
                                <Stack spacing={1}>
                                    {project.inventory.active_branches_without_containers.map((b, idx) => (
                                        <Paper key={idx} sx={{ p: 1.5, borderLeft: 4, borderColor: 'primary.main' }} variant="outlined">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <AccountTreeIcon color="primary" fontSize="small" />
                                                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{b.branch}</Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                                    Author: {b.author || 'Unknown'}
                                                </Typography>
                                            </Box>
                                        </Paper>
                                    ))}
                                </Stack>
                            </Box>
                        )}
                        
                        {!project.inventory?.releases?.length && !project.inventory?.pre_releases?.length && !project.inventory?.features?.length && !(project.inventory?.standalone_features?.filter(c => c.active_deployments > 0)?.length) && !project.inventory?.active_branches_without_containers?.length && (
                            <Typography variant="body2" color="text.secondary">No branches or tags found.</Typography>
                        )}
                    </Stack>
                </TabPanel>
            </DialogContent>
        </Dialog>
    );
}
