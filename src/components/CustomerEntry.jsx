import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function CustomerEntry() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [cafe, setCafe] = useState(null);
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Interactive Customer Input Fields
    const [billAmount, setBillAmount] = useState('');
    const [selectedCoupon, setSelectedCoupon] = useState(null);
    const [claimSuccess, setClaimSuccess] = useState(false);

    useEffect(() => {
        setLoading(true);
        setError('');

        fetch(`http://localhost:5000/api/cafe/${slug}`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Cafe not found or backend server offline');
                }
                return res.json();
            })
            .then((data) => {
                if (data.success) {
                    setCafe(data.cafe);
                    setCoupons(data.coupons || []);
                } else {
                    throw new Error(data.message || 'Failed to fetch details');
                }
            })
            .catch((err) => {
                setError(err.message || 'Error occurred while loading Cafe profile');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [slug]);

    const handleApplyCoupon = (e) => {
        e.preventDefault();
        if (!billAmount || isNaN(billAmount) || parseFloat(billAmount) <= 0) {
            alert('Please enter a valid bill amount');
            return;
        }
        if (!selectedCoupon) {
            alert('Please select an active coupon to continue');
            return;
        }

        setClaimSuccess(true);
    };

    const getDiscountedAmount = () => {
        if (!selectedCoupon || !billAmount) return 0;
        const bill = parseFloat(billAmount);
        if (selectedCoupon.discount_type === 'percent') {
            return (bill * parseFloat(selectedCoupon.discount_value)) / 100;
        } else {
            // Flat discount
            return Math.min(bill, parseFloat(selectedCoupon.discount_value));
        }
    };

    const getPayableAmount = () => {
        const bill = parseFloat(billAmount || 0);
        const disc = getDiscountedAmount();
        return Math.max(0, bill - disc).toFixed(2);
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0A0F' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '48px', height: '48px', border: '3px solid rgba(139, 92, 246, 0.2)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
                    <p style={{ color: 'var(--text-secondary)' }}>Loading Cafe Profile...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0A0F', padding: '20px' }}>
                <div className="card" style={{ maxWidth: '400px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                    <h2 style={{ fontSize: '22px', color: '#fff', marginBottom: '8px' }}>Profile Error</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>{error}</p>
                    <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ width: '100%' }}>
                        Return to Landing Page
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', backgroundColor: '#050406', padding: '16px 8px' }}>
            <div className="bg-glow"></div>

            {/* Mobile-Viewport Frame Container */}
            <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column' }}>

                {/* Brand Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', padding: '12px 8px', marginBottom: '16px' }}>
                    <div className="nav-brand" style={{ fontSize: '20px' }}>
                        <div className="nav-logo-icon" style={{ width: '30px', height: '30px', borderRadius: '8px', fontSize: '16px' }}>☕</div>
                        <span>{cafe?.name}</span>
                    </div>
                    <div className="badge" style={{ margin: 0, padding: '4px 10px', fontSize: '11px' }}>Customer Portal</div>
                </div>

                {claimSuccess ? (
                    /* Verification Lock Screen */
                    <div className="card" style={{ padding: '32px 24px', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔑</div>
                        <h2 style={{ fontSize: '24px', color: '#fff', marginBottom: '12px' }}>Authentication Required</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
                            To apply your <strong>{selectedCoupon?.title}</strong> discount, we need to verify your phone number via WhatsApp.
                        </p>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px', textAlign: 'left' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Bill Amount:</div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>₹{parseFloat(billAmount).toFixed(2)}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>Final Payable:</div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#34D399' }}>₹{getPayableAmount()}</div>
                        </div>

                        <button
                            onClick={() => {
                                alert('Verification details logged! Ready to send WhatsApp OTP.');
                                setClaimSuccess(false);
                            }}
                            className="btn btn-primary"
                            style={{ width: '100%', height: '48px', marginBottom: '12px' }}
                        >
                            Verify WhatsApp Phone
                        </button>
                        <button onClick={() => setClaimSuccess(false)} className="btn btn-secondary" style={{ width: '100%' }}>
                            Change Details
                        </button>
                    </div>
                ) : (
                    /* Standard Scan Landing Entry Screen */
                    <form onSubmit={handleApplyCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Cafe Details Card */}
                        <div className="card" style={{ textAlign: 'left', padding: '24px 20px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Welcome To</div>
                            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '4px 0 8px 0', color: '#fff' }}>{cafe?.name}</h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>📍 {cafe?.address}</p>
                        </div>

                        {/* Bill Input Card */}
                        <div className="card" style={{ padding: '24px 20px', textAlign: 'left' }}>
                            <label className="form-label" style={{ fontSize: '15px' }}>Cashier Bill Amount (Before Discount)</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '16px', top: '12px', fontSize: '18px', fontWeight: 600, color: 'var(--text-muted)' }}>₹</span>
                                <input
                                    type="number"
                                    className="form-input"
                                    style={{ paddingLeft: '32px', fontSize: '18px', fontWeight: 700 }}
                                    value={billAmount}
                                    onChange={(e) => setBillAmount(e.target.value)}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    required
                                />
                            </div>
                        </div>

                        {/* Coupons Selection List */}
                        <div style={{ textAlign: 'left' }}>
                            <h3 style={{ fontSize: '16px', marginBottom: '12px', fontWeight: 600, color: '#fff', paddingLeft: '8px' }}>
                                Select 1 Loyalty Coupon
                            </h3>

                            {coupons.length === 0 ? (
                                <div className="card" style={{ padding: '20px', textAlignment: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                    No coupons configured for this store yet.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {coupons.map((coupon) => (
                                        <div
                                            key={coupon.id}
                                            onClick={() => setSelectedCoupon(coupon)}
                                            className={`card`}
                                            style={{
                                                padding: '16px',
                                                cursor: 'pointer',
                                                borderColor: selectedCoupon?.id === coupon.id ? 'var(--color-accent)' : 'var(--border-color)',
                                                background: selectedCoupon?.id === coupon.id ? 'rgba(139, 92, 246, 0.05)' : 'var(--bg-card)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span
                                                    style={{
                                                        background: coupon.badge_label === 'Save' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                        border: coupon.badge_label === 'Save' ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                                                        color: coupon.badge_label === 'Save' ? '#C084FC' : '#34D399',
                                                        padding: '4px 10px',
                                                        borderRadius: '100px',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        textTransform: 'uppercase'
                                                    }}
                                                >
                                                    {coupon.badge_label}
                                                </span>

                                                <input
                                                    type="radio"
                                                    name="selected_coupon"
                                                    checked={selectedCoupon?.id === coupon.id}
                                                    onChange={() => setSelectedCoupon(coupon)}
                                                    style={{ accentColor: '#8b5cf6' }}
                                                />
                                            </div>

                                            <h4 style={{ fontSize: '16px', margin: '10px 0 4px 0', color: '#fff' }}>{coupon.title}</h4>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>{coupon.desc_text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Calculations Card (if both inputs filled) */}
                        {billAmount && selectedCoupon && (
                            <div className="card" style={{ padding: '20px', textAlign: 'left', animation: 'fadeIn 0.2s ease', borderStyle: 'dashed' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    <span>Applied Reward:</span>
                                    <span>{selectedCoupon.title}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                                    <span>Discount Savings:</span>
                                    <span style={{ color: '#F87171' }}>- ₹{getDiscountedAmount()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, borderTop: '1px solid var(--border-color)', paddingTop: '10px', color: '#fff' }}>
                                    <span>Payable at Counter:</span>
                                    <span style={{ color: '#34D399' }}>₹{getPayableAmount()}</span>
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className={`btn btn-primary`}
                            style={{ height: '52px', marginTop: '8px' }}
                        >
                            Verify & Lock Discount
                        </button>
                        <div style={{ height: '30px' }}></div>
                    </form>
                )}
            </div>
        </div>
    );
}
