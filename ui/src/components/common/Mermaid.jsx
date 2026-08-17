import React, { useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import mermaid from 'mermaid';

// Set htmlLabels to false so that WeasyPrint (which doesn't support foreignObject) can render the text natively as SVG <text> elements
mermaid.initialize({ startOnLoad: false, theme: 'dark', htmlLabels: false });

const Mermaid = ({ code }) => {
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

export default Mermaid;
