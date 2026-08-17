import React, { useRef, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

const Mermaid = ({ code }) => {
    const ref = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.disconnect();
            }
        }, { threshold: 0.01 });

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (isVisible && ref.current && code) {
            const id = 'mermaid-' + Math.random().toString(36).substring(2, 10);
            mermaid.render(id, code).then(({ svg }) => {
                if (ref.current) ref.current.innerHTML = svg;
            }).catch(e => {
                console.error('Mermaid render error', e);
                if (ref.current) ref.current.innerHTML = `<pre>${code}</pre>`;
            });
        }
    }, [code, isVisible]);
    
    return <Box ref={ref} sx={{ display: 'flex', justifyContent: 'center', my: 2, bgcolor: 'background.default', p: 2, borderRadius: 1 }} />;
};

export default Mermaid;
