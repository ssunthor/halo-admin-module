import React from 'react';
import { Tooltip, Typography, Box } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { SRE_GLOSSARY } from '../../constants/glossary';

export default function GlossaryLabel({ termKey, children, variant = "body2", color = "text.primary", sx = {} }) {
    const term = SRE_GLOSSARY[termKey];

    if (!term) {
        console.warn(`Glossary term not found: ${termKey}`);
        return <Typography variant={variant} color={color} sx={sx}>{children}</Typography>;
    }

    const Icon = term.icon === 'warning' ? WarningAmberIcon : InfoOutlinedIcon;
    const iconColor = term.icon === 'warning' ? '#ff9800' : '#4ed869';

    const tooltipContent = (
        <Box sx={{ p: 0.5, maxWidth: 300 }}>
            <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, borderBottom: '1px solid rgba(255,255,255,0.2)', pb: 0.5, color: iconColor }}>
                <Icon sx={{ fontSize: 16 }} />
                {term.title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                {term.body}
            </Typography>
        </Box>
    );

    return (
        <Tooltip
            title={tooltipContent}
            placement="top-start"
            componentsProps={{
                tooltip: {
                    sx: {
                        bgcolor: '#0a0e1a',
                        border: '1px solid #1e293b',
                        p: 1,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                    }
                }
            }}
        >
            <Typography
                variant={variant}
                color={color}
                sx={{
                    cursor: 'help',
                    display: 'inline-block',
                    ...sx
                }}
            >
                {children}
            </Typography>
        </Tooltip>
    );
}