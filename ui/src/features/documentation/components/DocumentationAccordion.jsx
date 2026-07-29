import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    Box, Typography, CircularProgress, Alert, 
    Accordion, AccordionSummary, AccordionDetails, IconButton, Tooltip 
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import MarkdownRenderer from '../../../components/common/MarkdownRenderer';
import { docsService } from '../../../services/docsService';

function DocumentationAccordion({ title, docKey, defaultExpanded = false }) {
    const { data: content, isLoading, error } = useQuery({
        queryKey: ['docContent', docKey],
        queryFn: () => docsService.fetchDocContent(docKey),
        staleTime: Infinity,
    });

    const handleDownload = () => {
        window.location.href = docsService.getDownloadUrl(docKey);
    };

    return (
        <Accordion sx={{ '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', mb: 1, borderRadius: 1 }} defaultExpanded={defaultExpanded}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>{title}</Typography>
                    {isLoading && <CircularProgress size={20} sx={{ mr: 2 }} />}
                    <Tooltip title="Download Document">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDownload(); }}>
                            <DownloadIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ maxHeight: '700px', overflowY: 'auto', p: 4, backgroundColor: 'background.default' }}>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}
                {content && <MarkdownRenderer markdownContent={content} />}
            </AccordionDetails>
        </Accordion>
    );
}

export default DocumentationAccordion;