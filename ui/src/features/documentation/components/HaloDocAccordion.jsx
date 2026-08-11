import React from 'react';
import { 
    Box, Typography, Accordion, AccordionSummary, AccordionDetails, Chip, Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MarkdownRenderer from '../../../components/common/MarkdownRenderer';

function HaloDocAccordion({ doc, defaultExpanded = false }) {
    const title = doc.name || doc.filename;
    
    // Strip metadata lines from the top of the markdown
    const strippedMarkdown = (doc.raw_markdown || "").split('\n')
        .filter(line => !line.match(/^\*\*[A-Za-z_]+:\*\*\s*(.*)$/))
        .join('\n');

    return (
        <Accordion sx={{ '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', mb: 1, borderRadius: 1 }} defaultExpanded={defaultExpanded}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2, flexWrap: 'wrap', gap: 2 }}>
                    {doc.project_name && <Chip label={doc.project_name} color="primary" variant="filled" size="small" />}
                    <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold', minWidth: 'max-content' }}>{title}</Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {doc.version && <Chip label={`Version: ${doc.version}`} color="success" variant="outlined" size="small" />}
                        {doc.date && <Chip label={`Date: ${doc.date}`} variant="outlined" size="small" />}
                        {doc.author && <Chip label={`Author: ${doc.author}`} variant="outlined" size="small" />}
                        {doc.category && <Chip label={`Category: ${doc.category}`} variant="outlined" size="small" />}
                        {doc.acronym && <Chip label={`Acronym: ${doc.acronym}`} variant="outlined" size="small" />}
                        {doc.doc_type && <Chip label={`Doc Type: ${doc.doc_type}`} variant="outlined" size="small" />}
                        {doc.status && <Chip label={`Status: ${doc.status}`} variant="outlined" size="small" />}
                    </Stack>
                </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ maxHeight: '700px', overflowY: 'auto', p: 4, backgroundColor: 'background.default' }}>
                <MarkdownRenderer markdownContent={strippedMarkdown} />
            </AccordionDetails>
        </Accordion>
    );
}

export default HaloDocAccordion;
