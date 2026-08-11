import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, CircularProgress, Alert, Button, Tabs, Tab, Typography, Divider, Chip } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ChangelogViewer from '../features/documentation/components/ChangelogViewer';
import DocumentationAccordion from '../features/documentation/components/DocumentationAccordion';
import HaloDocAccordion from '../features/documentation/components/HaloDocAccordion';
import { docsService } from '../services/docsService';

function DocumentationPage() {
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
                {filteredDocs.map((doc, idx) => (
                    <HaloDocAccordion 
                        key={doc.filename}
                        doc={doc}
                        defaultExpanded={docTypeFilter === 'ecosystem' && idx === 0}
                    />
                ))}
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
                    {renderHaloCategory("Concept", "concept")}
                    {renderHaloCategory("Architecture & Design", "architecture")}
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
                    {docsConfig && docsConfig.map((doc, index) => (
                        <DocumentationAccordion 
                            key={doc.id}
                            title={doc.name} 
                            docKey={doc.id} 
                            defaultExpanded={index === 0} 
                        />
                    ))}
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