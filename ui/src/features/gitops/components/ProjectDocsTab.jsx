import React, { useRef, useEffect } from 'react';
import { Box, CircularProgress, Stack, Paper, Typography, Alert, Chip } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
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

export default function ProjectDocsTab({ docsData, isLoading, latestChangelogVersion }) {
    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    if (!docsData || docsData.length === 0) {
        return <Typography variant="body2" color="text.secondary">No documentation available.</Typography>;
    }

    return (
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
    );
}