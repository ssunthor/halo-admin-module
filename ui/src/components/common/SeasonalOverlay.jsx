import React from 'react';
import { Box } from '@mui/material';

function SeasonalOverlay({ seasonalEvent }) {
    if (!seasonalEvent || seasonalEvent === 'none') {
        return null;
    }

    if (seasonalEvent === 'halloween') {
        return (
            <>
                <style>
                    {`
                        @import url('https://fonts.googleapis.com/css2?family=Creepster&display=swap');

                        @keyframes bloodDripSlow {
                            0% { transform: translateY(-100%); opacity: 0; }
                            10% { opacity: 0.9; }
                            90% { opacity: 0.9; }
                            100% { transform: translateY(100vh); opacity: 0; }
                        }

                        @keyframes pulseSpooky {
                            0% { opacity: 0.85; filter: drop-shadow(0 0 5px #ff0000); }
                            50% { opacity: 1; filter: drop-shadow(0 0 15px #ff0000); }
                            100% { opacity: 0.85; filter: drop-shadow(0 0 5px #ff0000); }
                        }

                        .spooky-title {
                            font-family: 'Creepster', cursive !important;
                            letter-spacing: 2px !important;
                            color: #ff3333 !important;
                            text-shadow: 0 0 10px #ff0000, 2px 2px 4px #000000 !important;
                        }

                        [data-seasonal="halloween"] .spooky-glow {
                            animation: pulseSpooky 3s infinite ease-in-out;
                        }
                    `}
                </style>

                {/* Top Blood Dripping Effect */}
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '6px',
                        background: 'linear-gradient(to bottom, #8a0000, rgba(138, 0, 0, 0.4), transparent)',
                        zIndex: 99999,
                        pointerEvents: 'none',
                        boxShadow: '0 0 8px #ff0000',
                        '& .blood-drip': {
                            position: 'absolute',
                            top: 0,
                            background: 'linear-gradient(to bottom, #b30000, #5c0000)',
                            borderRadius: '0 0 3px 3px',
                            boxShadow: '0 0 6px rgba(255, 0, 0, 0.8)',
                        },
                        '& .drip-1': {
                            left: '18%',
                            width: '2px',
                            height: '90px',
                            animation: 'bloodDripSlow 4.5s infinite ease-in',
                        },
                        '& .drip-2': {
                            left: '42%',
                            width: '3px',
                            height: '140px',
                            animation: 'bloodDripSlow 6s infinite ease-in 1.5s',
                        },
                        '& .drip-3': {
                            left: '72%',
                            width: '2px',
                            height: '110px',
                            animation: 'bloodDripSlow 5s infinite ease-in 0.8s',
                        },
                        '& .drip-4': {
                            left: '88%',
                            width: '2.5px',
                            height: '130px',
                            animation: 'bloodDripSlow 5.5s infinite ease-in 2.2s',
                        },
                    }}
                >
                    <div className="blood-drip drip-1" />
                    <div className="blood-drip drip-2" />
                    <div className="blood-drip drip-3" />
                    <div className="blood-drip drip-4" />
                </Box>
            </>
        );
    }

    return null;
}

export default SeasonalOverlay;

