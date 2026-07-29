import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Box, Typography, Link, Divider, Paper } from '@mui/material';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

function MarkdownRenderer({ markdownContent }) {
    const components = {
        h1: ({node, ...props}) => <Typography variant="h4" gutterBottom {...props} sx={{mt:3, mb: 2, borderBottom: 1, borderColor: 'divider', pb: 1}}/>,
        h2: ({node, ...props}) => <Typography variant="h5" gutterBottom {...props} sx={{mt:3, mb: 2}}/>,
        h3: ({node, ...props}) => <Typography variant="h6" gutterBottom {...props} sx={{mt:2, mb: 1}}/>,
        p: ({node, ...props}) => <Typography variant="body1" paragraph {...props} sx={{lineHeight: 1.6, whiteSpace: 'pre-wrap'}} />,
        a: ({node, ...props}) => {
            if (props.href && props.href.startsWith('#page:')) {
                const pageId = props.href.replace('#page:', '');
                return (
                    <Link 
                        {...props} 
                        onClick={(e) => {
                            e.preventDefault();
                            window.dispatchEvent(new CustomEvent('navigateToPage', { detail: pageId }));
                        }} 
                        sx={{ cursor: 'pointer' }}
                    />
                );
            }
            if (props.href && props.href.startsWith('#')) {
                return (
                    <Link 
                        {...props} 
                        onClick={(e) => {
                            e.preventDefault();
                            const el = document.getElementById(props.href.substring(1));
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }} 
                        sx={{ cursor: 'pointer' }}
                    />
                );
            }
            return <Link target="_blank" rel="noopener noreferrer" {...props} />;
        },
        hr: ({node, ...props}) => <Divider sx={{my: 2}} {...props} />,
        table: ({node, ...props}) => <Box sx={{ overflowX: 'auto', my: 2, '&::-webkit-scrollbar': { height: 8 }, '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 4, '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' } } }}><table style={{ borderCollapse: 'collapse', width: '100%' }} {...props} /></Box>,
        th: ({node, ...props}) => <th style={{ border: '1px solid rgba(169, 179, 193, 0.4)', padding: '10px 16px', backgroundColor: 'rgba(255, 255, 255, 0.05)', textAlign: 'left', fontWeight: 'bold' }} {...props} />,
        td: ({node, ...props}) => <td style={{ border: '1px solid rgba(169, 179, 193, 0.4)', padding: '10px 16px', verticalAlign: 'top' }} {...props} />,
        code: ({node, inline, ...props}) => 
            inline 
                ? <code style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace' }} {...props} />
                : <Box component="pre" sx={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', overflowX: 'auto', '&::-webkit-scrollbar': { height: 8, width: 8 }, '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 4, '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' } } }}><code {...props} /></Box>
    };

    return (
        <Box sx={{ color: 'text.primary' }}>
            <Paper variant="outlined" sx={{ p: 4, backgroundColor: 'background.paper', borderColor: 'divider' }}>
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    rehypePlugins={[rehypeRaw]} 
                    components={components}
                >
                    {markdownContent}
                </ReactMarkdown>
            </Paper>
        </Box>
    );
}

export default MarkdownRenderer;