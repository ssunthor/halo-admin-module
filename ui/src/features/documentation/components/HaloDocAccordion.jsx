import React, { useRef } from 'react';
import { 
    Box, Typography, Accordion, AccordionSummary, AccordionDetails, Chip, Stack,
    IconButton, Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import MarkdownRenderer from '../../../components/common/MarkdownRenderer';

function HaloDocAccordion({ doc, defaultExpanded = false }) {
    const title = doc.name || doc.filename;
    const contentRef = useRef(null);
    
    // Strip metadata lines from the top of the markdown
    const strippedMarkdown = (doc.raw_markdown || "").split('\n')
        .filter(line => !line.match(/^\*\*[A-Za-z_]+:\*\*\s*(.*)$/))
        .join('\n');

    const handleDownloadMD = (e) => {
        e.stopPropagation();
        const element = document.createElement("a");
        const file = new Blob([doc.raw_markdown || ""], { type: 'text/markdown' });
        element.href = URL.createObjectURL(file);
        element.download = `${title}.md`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const handleExportPDF = async (e) => {
        e.stopPropagation();
        try {
            // Clone the content so we can manipulate it
            const container = document.createElement('div');
            container.innerHTML = contentRef.current ? contentRef.current.innerHTML : "";

            // Convert all SVGs to PNGs to bypass WeasyPrint's SVG text rendering limitations
            const svgs = container.querySelectorAll('svg');
            for (let i = 0; i < svgs.length; i++) {
                const svg = svgs[i];
                const svgData = new XMLSerializer().serializeToString(svg);
                const svg64 = btoa(unescape(encodeURIComponent(svgData)));
                
                const img = new Image();
                img.src = `data:image/svg+xml;base64,${svg64}`;
                
                // Await image load to draw on canvas
                await new Promise((resolve) => {
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        // Use bounding client rect if width/height attributes are not present or are percentages
                        const rect = svg.getBoundingClientRect();
                        
                        // Use a 8x scale multiplier for ultra high-DPI crisp rendering in the PDF
                        const scale = 8;
                        const baseWidth = img.width || rect.width || 1000;
                        const baseHeight = img.height || rect.height || 800;
                        
                        canvas.width = baseWidth * scale;
                        canvas.height = baseHeight * scale;
                        
                        const ctx = canvas.getContext('2d');
                        
                        // Fill canvas with a dark background so that dark-theme diagrams (which have transparent backgrounds)
                        // show their light-grey lines and white text properly against the PDF's white page.
                        ctx.fillStyle = '#121212';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        
                        // Drawing the SVG img to a larger canvas automatically uses its vector resolution
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        
                        const pngData = canvas.toDataURL('image/png', 1.0);
                        const newImg = document.createElement('img');
                        newImg.src = pngData;
                        newImg.style.width = '100%';
                        newImg.style.maxWidth = '100%';
                        newImg.style.height = 'auto';
                        
                        svg.replaceWith(newImg);
                        resolve();
                    };
                    img.onerror = () => {
                        // If SVG fails to load, just leave it (or resolve to avoid hanging)
                        resolve();
                    };
                });
            }

            const rawHtml = container.innerHTML;
            const styledHtml = `
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta charset="utf-8">
                        <title>${title}</title>
                        <style>
                            @page { size: A4; margin: 20mm; }
                            body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #000; background: #fff; }
                            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            pre { background-color: #f5f5f5; border: 1px solid #ccc; padding: 10px; white-space: pre-wrap; word-wrap: break-word; }
                            code { background-color: #f5f5f5; font-family: monospace; }
                            h1 { font-size: 28pt; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 24px; margin-bottom: 16px; font-weight: bold; }
                            h2 { font-size: 24pt; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 24px; margin-bottom: 16px; font-weight: bold; }
                            h3 { font-size: 20pt; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 20px; margin-bottom: 12px; font-weight: bold; }
                            h4 { font-size: 24pt; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 24px; margin-bottom: 16px; font-weight: bold; } /* Maps to Markdown H1 in this app */
                            h5 { font-size: 20pt; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 20px; margin-bottom: 12px; font-weight: bold; } /* Maps to Markdown H2 */
                            h6 { font-size: 16pt; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 16px; margin-bottom: 10px; font-weight: bold; } /* Maps to Markdown H3 */
                            img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
                            a { color: #0366d6; text-decoration: none; }
                        </style>
                    </head>
                    <body>
                        ${rawHtml}
                    </body>
                </html>
            `;

            const response = await fetch('api/docs/export-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    markdown: doc.raw_markdown || "",
                    html: styledHtml,
                    filename: title
                })
            });
            
            if (!response.ok) {
                console.error("Failed to export PDF", await response.text());
                return;
            }
            
            const blob = await response.blob();
            const element = document.createElement("a");
            element.href = URL.createObjectURL(blob);
            element.download = `${title}.pdf`;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        } catch (error) {
            console.error("Error exporting PDF:", error);
        }
    };

    return (
        <Accordion sx={{ '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', mb: 1, borderRadius: 1 }} defaultExpanded={defaultExpanded}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', gap: 2, pr: 1 }}>
                    
                    {/* Main Content Area */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: 1.5, minWidth: 0, py: 0.5 }}>
                        
                        {/* Title Row */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Typography 
                                variant="h6" 
                                sx={{ 
                                    fontWeight: 'bold', 
                                    lineHeight: 1.2,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}
                            >
                                {title}
                            </Typography>
                        </Box>

                        {/* Metadata Row */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {doc.version && <Chip label={`Version: ${doc.version}`} color="success" variant="outlined" size="small" />}
                            {doc.date && <Chip label={`Date: ${doc.date}`} variant="outlined" size="small" />}
                            {doc.author && <Chip label={`Author: ${doc.author}`} variant="outlined" size="small" />}
                            {doc.category && <Chip label={`Category: ${doc.category}`} variant="outlined" size="small" />}
                            {doc.acronym && <Chip label={`Acronym: ${doc.acronym}`} variant="outlined" size="small" />}
                            {doc.doc_type && <Chip label={`Doc Type: ${doc.doc_type}`} variant="outlined" size="small" />}
                            {doc.status && <Chip label={`Status: ${doc.status}`} variant="outlined" size="small" />}
                        </Box>
                    </Box>

                    {/* Action Buttons (Right-aligned, vertically centered) */}
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, alignItems: 'center' }}>
                        {doc.project_name && (
                            <Chip 
                                label={doc.project_name} 
                                variant="outlined" 
                                color="success"
                                size="small" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`https://gitlab.gt-t.net/ai/halo/deployment/-/tree/main/docs/${doc.project_name}`, '_blank');
                                }}
                                sx={{ 
                                    mr: 1,
                                    cursor: 'pointer', 
                                    '&:hover': { backgroundColor: 'action.hover' } 
                                }} 
                            />
                        )}
                        <Tooltip title="Download Markdown">
                            <IconButton onClick={handleDownloadMD} sx={{ color: 'text.secondary' }}>
                                <DownloadIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Export to PDF">
                            <IconButton onClick={handleExportPDF} sx={{ color: 'text.secondary' }}>
                                <PictureAsPdfIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>

                </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ maxHeight: '700px', overflowY: 'auto', p: 4, backgroundColor: 'background.default' }}>
                <Box ref={contentRef}>
                    <MarkdownRenderer markdownContent={strippedMarkdown} />
                </Box>
            </AccordionDetails>
        </Accordion>
    );
}

export default HaloDocAccordion;
