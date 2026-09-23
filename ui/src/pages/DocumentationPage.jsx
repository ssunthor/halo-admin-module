import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, CircularProgress, Alert, Button, Tabs, Tab, Typography, Divider, Chip, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChangelogViewer from '../features/documentation/components/ChangelogViewer';
import DocumentationAccordion from '../features/documentation/components/DocumentationAccordion';
import HaloDocAccordion from '../features/documentation/components/HaloDocAccordion';
import { docsService } from '../services/docsService';

function DocumentationPage() {
    const { docName } = useParams();
    const [activeTab, setActiveTab] = useState(0);

    const { data: docsConfig, isLoading: isConfigLoading, error: configError } = useQuery({
        queryKey: ['docsConfig'],
        queryFn: docsService.fetchDocsConfig,
        staleTime: Infinity,
    });

    const { data: changelogData, isLoading: isChangelogLoading } = useQuery({
        queryKey: ['changelogData'],
        queryFn: docsService.fetchChangelog,
        staleTime: Infinity,
    });

    const { data: haloDocsTree, isLoading: isHaloDocsLoading, error: haloDocsError } = useQuery({
        queryKey: ['haloDocsTree'],
        queryFn: docsService.fetchHaloDocsTree,
        staleTime: Infinity,
    });

    useEffect(() => {
        if (!docName) return;
        
        if (haloDocsTree && haloDocsTree.some(d => d.filename === docName)) {
            setActiveTab(0);
        } else if (docsConfig && docsConfig.some(d => d.id === docName)) {
            setActiveTab(1);
        }
    }, [docName, haloDocsTree, docsConfig]);

    const handleDownloadAllChangelogs = () => {
        window.location.href = docsService.getAllChangelogsDownloadUrl();
    };

    const renderHaloCategory = (title, docTypeFilter) => {
        if (!haloDocsTree) return null;
        
        // Match doc_type ignoring case and whitespace
        const filteredDocs = haloDocsTree.filter(d => 
            d.doc_type && d.doc_type.toLowerCase().replace(/_/g, '') === docTypeFilter.toLowerCase().replace(/_/g, '')
        );

        filteredDocs.sort((a, b) => {
            const catA = a.category || '';
            const catB = b.category || '';
            
            if (catA.toLowerCase() === 'frontend' && catB.toLowerCase() !== 'frontend') return -1;
            if (catB.toLowerCase() === 'frontend' && catA.toLowerCase() !== 'frontend') return 1;

            if (catA < catB) return -1;
            if (catA > catB) return 1;

            const nameA = a.name || a.filename || '';
            const nameB = b.name || b.filename || '';
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });

        if (filteredDocs.length === 0) return null;

        if (docTypeFilter === 'archive') {
            const hasTarget = docName && filteredDocs.some(d => d.filename === docName);
            return (
                <Box sx={{ mb: 4 }}>
                    <Accordion sx={{ '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', borderRadius: 1 }} defaultExpanded={hasTarget}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, color: 'primary.main' }}>{title}</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 2, backgroundColor: 'background.default' }}>
                            {filteredDocs.map((doc, idx) => {
                                const isTargetDoc = docName && doc.filename === docName;
                                return (
                                    <HaloDocAccordion 
                                        key={doc.filename}
                                        doc={doc}
                                        defaultExpanded={isTargetDoc}
                                        isTargetDoc={isTargetDoc}
                                    />
                                );
                            })}
                        </AccordionDetails>
                    </Accordion>
                </Box>
            );
        }

        return (
            <Box sx={{ mb: 4 }}>
                <Divider sx={{ my: 4 }}>
                    <Chip 
                        label={title} 
                        color="primary" 
                        variant="outlined" 
                        sx={{ fontWeight: 'bold', fontSize: '1.1rem', py: 2, px: 2, textTransform: 'uppercase', letterSpacing: 1 }} 
                    />
                </Divider>
                {filteredDocs.map((doc, idx) => {
                    const isTargetDoc = docName && doc.filename === docName;
                    const isDefaultExpanded = isTargetDoc || (!docName && docTypeFilter === 'ecosystem' && idx === 0);
                    return (
                        <HaloDocAccordion 
                            key={doc.filename}
                            doc={doc}
                            defaultExpanded={isDefaultExpanded}
                            isTargetDoc={isTargetDoc}
                        />
                    );
                })}
            </Box>
        );
    };

    return (
        <Box sx={{ width: '100%', mt: 0 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)} textColor="primary" indicatorColor="primary">
                    <Tab label="HALO DOCUMENTATION" />
                    <Tab label="CORE DOCUMENTATION" />
                    <Tab label="RELEASE NOTES (CHANGELOG)" />
                </Tabs>
            </Box>

            {activeTab === 0 && (
                <Box>
                    {isHaloDocsLoading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    )}
                    {haloDocsError && (
                        <Alert severity="error" sx={{ mb: 2 }}>Failed to load HALO documentation: {haloDocsError.message}</Alert>
                    )}
                    {renderHaloCategory("Ecosystem", "ecosystem")}
                    {renderHaloCategory("Intellectual Property", "Patent Disclosure")}
                    {renderHaloCategory("Concept", "concept")}
                    {renderHaloCategory("Architecture & Design", "architecture")}
                    {renderHaloCategory("Archive", "archive")}
                    {renderHaloCategory("Other", "unknown")}
                </Box>
            )}

            {activeTab === 1 && (
                <Box>
                    {isConfigLoading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    )}
                    {configError && (
                        <Alert severity="error" sx={{ mb: 2 }}>Failed to load documentation configuration: {configError.message}</Alert>
                    )}
                    {docsConfig && docsConfig.map((doc, index) => {
                        const isTargetDoc = docName && doc.id === docName;
                        const isDefaultExpanded = isTargetDoc || (!docName && index === 0);
                        return (
                            <DocumentationAccordion 
                                key={doc.id}
                                title={doc.name} 
                                docKey={doc.id} 
                                defaultExpanded={isDefaultExpanded} 
                                isTargetDoc={isTargetDoc}
                            />
                        );
                    })}
                </Box>
            )}

            {activeTab === 2 && (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button 
                            variant="outlined" 
                            startIcon={<DownloadIcon />} 
                            onClick={handleDownloadAllChangelogs}
                            size="small"
                            color="primary"
                        >
                            Download All Changelogs (.zip)
                        </Button>
                    </Box>
                    
                    {isChangelogLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <ChangelogViewer versions={changelogData} />
                    )}
                </Box>
            )}
        </Box>
    );
}

export default DocumentationPage;