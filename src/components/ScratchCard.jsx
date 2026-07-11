import React, { useRef, useEffect, useState } from 'react';

const ScratchCard = ({ coupon, onClaim, isClaimed, isClaiming }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isRevealed, setIsRevealed] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        // Set canvas resolution matching container size
        const resizeCanvas = () => {
            const rect = containerRef.current.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;

            // Paint background metallic silver texture/gradient
            const gr = ctx.createLinearGradient(0, 0, rect.width, rect.height);
            gr.addColorStop(0, '#e2e8f0'); // slate-200
            gr.addColorStop(0.3, '#cbd5e1'); // slate-300
            gr.addColorStop(0.7, '#94a3b8'); // slate-400
            gr.addColorStop(1, '#64748b'); // slate-500
            ctx.fillStyle = gr;
            ctx.fillRect(0, 0, rect.width, rect.height);

            // Add some subtle sparkles on cover
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            for (let i = 0; i < 20; i++) {
                const x = Math.random() * rect.width;
                const y = Math.random() * rect.height;
                const r = Math.random() * 2 + 1;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }

            // Text instruction on cover
            ctx.font = 'bold 13px sans-serif';
            ctx.fillStyle = '#1e293b';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Scratch here to reveal offer!', rect.width / 2, rect.height / 2);
        };

        resizeCanvas();

        // Optional: Re-run resize on window change
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [isRevealed]);

    const getMousePos = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        // Handle touch events vs mouse events
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const draw = (e) => {
        if (!isDrawing || isRevealed) return;

        // Prevent default touch scrolling when scratching
        if (e.cancelable) {
            e.preventDefault();
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const pos = getMousePos(e);

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 22, 0, Math.PI * 2); // 22px brush circle size
        ctx.fill();

        checkPercentage();
    };

    const checkPercentage = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const width = canvas.width;
        const height = canvas.height;
        const imgData = ctx.getImageData(0, 0, width, height);
        const pixels = imgData.data;
        let transparent = 0;

        // Check transparency of every 16th pixel to keep computation cheap
        for (let i = 3; i < pixels.length; i += 16) {
            if (pixels[i] === 0) {
                transparent++;
            }
        }

        const totalChecked = pixels.length / 16;
        const percent = (transparent / totalChecked) * 100;

        if (percent > 40) {
            setIsRevealed(true);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(coupon.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                minHeight: '145px',
                width: '100%',
                background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.4) 0%, rgba(124, 58, 237, 0.1) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
                overflow: 'hidden',
                animation: 'fadeIn 0.4s ease'
            }}
        >
            {/* Background coupon details */}
            <div style={{ flexGrow: 1, paddingBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                        style={{
                            background: 'rgba(52, 211, 153, 0.1)',
                            border: '1px solid rgba(52, 211, 153, 0.3)',
                            color: '#34D399',
                            padding: '3px 8px',
                            borderRadius: '100px',
                            fontSize: '10px',
                            fontWeight: 650,
                            textTransform: 'uppercase'
                        }}
                    >
                        {coupon.badge_label || 'Reward'}
                    </span>
                    {isRevealed && (
                        <span
                            style={{
                                fontSize: '10px',
                                background: isClaimed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                color: isClaimed ? '#34D399' : 'var(--text-secondary)',
                                fontWeight: 500,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            {isClaimed ? '✓ Claimed' : '📋 Unclaimed'}
                        </span>
                    )}
                </div>

                {isRevealed && coupon.cafe_name && (
                    <div style={{ fontSize: '11px', color: '#A78BFA', fontWeight: 650, margin: '8px 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📍 {coupon.cafe_name}
                    </div>
                )}

                <h4 style={{ fontSize: '14px', color: '#fff', margin: coupon.cafe_name ? '4px 0' : '8px 0 4px 0', fontWeight: 700 }}>
                    {coupon.title}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                    {coupon.desc_text}
                </p>

                {isRevealed && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#C084FC', fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                        Code: {coupon.id}
                    </div>
                )}
            </div>

            {/* Action buttons (only visible / active once revealed) */}
            <div style={{ marginTop: '6px' }}>
                {isRevealed ? (
                    <button
                        type="button"
                        onClick={() => {
                            if (!isClaimed) {
                                // Claim and copy coupon code in one layout action
                                navigator.clipboard.writeText(coupon.id);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                                onClaim(coupon.id);
                            }
                        }}
                        disabled={isClaimed || isClaiming}
                        className="btn"
                        style={{
                            padding: '0 12px',
                            margin: 0,
                            height: '34px',
                            fontSize: '11px',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isClaimed ? 'rgba(52, 211, 153, 0.15)' : 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                            borderColor: isClaimed ? '#10B981' : 'transparent',
                            color: isClaimed ? '#34D399' : '#fff',
                            fontWeight: 600,
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            gap: '4px'
                        }}
                    >
                        {isClaiming ? 'Claiming...' : isClaimed ? '✓ Claimed & Code Copied' : '🎁 Claim & Copy Code'}
                    </button>
                ) : (
                    // Phantom space-keeper to matching card height before reveal
                    <div style={{ height: '34px' }} />
                )}
            </div>

            {/* Silver scratchable canvas layer */}
            {!isRevealed && (
                <canvas
                    ref={canvasRef}
                    onMouseDown={() => setIsDrawing(true)}
                    onMouseUp={() => setIsDrawing(false)}
                    onMouseLeave={() => setIsDrawing(false)}
                    onMouseMove={draw}
                    onTouchStart={() => setIsDrawing(true)}
                    onTouchEnd={() => setIsDrawing(false)}
                    onTouchMove={draw}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        cursor: 'crosshair',
                        borderRadius: '14px',
                        touchAction: 'none',
                        zIndex: 10
                    }}
                />
            )}
        </div>
    );
};

export default ScratchCard;
