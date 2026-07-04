import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

    // Coupons State Fields
    const [coupons, setCoupons] = useState([]);
    const [couponTitle, setCouponTitle] = useState('');
    const [couponDesc, setCouponDesc] = useState('');
    const [couponBadge, setCouponBadge] = useState('Save');
    const [discountType, setDiscountType] = useState('percent');
    const [discountValue, setDiscountValue] = useState('');
    const [frequency, setFrequency] = useState('1');
    const [couponLoading, setCouponLoading] = useState(false);

    // Fetch Cafe coupons list
    const fetchCoupons = async () => {
        if (!cafe?.slug) return;
        try {
            const res = await fetch(`http://localhost:5000/api/cafe/${cafe.slug}`);
            const data = await res.json();
            if (data.success) {
                setCoupons(data.coupons || []);
            }
        } catch (err) {
            console.error('Error fetching store coupons:', err);
        }
    };

    useEffect(() => {
        if (cafe?.slug) {
            fetchCoupons();
        }
    }, [cafe?.slug]);

    useEffect(() => {
        if (!token || !cafe) {
            navigate('/auth');
        }
    }, [token, cafe, navigate]);

    const handleCreateCoupon = async (e) => {
        e.preventDefault();
        setSuccessMsg('');
        setErrorMsg('');
        setCouponLoading(true);

        try {
            const response = await fetch('http://localhost:5000/api/cafe/coupons', {
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
                    frequency_per_day: parseInt(frequency)
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

            // Refresh coupons list
            await fetchCoupons();
            setActiveTab('coupons');
        } catch (err) {
            setErrorMsg(err.message || 'Error occurred while creating coupon');
        } finally {
            setCouponLoading(false);
        }
    };

    const handleUpdateSettings = async (e) => {
        e.preventDefault();
        setSuccessMsg('');
        setErrorMsg('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:5000/api/cafe/update', {
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
                    upi_id: upiId
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

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Navigation Header */}
            <header className="navbar">
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="nav-brand">
                        <div className="nav-logo-icon">☕</div>
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
                            <div className="dashboard-stats">
                                <div className="card stat-card">
                                    <div className="stat-label">Total Visits</div>
                                    <div className="stat-value">0</div>
                                </div>
                                <div className="card stat-card">
                                    <div className="stat-label">Loyalty Claims</div>
                                    <div className="stat-value">0</div>
                                </div>
                                <div className="card stat-card">
                                    <div className="stat-label">Discount Given</div>
                                    <div className="stat-value">₹0.00</div>
                                </div>
                            </div>

                            {/* Cafe Profile overview card */}
                            <div className="card" style={{ textAlign: 'left', marginBottom: '32px' }}>
                                <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
                                    Cafe Information
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                    <div>
                                        <h4 style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, textTransform: 'uppercase' }}>Cafe Name</h4>
                                        <p style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginTop: '4px' }}>{cafe.name}</p>
                                    </div>
                                    <div>
                                        <h4 style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, textTransform: 'uppercase' }}>Branch Slug</h4>
                                        <p style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginTop: '4px' }}>{cafe.slug}</p>
                                    </div>
                                    <div>
                                        <h4 style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, textTransform: 'uppercase' }}>Registered Email</h4>
                                        <p style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginTop: '4px' }}>{cafe.email}</p>
                                    </div>
                                    <div>
                                        <h4 style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, textTransform: 'uppercase' }}>Registered Address</h4>
                                        <p style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginTop: '4px' }}>{cafe.address || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <h4 style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, textTransform: 'uppercase' }}>UPI ID (Payment Address)</h4>
                                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#C084FC', marginTop: '4px' }}>{cafe.upi_id || 'Not Set (Set in Settings)'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Coupons & Transaction placeholder */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                                <div className="card" style={{ textAlign: 'left' }}>
                                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Active Loyalty Coupons</h3>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '24px 0', textAlign: 'center' }}>
                                        🔑 Coupons management will be visible once Customer Flow is implemented.
                                    </div>
                                </div>
                                <div className="card" style={{ textAlign: 'left' }}>
                                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Recent Reconciled Transactions</h3>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '24px 0', textAlign: 'center' }}>
                                        📈 Reconciliations will populate when customers submit payments.
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

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                                            <label className="form-label">Daily Use Limit</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={frequency}
                                                onChange={(e) => setFrequency(e.target.value)}
                                                placeholder="e.g. 1"
                                                min="1"
                                                required
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
                                <h3 style={{ margin: 0, paddingLeft: '4px' }}>Active Loyalty Codes ({coupons.length})</h3>
                                {coupons.length === 0 ? (
                                    <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No coupons created yet. Use the editor to add your first deal!
                                    </div>
                                ) : (
                                    coupons.map((coupon) => (
                                        <div key={coupon.id} className="card" style={{ padding: '20px', borderLeft: '3px solid var(--color-accent)' }}>
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
                                                    Limit: {coupon.frequency_per_day}/day
                                                </span>
                                            </div>
                                            <h4 style={{ fontSize: '16px', margin: '4px 0', color: '#fff' }}>{coupon.title}</h4>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 12px 0' }}>{coupon.desc_text}</p>

                                            <div style={{ fontSize: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', display: 'inline-block', padding: '6px 12px', borderRadius: '6px', color: 'var(--text-secondary)' }}>
                                                Rule: <strong style={{ color: '#fff' }}>{coupon.discount_type === 'percent' ? `${coupon.discount_value}% Off` : `₹${coupon.discount_value} Off`}</strong>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
}
