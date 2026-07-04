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

    useEffect(() => {
        if (!token || !cafe) {
            navigate('/auth');
        }
    }, [token, cafe, navigate]);

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
                    </ul>

                    <div style={{ marginTop: '40px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                            QR Code Scanner Link
                        </h4>
                        <p style={{ fontSize: '12px', color: '#c084fc', wordBreak: 'break-all', fontWeight: '500' }}>
                            {getQRScanUrl()}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                            Print this QR link for customer scanning at the checkout counter.
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
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Slug will remain: {cafe.slug}</p>
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
                </main>
            </div>
        </div>
    );
}
