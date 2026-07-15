import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function Dashboard({ cafe, token, onLogout, onUpdateCafe }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Settings Fields
    const [name, setName] = useState(cafe?.name || '');
    const [ownerName, setOwnerName] = useState(cafe?.owner_name || '');
    const [email, setEmail] = useState(cafe?.email || '');
    const [address, setAddress] = useState(cafe?.address || '');
    const [upiId, setUpiId] = useState(cafe?.upi_id || '');
    const [allowPlatformCoupons, setAllowPlatformCoupons] = useState(cafe?.allow_platform_coupons !== false);

    // Coupons State Fields
    const [coupons, setCoupons] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [metrics, setMetrics] = useState({ newCustomers: 0, repeatCustomers: 0 });
    const [couponTitle, setCouponTitle] = useState('');
    const [couponDesc, setCouponDesc] = useState('');
    const [couponBadge, setCouponBadge] = useState('Save');
    const [discountType, setDiscountType] = useState('percent');
    const [discountValue, setDiscountValue] = useState('');
    const [frequency, setFrequency] = useState('1');
    const [minBillAmount, setMinBillAmount] = useState('');
    const [couponFilterTab, setCouponFilterTab] = useState('active'); // 'active' or 'archived'
    const [togglingCouponId, setTogglingCouponId] = useState(null);
    const [hoveredBtnId, setHoveredBtnId] = useState(null);
    const [couponLoading, setCouponLoading] = useState(false);

    // Ad Campaign Fields
    const [adCampaigns, setAdCampaigns] = useState([
        { id: 1, title: 'Summer Special Discount', budget: 5000, audience: 'Foodies', duration: '7 Days', status: 'Running', impressions: 1250, clicks: 180, ctr: '14.4%' },
        { id: 2, title: 'Weekend Combo Deal', budget: 3000, audience: 'Students', duration: '5 Days', status: 'Paused', impressions: 840, clicks: 92, ctr: '10.9%' },
        { id: 3, title: 'Early Bird Promo', budget: 1500, audience: 'All Customers', duration: '3 Days', status: 'Completed', impressions: 600, clicks: 42, ctr: '7.0%' },
    ]);
    const [adTitle, setAdTitle] = useState('');
    const [adBudget, setAdBudget] = useState('');
    const [adAudience, setAdAudience] = useState('All Customers');
    const [adDuration, setAdDuration] = useState('7 Days');

    const handleCreateAdCampaign = (e) => {
        e.preventDefault();
        if (!adTitle.trim() || !adBudget || !adAudience || !adDuration) return;

        const newAd = {
            id: adCampaigns.length + 1,
            title: adTitle.trim(),
            budget: parseFloat(adBudget),
            audience: adAudience,
            duration: adDuration,
            status: 'Running',
            impressions: 0,
            clicks: 0,
            ctr: '0.0%'
        };

        setAdCampaigns([newAd, ...adCampaigns]);
        setAdTitle('');
        setAdBudget('');
        setAdAudience('All Customers');
        setAdDuration('7 Days');
        setSuccessMsg('Ad Campaign launched successfully!');
    };

    // Fetch Cafe coupons list
    const fetchCoupons = async () => {
        if (!cafe?.slug) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/cafe/coupons`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setCoupons(data.coupons || []);
            }

            const txRes = await fetch(`${API_BASE_URL}/api/cafe/transactions`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const txData = await txRes.json();
            if (txData.success) {
                setTransactions(txData.transactions || []);
                if (txData.metrics) {
                    setMetrics(txData.metrics);
                }
            }
        } catch (err) {
            console.error('Error fetching store coupons & transactions:', err);
        }
    };

    useEffect(() => {
        if (cafe?.slug) {
            fetchCoupons();
        }
    }, [cafe?.slug, activeTab]);

    useEffect(() => {
        if (cafe) {
            setName(cafe.name || '');
            setOwnerName(cafe.owner_name || '');
            setEmail(cafe.email || '');
            setAddress(cafe.address || '');
            setUpiId(cafe.upi_id || '');
            setAllowPlatformCoupons(cafe.allow_platform_coupons !== false);
        }
    }, [cafe]);

    useEffect(() => {
        if (!token || !cafe || !cafe.email_verified) {
            navigate('/auth');
        }
    }, [token, cafe, navigate]);

    if (!token || !cafe || !cafe.email_verified) {
        return null;
    }

    const handleCreateCoupon = async (e) => {
        e.preventDefault();
        setSuccessMsg('');
        setErrorMsg('');
        setCouponLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/cafe/coupons`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: couponTitle,
                    desc_text: couponDesc,
                    badge_label: couponBadge,
                    discount_type: discountType,
                    discount_value: parseFloat(discountValue),
                    max_uses: parseInt(frequency),
                    min_bill_amount: minBillAmount ? parseFloat(minBillAmount) : 0
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to create coupon');
            }

            setSuccessMsg('New Loyalty Coupon created successfully!');

            // Clear inputs
            setCouponTitle('');
            setCouponDesc('');
            setCouponBadge('Save');
            setDiscountType('percent');
            setDiscountValue('');
            setFrequency('1');
            setMinBillAmount('');

            // Refresh coupons list
            await fetchCoupons();
            setActiveTab('coupons');
        } catch (err) {
            setErrorMsg(err.message || 'Error occurred while creating coupon');
        } finally {
            setCouponLoading(false);
        }
    };

    const handleToggleActive = async (couponId, currentStatus) => {
        setTogglingCouponId(couponId);
        try {
            const res = await fetch(`${API_BASE_URL}/api/cafe/coupons/${couponId}/toggle-active`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ is_active: !currentStatus })
            });
            const data = await res.json();
            if (data.success) {
                await fetchCoupons();
            } else {
                setErrorMsg(data.message || 'Failed to toggle status');
            }
        } catch (err) {
            console.error('Error toggling coupon active status:', err);
            setErrorMsg('Network error toggling status');
        } finally {
            setTogglingCouponId(null);
        }
    };

    const handleUpdateSettings = async (e) => {
        e.preventDefault();
        setSuccessMsg('');
        setErrorMsg('');
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/cafe/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    owner_name: ownerName,
                    email,
                    address,
                    upi_id: upiId,
                    allow_platform_coupons: allowPlatformCoupons
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to update details');
            }

            setSuccessMsg('Cafe settings updated successfully!');
            onUpdateCafe(data.cafe);
            localStorage.setItem('ownerCafe', JSON.stringify(data.cafe));
        } catch (err) {
            setErrorMsg(err.message || 'Error occurred while updating settings');
        } finally {
            setLoading(false);
        }
    };

    const getQRScanUrl = () => {
        return `${window.location.origin}/${cafe.slug}`;
    };

    const formatDate = (isoString) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
                date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch (e) {
            return isoString;
        }
    };

    // Calculate loyalty statistics dynamically from actual transactions
    const totalClaims = transactions.filter(t => t.coupon_id).length;
    const totalVisits = transactions.length;
    const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(t.payable_amount || 0), 0);

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Navigation Header */}
            <header className="navbar">
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="nav-brand">
                        <div className="nav-logo-icon">🎟️</div>
                        <span>{cafe.name} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>Dashboard</span></span>
                    </div>

                    <button
                        onClick={onLogout}
                        className="btn btn-secondary"
                        style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '10px' }}
                    >
                        Sign Out
                    </button>
                </div>
            </header>

            {/* Main Dashboard Layout */}
            <div className="dashboard-container container">
                <aside className="dashboard-sidebar">
                    <ul className="sidebar-menu">
                        <li className="sidebar-item">
                            <button
                                onClick={() => { setActiveTab('overview'); setSuccessMsg(''); setErrorMsg(''); }}
                                className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`}
                                style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
                            >
                                📊 Overview
                            </button>
                        </li>
                        <li className="sidebar-item">
                            <button
                                onClick={() => { setActiveTab('settings'); setSuccessMsg(''); setErrorMsg(''); }}
                                className={`sidebar-link ${activeTab === 'settings' ? 'active' : ''}`}
                                style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
                            >
                                ⚙️ Settings
                            </button>
                        </li>
                        <li className="sidebar-item">
                            <button
                                onClick={() => { setActiveTab('coupons'); setSuccessMsg(''); setErrorMsg(''); }}
                                className={`sidebar-link ${activeTab === 'coupons' ? 'active' : ''}`}
                                style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
                            >
                                🔑 Loyalty Coupons
                            </button>
                        </li>
                        <li className="sidebar-item">
                            <button
                                onClick={() => { setActiveTab('ads'); setSuccessMsg(''); setErrorMsg(''); }}
                                className={`sidebar-link ${activeTab === 'ads' ? 'active' : ''}`}
                                style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
                            >
                                📢 Ads Manager
                            </button>
                        </li>
                    </ul>

                    <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(139, 92, 246, 0.03)', borderRadius: '16px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '16px', letterSpacing: '0.5px' }}>
                            Counter QR Code
                        </h4>

                        <div style={{ background: '#0b0a0f', padding: '12px', borderRadius: '12px', display: 'inline-block', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=8b5cf6&bgcolor=0b0a0f&data=${encodeURIComponent(getQRScanUrl())}`}
                                alt="Cafe Counter QR Code"
                                style={{ display: 'block', width: '150px', height: '150px' }}
                            />
                        </div>

                        <a
                            href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&color=8b5cf6&bgcolor=0b0a0f&data=${encodeURIComponent(getQRScanUrl())}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ width: '100%', padding: '8px 12px', fontSize: '13px', display: 'inline-flex', justifyContent: 'center' }}
                        >
                            📥 Print / Download
                        </a>

                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', lineHeight: '1.4' }}>
                            Customers scan this counter QR to instantly view, claim and verify available loyalty rewards on their phone.
                        </p>
                    </div>
                </aside>

                <main className="dashboard-content">
                    {successMsg && (
                        <div className="alert-banner alert-success">
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{successMsg}</span>
                        </div>
                    )}

                    {errorMsg && (
                        <div className="alert-banner alert-error">
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {activeTab === 'overview' && (
                        <div>
                            <div style={{ marginBottom: '32px' }}>
                                <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Welcome back, {cafe.owner_name}!</h2>
                                <p style={{ color: 'var(--text-secondary)' }}>Manage your customer loyalty offers, track redemptions, and view transactions here.</p>
                            </div>

                            {/* Stats Counters */}
                            <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                <div className="card stat-card" style={{ padding: '16px' }}>
                                    <div className="stat-label" style={{ fontSize: '11px' }}>Total Visits</div>
                                    <div className="stat-value" style={{ fontSize: '22px' }}>{totalVisits}</div>
                                </div>
                                <div className="card stat-card" style={{ padding: '16px' }}>
                                    <div className="stat-label" style={{ fontSize: '11px' }}>Loyalty Claims</div>
                                    <div className="stat-value" style={{ fontSize: '22px' }}>{totalClaims}</div>
                                </div>
                                <div className="card stat-card" style={{ padding: '16px' }}>
                                    <div className="stat-label" style={{ fontSize: '11px' }}>Total Revenue</div>
                                    <div className="stat-value" style={{ fontSize: '22px' }}>₹{totalRevenue.toFixed(2)}</div>
                                </div>
                                <div className="card stat-card" style={{ padding: '16px', borderLeft: '3px solid #A855F7' }}>
                                    <div className="stat-label" style={{ fontSize: '11px', color: '#A855F7' }}>New Customers</div>
                                    <div className="stat-value" style={{ fontSize: '22px' }}>{metrics.newCustomers}</div>
                                </div>
                                <div className="card stat-card" style={{ padding: '16px', borderLeft: '3px solid #10B981' }}>
                                    <div className="stat-label" style={{ fontSize: '11px', color: '#10B981' }}>Repeat Customers</div>
                                    <div className="stat-value" style={{ fontSize: '22px' }}>{metrics.repeatCustomers}</div>
                                </div>
                            </div>

                            {/* Customer Acquisition & Retention Analytics Bar */}
                            {(metrics.newCustomers > 0 || metrics.repeatCustomers > 0) && (
                                <div className="card" style={{ textAlign: 'left', marginBottom: '32px', padding: '20px 24px' }}>
                                    <h3 style={{ fontSize: '16px', marginBottom: '14px', color: '#fff', fontWeight: 600 }}>
                                        Customer Traffic Distribution (Acquisition vs. Retention)
                                    </h3>
                                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                                        <div style={{ flexGrow: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                                <span>New Customers ({metrics.newCustomers})</span>
                                                <span>Repeat Customers ({metrics.repeatCustomers})</span>
                                            </div>
                                            <div style={{ width: '100%', height: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '5px', display: 'flex', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${(metrics.newCustomers / (metrics.newCustomers + metrics.repeatCustomers)) * 100}%`,
                                                    height: '100%',
                                                    backgroundColor: '#A855F7',
                                                    transition: 'width 0.4s ease'
                                                }}></div>
                                                <div style={{
                                                    width: `${(metrics.repeatCustomers / (metrics.newCustomers + metrics.repeatCustomers)) * 100}%`,
                                                    height: '100%',
                                                    backgroundColor: '#10B981',
                                                    transition: 'width 0.4s ease'
                                                }}></div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '11px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#A855F7', borderRadius: '50%' }}></span>
                                                    <span>New: {((metrics.newCustomers / (metrics.newCustomers + metrics.repeatCustomers)) * 100).toFixed(0)}%</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%' }}></span>
                                                    <span>Repeat: {((metrics.repeatCustomers / (metrics.newCustomers + metrics.repeatCustomers)) * 100).toFixed(0)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}



                            {/* Coupons & Transaction lists */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                                <div className="card" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', height: '400px' }}>
                                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Active Loyalty Coupons</h3>
                                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                                        {coupons.length === 0 ? (
                                            <div style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '48px 0', textAlign: 'center' }}>
                                                🔑 No active coupons created yet.
                                            </div>
                                        ) : (
                                            coupons.map((coupon) => {
                                                const total = coupon.max_uses ?? coupon.frequency_per_day ?? 1;
                                                const remaining = coupon.remaining_uses !== undefined ? coupon.remaining_uses : total;
                                                const claimed = Math.max(0, total - remaining);
                                                return (
                                                    <div key={coupon.id} style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <strong style={{ color: '#fff', fontSize: '14px' }}>{coupon.title}</strong>
                                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                {claimed} / {total} Claimed
                                                            </span>
                                                        </div>
                                                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>{coupon.desc_text}</p>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                                            <span style={{ fontSize: '11px', color: '#34D399', fontWeight: 600 }}>
                                                                {coupon.discount_type === 'percent' ? `${coupon.discount_value}% Off` : `₹${coupon.discount_value} Off`}
                                                            </span>
                                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                {remaining} remaining
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                                <div className="card" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', height: '400px' }}>
                                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Recent Reconciled Transactions</h3>
                                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                                        {transactions.length === 0 ? (
                                            <div style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '48px 0', textAlign: 'center' }}>
                                                📈 No coupon redemptions recorded yet.
                                            </div>
                                        ) : (
                                            [...transactions].reverse().map((txn) => {
                                                const couponTitle = txn.coupons?.title || (coupons.find(c => c.id === txn.coupon_id)?.title) || 'Loyalty Discount';
                                                const userName = txn.users?.name || 'Customer';
                                                const userEmail = txn.users?.email || '';
                                                return (
                                                    <div key={txn.id} style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div>
                                                                <strong style={{ color: '#fff', fontSize: '14px' }}>{userName}</strong>
                                                                {userEmail && <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: '6px' }}>({userEmail})</span>}
                                                            </div>
                                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                {formatDate(txn.created_at)}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                                                            <span style={{ background: 'rgba(139, 92, 246, 0.08)', color: '#C084FC', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                                                                🏷️ {couponTitle}
                                                            </span>
                                                            <span style={{ color: 'var(--text-secondary)' }}>
                                                                Paid <strong style={{ color: '#10B981' }}>₹{txn.payable_amount.toFixed(2)}</strong> (Saved ₹{txn.discount_amount.toFixed(2)})
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="card" style={{ textAlign: 'left', maxWidth: '650px' }}>
                            <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Store & Reconciliations Settings</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Update payment credentials, contact email, and branch locator fields.</p>

                            <form onSubmit={handleUpdateSettings}>
                                <div className="form-group">
                                    <label className="form-label">Cafe Display Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Slug will remain: {cafe?.slug}</p>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Owner Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={ownerName}
                                        onChange={(e) => setOwnerName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Owner Copy Email (for Invoicing Reconciliations)</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Cafe Physical Address</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Cafe Merchant UPI ID (e.g. cafe-owner@oksbi)</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={upiId}
                                        onChange={(e) => setUpiId(e.target.value)}
                                        placeholder="Enter UPI VPA address"
                                    />
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Used to direct checkout deep links. Skip for now if testing.</p>
                                </div>

                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <input
                                        type="checkbox"
                                        id="allow_platform_coupons"
                                        checked={allowPlatformCoupons}
                                        onChange={(e) => setAllowPlatformCoupons(e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="allow_platform_coupons" style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 'normal', color: '#fff', margin: 0 }}>
                                        Accept Platform Promo Codes / Welcome Coupons
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%', marginTop: '10px' }}
                                    disabled={loading}
                                >
                                    {loading ? 'Saving Settings...' : 'Save Configuration'}
                                </button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'coupons' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', textAlign: 'left' }}>
                            {/* Left: Coupons Form */}
                            <div className="card" style={{ height: 'fit-content' }}>
                                <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Create Loyalty Reward</h2>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>Add dynamic discount rules that customers scan and apply.</p>

                                <form onSubmit={handleCreateCoupon}>
                                    <div className="form-group">
                                        <label className="form-label">Coupon Title</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={couponTitle}
                                            onChange={(e) => setCouponTitle(e.target.value)}
                                            placeholder="e.g. Buy 1 Get 1 Coffee"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Description Text</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={couponDesc}
                                            onChange={(e) => setCouponDesc(e.target.value)}
                                            placeholder="e.g. Buy any hot beverage, get second brew free"
                                            required
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div className="form-group">
                                            <label className="form-label">Badge Tag</label>
                                            <select
                                                className="form-input"
                                                value={couponBadge}
                                                onChange={(e) => setCouponBadge(e.target.value)}
                                                style={{ background: '#1c1b22', border: '1px solid var(--border-color)', height: '42px', color: '#fff', borderRadius: '8px', padding: '0 12px' }}
                                            >
                                                <option value="Save">Save</option>
                                                <option value="Combo">Combo</option>
                                                <option value="Limit">Limit</option>
                                                <option value="Special">Special</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Discount Type</label>
                                            <select
                                                className="form-input"
                                                value={discountType}
                                                onChange={(e) => setDiscountType(e.target.value)}
                                                style={{ background: '#1c1b22', border: '1px solid var(--border-color)', height: '42px', color: '#fff', borderRadius: '8px', padding: '0 12px' }}
                                            >
                                                <option value="percent">Percentage Off</option>
                                                <option value="flat">Flat Rupees Off</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                        <div className="form-group">
                                            <label className="form-label">Discount Value</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={discountValue}
                                                onChange={(e) => setDiscountValue(e.target.value)}
                                                placeholder={discountType === 'percent' ? 'e.g. 15 (%)' : 'e.g. 100 (₹)'}
                                                min="1"
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Usage Limit</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={frequency}
                                                onChange={(e) => setFrequency(e.target.value)}
                                                placeholder="e.g. 100"
                                                min="1"
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Min Spend (₹)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={minBillAmount}
                                                onChange={(e) => setMinBillAmount(e.target.value)}
                                                placeholder="e.g. 0"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ width: '100%', marginTop: '12px', height: '44px' }}
                                        disabled={couponLoading}
                                    >
                                        {couponLoading ? 'Creating Reward...' : 'Create Coupon Code'}
                                    </button>
                                </form>
                            </div>

                            {/* Right: Existing List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', margin: 0, paddingBottom: '4px', gap: '16px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setCouponFilterTab('active')}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: couponFilterTab === 'active' ? 'var(--color-accent)' : 'var(--text-muted)',
                                            fontWeight: 600,
                                            fontSize: '15px',
                                            cursor: 'pointer',
                                            outline: 'none',
                                            paddingBottom: '6px',
                                            borderBottom: couponFilterTab === 'active' ? '2px solid var(--color-accent)' : 'none'
                                        }}
                                    >
                                        Active Rules ({coupons.filter(c => c.is_active !== false).length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCouponFilterTab('archived')}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: couponFilterTab === 'archived' ? 'var(--color-accent)' : 'var(--text-muted)',
                                            fontWeight: 600,
                                            fontSize: '15px',
                                            cursor: 'pointer',
                                            outline: 'none',
                                            paddingBottom: '6px',
                                            borderBottom: couponFilterTab === 'archived' ? '2px solid var(--color-accent)' : 'none'
                                        }}
                                    >
                                        Archived ({coupons.filter(c => c.is_active === false).length})
                                    </button>
                                </div>

                                {coupons.filter(c => couponFilterTab === 'active' ? c.is_active !== false : c.is_active === false).length === 0 ? (
                                    <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        {couponFilterTab === 'active' ? 'No active coupons created yet.' : 'No archived coupons.'}
                                    </div>
                                ) : (
                                    coupons
                                        .filter(c => couponFilterTab === 'active' ? c.is_active !== false : c.is_active === false)
                                        .map((coupon) => {
                                            const total = coupon.max_uses ?? coupon.frequency_per_day ?? 1;
                                            const remaining = coupon.remaining_uses !== undefined ? coupon.remaining_uses : total;
                                            const claimed = Math.max(0, total - remaining);
                                            return (
                                                <div key={coupon.id} className="card" style={{ padding: '20px', borderLeft: coupon.is_active !== false ? '3px solid var(--color-accent)' : '3px solid var(--text-muted)', opacity: coupon.is_active !== false ? 1 : 0.75 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <span
                                                            style={{
                                                                background: coupon.badge_label === 'Save' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                                border: coupon.badge_label === 'Save' ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                                                                color: coupon.badge_label === 'Save' ? '#C084FC' : '#34D399',
                                                                padding: '2px 8px',
                                                                borderRadius: '100px',
                                                                fontSize: '10px',
                                                                fontWeight: 600,
                                                                textTransform: 'uppercase'
                                                            }}
                                                        >
                                                            {coupon.badge_label}
                                                        </span>
                                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                            Claimed: {claimed} / {total} ({remaining} remaining)
                                                        </span>
                                                    </div>
                                                    <h4 style={{ fontSize: '16px', margin: '4px 0', color: '#fff' }}>{coupon.title}</h4>
                                                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 12px 0' }}>{coupon.desc_text}</p>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <div style={{ fontSize: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', display: 'inline-block', padding: '6px 12px', borderRadius: '6px', color: 'var(--text-secondary)' }}>
                                                                Rule: <strong style={{ color: '#fff' }}>{coupon.discount_type === 'percent' ? `${coupon.discount_value}% Off` : `₹${coupon.discount_value} Off`}</strong>
                                                            </div>
                                                            {parseFloat(coupon.min_bill_amount || 0) > 0 && (
                                                                <div style={{ fontSize: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'inline-block', padding: '6px 12px', borderRadius: '6px', color: '#F87171' }}>
                                                                    Min Spend: <strong style={{ color: '#fff' }}>₹{parseFloat(coupon.min_bill_amount).toFixed(2)}</strong>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            disabled={togglingCouponId === coupon.id}
                                                            onClick={() => handleToggleActive(coupon.id, coupon.is_active !== false)}
                                                            onMouseEnter={() => setHoveredBtnId(coupon.id)}
                                                            onMouseLeave={() => setHoveredBtnId(null)}
                                                            style={{
                                                                fontSize: '11px',
                                                                padding: '6px 12px',
                                                                borderRadius: '6px',
                                                                background: togglingCouponId === coupon.id
                                                                    ? 'rgba(255,255,255,0.05)'
                                                                    : (coupon.is_active !== false
                                                                        ? (hoveredBtnId === coupon.id ? '#EF4444' : 'rgba(239, 68, 68, 0.08)')
                                                                        : (hoveredBtnId === coupon.id ? '#10B981' : 'rgba(16, 185, 129, 0.08)')
                                                                    ),
                                                                border: coupon.is_active !== false
                                                                    ? '1px solid rgba(239, 68, 68, 0.2)'
                                                                    : '1px solid rgba(16, 185, 129, 0.2)',
                                                                color: togglingCouponId === coupon.id
                                                                    ? 'var(--text-muted)'
                                                                    : (hoveredBtnId === coupon.id
                                                                        ? '#fff'
                                                                        : (coupon.is_active !== false ? '#F87171' : '#34D399')
                                                                    ),
                                                                cursor: togglingCouponId === coupon.id ? 'not-allowed' : 'pointer',
                                                                outline: 'none',
                                                                fontWeight: 600,
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                        >
                                                            {togglingCouponId === coupon.id
                                                                ? (coupon.is_active !== false ? 'Archiving...' : 'Restoring...')
                                                                : (coupon.is_active !== false ? 'Archive' : 'Restore')
                                                            }
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'ads' && (
                        <div>
                            <div style={{ marginBottom: '32px' }}>
                                <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>📢 Ads Manager</h2>
                                <p style={{ color: 'var(--text-secondary)' }}>Launch targeted promotions, display banners across the RedPerks customer wallet feed, and measure real-time marketing ROI.</p>
                            </div>

                            {/* Ad Stats Row */}
                            <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                                <div className="card stat-card" style={{ padding: '16px' }}>
                                    <div className="stat-label" style={{ fontSize: '11px' }}>Total Ad Budget</div>
                                    <div className="stat-value" style={{ fontSize: '22px' }}>₹{adCampaigns.reduce((sum, c) => sum + c.budget, 0).toFixed(2)}</div>
                                </div>
                                <div className="card stat-card" style={{ padding: '16px' }}>
                                    <div className="stat-label" style={{ fontSize: '11px' }}>Total Impressions</div>
                                    <div className="stat-value" style={{ fontSize: '22px' }}>{adCampaigns.reduce((sum, c) => sum + c.impressions, 0)}</div>
                                </div>
                                <div className="card stat-card" style={{ padding: '16px' }}>
                                    <div className="stat-label" style={{ fontSize: '11px' }}>Total Click-Throughs</div>
                                    <div className="stat-value" style={{ fontSize: '22px' }}>{adCampaigns.reduce((sum, c) => sum + c.clicks, 0)}</div>
                                </div>
                                <div className="card stat-card" style={{ padding: '16px', borderLeft: '3px solid #10B981' }}>
                                    <div className="stat-label" style={{ fontSize: '11px', color: '#10B981' }}>Average CTR</div>
                                    <div className="stat-value" style={{ fontSize: '22px' }}>
                                        {(() => {
                                            const totalImp = adCampaigns.reduce((sum, c) => sum + c.impressions, 0);
                                            const totalClk = adCampaigns.reduce((sum, c) => sum + c.clicks, 0);
                                            return totalImp > 0 ? `${((totalClk / totalImp) * 100).toFixed(1)}%` : '0.0%';
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', textAlign: 'left' }}>
                                {/* Left side: Launch Ad Form */}
                                <div className="card" style={{ height: 'fit-content' }}>
                                    <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>🚀 Launch Ad Campaign</h3>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '13px' }}>Reach nearby shoppers with targeted mobile wallet banners.</p>

                                    <form onSubmit={handleCreateAdCampaign}>
                                        <div className="form-group">
                                            <label className="form-label">Ad Campaign Title</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={adTitle}
                                                onChange={(e) => setAdTitle(e.target.value)}
                                                placeholder="e.g. Free Dessert with Main Course"
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Campaign Target Audience</label>
                                            <select
                                                className="form-input"
                                                value={adAudience}
                                                onChange={(e) => setAdAudience(e.target.value)}
                                                style={{ background: '#1c1b22', border: '1px solid var(--border-color)', height: '42px', color: '#fff', borderRadius: '8px', padding: '0 12px', width: '100%' }}
                                            >
                                                <option value="All Customers">All Local Customers</option>
                                                <option value="Foodies">Foodies & Diners</option>
                                                <option value="Students">College Students</option>
                                                <option value="Working Professionals">Working Professionals</option>
                                            </select>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div className="form-group">
                                                <label className="form-label">Total Budget (₹)</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={adBudget}
                                                    onChange={(e) => setAdBudget(e.target.value)}
                                                    placeholder="e.g. 5000"
                                                    min="500"
                                                    required
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Ad Duration</label>
                                                <select
                                                    className="form-input"
                                                    value={adDuration}
                                                    onChange={(e) => setAdDuration(e.target.value)}
                                                    style={{ background: '#1c1b22', border: '1px solid var(--border-color)', height: '42px', color: '#fff', borderRadius: '8px', padding: '0 12px', width: '100%' }}
                                                >
                                                    <option value="3 Days">3 Days</option>
                                                    <option value="5 Days">5 Days</option>
                                                    <option value="7 Days">7 Days</option>
                                                    <option value="15 Days">15 Days</option>
                                                    <option value="30 Days">30 Days</option>
                                                </select>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            style={{ width: '100%', marginTop: '12px', height: '44px' }}
                                        >
                                            Publish Campaign Live
                                        </button>
                                    </form>
                                </div>

                                {/* Right side: Ad Campaigns list */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <h3 style={{ fontSize: '20px', margin: 0, paddingBottom: '4px' }}>Active Campaigns</h3>
                                    {adCampaigns.length === 0 ? (
                                        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No advertising campaigns launched yet.
                                        </div>
                                    ) : (
                                        adCampaigns.map((ad) => (
                                            <div key={ad.id} className="card" style={{ padding: '20px', borderLeft: ad.status === 'Running' ? '3px solid #10B981' : ad.status === 'Paused' ? '3px solid #F59E0B' : '3px solid var(--text-muted)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <span style={{
                                                        background: ad.status === 'Running' ? 'rgba(16, 185, 129, 0.1)' : ad.status === 'Paused' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.05)',
                                                        border: ad.status === 'Running' ? '1px solid rgba(16, 185, 129, 0.3)' : ad.status === 'Paused' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-color)',
                                                        color: ad.status === 'Running' ? '#34D399' : ad.status === 'Paused' ? '#FBBF24' : 'var(--text-muted)',
                                                        padding: '2px 8px',
                                                        borderRadius: '100px',
                                                        fontSize: '10px',
                                                        fontWeight: 600,
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {ad.status}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                        Target: <strong>{ad.audience}</strong> ({ad.duration})
                                                    </span>
                                                </div>
                                                <h4 style={{ fontSize: '16px', margin: '4px 0', color: '#fff' }}>{ad.title}</h4>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <div>
                                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Impressions</div>
                                                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{ad.impressions}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Clicks</div>
                                                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{ad.clicks}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Spend / Budget</div>
                                                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#34D399' }}>₹{ad.status === 'Running' ? (ad.budget * 0.15).toFixed(0) : ad.budget} / ₹{ad.budget}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
}
