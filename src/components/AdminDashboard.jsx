import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const getInitials = (name) => {
    if (!name) return 'AG';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase();
};

const getAvatarBg = (name) => {
    if (!name) return 'linear-gradient(135deg, #EF4444, #F59E0B)';
    const sum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const themes = [
        'linear-gradient(135deg, #EF4444, #F59E0B)', // Red-Orange
        'linear-gradient(135deg, #8B5CF6, #EC4899)', // Purple-Pink
        'linear-gradient(135deg, #3B82F6, #10B981)', // Blue-Green
        'linear-gradient(135deg, #EC4899, #F43F5E)', // Pink-Rose
        'linear-gradient(135deg, #06B6D4, #3B82F6)'  // Cyan-Blue
    ];
    return themes[sum % themes.length];
};

export default function AdminDashboard() {
    const [token, setToken] = useState(() => localStorage.getItem('adminToken') || '');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    // Dashboard Status
    const [customers, setCustomers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Coupon Modal Status
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUserEmail, setSelectedUserEmail] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [couponTitle, setCouponTitle] = useState('');
    const [couponDesc, setCouponDesc] = useState('');
    const [discountType, setDiscountType] = useState('flat');
    const [discountValue, setDiscountValue] = useState('');
    const [minBillAmount, setMinBillAmount] = useState('0');
    const [maxUses, setMaxUses] = useState('1');
    const [sendingCoupon, setSendingCoupon] = useState(false);

    // Check Code First states
    const [checkStatus, setCheckStatus] = useState('idle'); // 'idle', 'checking', 'available', 'active', 'depleted'
    const [checkInfo, setCheckInfo] = useState(null);
    const [checkError, setCheckError] = useState('');

    useEffect(() => {
        if (token) {
            fetchCustomers();
        }
    }, [token]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('adminToken', data.token);
                setToken(data.token);
            } else {
                setLoginError(data.message || 'Invalid credentials');
            }
        } catch (err) {
            setLoginError('Server authentication failed');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        setToken('');
        setCustomers([]);
    };

    const fetchCustomers = async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/customers`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setCustomers(data.customers || []);
            } else {
                setErrorMessage(data.message || 'Failed to fetch customer list');
                if (res.status === 401 || res.status === 403) {
                    handleLogout();
                }
            }
        } catch (err) {
            setErrorMessage('Network error fetching customer database');
        } finally {
            setLoading(false);
        }
    };

    const openSendModal = (userEmail) => {
        setSelectedUserEmail(userEmail);
        setCouponCode('');
        setCouponTitle('');
        setCouponDesc('');
        setDiscountType('flat');
        setDiscountValue('');
        setMinBillAmount('0');
        setMaxUses('1');
        setSuccessMessage('');
        setErrorMessage('');
        setCheckStatus('idle');
        setCheckInfo(null);
        setCheckError('');
        setIsModalOpen(true);
    };

    const handleCheckCode = async () => {
        if (!couponCode.trim()) {
            setCheckError('Please enter a promo code to check');
            return;
        }
        setCheckStatus('checking');
        setCheckError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/coupons/check/${encodeURIComponent(couponCode.trim())}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                if (data.exists) {
                    const c = data.coupon;
                    setCouponTitle(c.title || '');
                    setCouponDesc(c.desc_text || '');
                    setDiscountType(c.discount_type || 'flat');
                    setDiscountValue(c.discount_value !== undefined ? c.discount_value.toString() : '');
                    setMinBillAmount(c.min_bill_amount !== undefined ? c.min_bill_amount.toString() : '0');
                    setMaxUses(c.max_uses !== undefined ? c.max_uses.toString() : '1');

                    if (data.usage.remainingUses > 0) {
                        setCheckStatus('active');
                    } else {
                        setCheckStatus('depleted');
                    }
                    setCheckInfo(data.usage);
                } else {
                    setCheckStatus('available');
                    setCheckInfo(null);
                    setCouponTitle('');
                    setCouponDesc('');
                    setDiscountType('flat');
                    setDiscountValue('');
                    setMinBillAmount('0');
                    setMaxUses('1');
                }
            } else {
                setCheckError(data.message || 'Failed to check code');
                setCheckStatus('idle');
            }
        } catch (err) {
            setCheckError('Connection to server failed');
            setCheckStatus('idle');
        }
    };

    const handleSendCoupon = async () => {
        if (checkStatus === 'idle' || checkStatus === 'checking') {
            setErrorMessage('Please check code availability first.');
            return;
        }

        setSendingCoupon(true);
        setErrorMessage('');
        setSuccessMessage('');

        const isOverwrite = checkStatus === 'depleted';

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/coupons`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    code: couponCode.trim(),
                    title: couponTitle,
                    desc_text: couponDesc,
                    badge_label: 'Special',
                    discount_type: discountType,
                    discount_value: parseFloat(discountValue),
                    min_bill_amount: parseFloat(minBillAmount || 0),
                    max_uses: parseInt(maxUses || 1),
                    target_email: selectedUserEmail,
                    overwrite: isOverwrite
                })
            });

            const data = await res.json();
            if (res.status === 201 || (res.status === 200 && data.success)) {
                setSuccessMessage(data.message || 'Promo code dispatched successfully!');
                setIsModalOpen(false);
                fetchCustomers();
            } else {
                setErrorMessage(data.message || 'Failed to dispatch promo code.');
            }
        } catch (err) {
            setErrorMessage('Network error processing promo code.');
        } finally {
            setSendingCoupon(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // --- RENDER LOGIN VIEW ---
    if (!token) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#0B0A0F', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '16px', fontFamily: 'var(--font-sans)', color: '#F3F4F6', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-10%', left: '20%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(0, 0, 0, 0) 70%)', pointerEvents: 'none', filter: 'blur(80px)' }}></div>
                <div style={{ position: 'absolute', bottom: '-10%', right: '20%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, rgba(0, 0, 0, 0) 70%)', pointerEvents: 'none', filter: 'blur(80px)' }}></div>

                <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '40px', textAlign: 'center', position: 'relative' }}>
                    <div style={{ marginBottom: '32px' }}>
                        <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1px', background: 'linear-gradient(135deg, #EF4444 30%, #F59E0B 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                            RedPerks Admin
                        </h1>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px', margin: 0 }}>Sign in to platform manager portal</p>
                    </div>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                        {loginError && (
                            <div className="alert-banner alert-error" style={{ padding: '10px 14px', fontSize: '13px', margin: 0 }}>
                                ⚠️ {loginError}
                            </div>
                        )}

                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Administrator Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="admin@redperks.com"
                                className="form-input"
                            />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Secure Account Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••••••"
                                className="form-input"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '10px', padding: '14px' }}
                        >
                            Sign In to System
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- RENDER DASHBOARD VIEW ---
    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#0B0A0F', color: '#F3F4F6', fontFamily: 'var(--font-sans)', padding: '40px 24px', position: 'relative', overflowX: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, rgba(0, 0, 0, 0) 70%)', pointerEvents: 'none', filter: 'blur(80px)' }}></div>
            <div style={{ position: 'absolute', top: '30%', left: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(239, 68, 68, 0.05) 0%, rgba(0, 0, 0, 0) 70%)', pointerEvents: 'none', filter: 'blur(80px)' }}></div>

            {/* Container Header */}
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', maxWidth: '1100px', margin: '0 auto 32px auto' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', background: 'linear-gradient(135deg, #FFF 30%, #C084FC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                        RedPerks Platform Admin Center
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
                        Dispatch, control, and schedule private customer discount rewards
                    </p>
                </div>
                <button
                    onClick={handleLogout}
                    className="btn btn-secondary"
                    style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '13px' }}
                >
                    Sign Out
                </button>
            </div>

            {/* Success / Error Banners */}
            {(successMessage || errorMessage) && (
                <div style={{ maxWidth: '1100px', margin: '0 auto 20px auto' }}>
                    {successMessage && (
                        <div className="alert-banner alert-success" style={{ margin: 0 }}>
                            {successMessage}
                        </div>
                    )}
                    {errorMessage && (
                        <div className="alert-banner alert-error" style={{ margin: 0 }}>
                            {errorMessage}
                        </div>
                    )}
                </div>
            )}

            {/* Stats Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px', maxWidth: '1100px', margin: '0 auto 32px auto' }}>
                <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.2)', backgroundColor: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C084FC' }}>
                        <svg style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Registered Customers</p>
                        <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#FFF', marginTop: '4px', margin: 0 }}>{customers.length}</h3>
                    </div>
                </div>

                <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', border: '1px solid rgba(220, 100, 40, 0.2)', backgroundColor: 'rgba(220, 100, 40, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
                        <svg style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M4 7h16a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2zm11 0v10" />
                        </svg>
                    </div>
                    <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Active Campaigns</p>
                        <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#FFF', marginTop: '4px', margin: 0 }}>Platform Global</h3>
                    </div>
                </div>

                <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34D399', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', height: '8px', width: '8px' }}>
                            <span style={{ position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '50%', backgroundColor: '#34D399', opacity: 0.75, animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }}></span>
                            <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '50%', height: '8px', width: '8px', backgroundColor: '#10B981' }}></span>
                        </span>
                        <svg style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.22 0l-2.25 1.5" />
                        </svg>
                    </div>
                    <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Gateway Status</p>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', marginTop: '6px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Resend Courier <span style={{ color: '#34D399', fontSize: '11px', fontWeight: 400 }}>(Online)</span>
                        </h3>
                    </div>
                </div>
            </div>

            {/* Main Section */}
            <div className="card" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#FFF' }}>Platform Customers Directory</h2>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>Select a customer below to draft and email a discount promo code</p>
                    </div>

                    {/* Searching Input */}
                    <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="form-input"
                            style={{ paddingLeft: '40px', paddingRight: '16px', py: '10px', fontSize: '14px', margin: 0 }}
                        />
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <div style={{ width: '40px', height: '40px', border: '3px solid #EF4444', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
                        Connecting to customer database...
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No registered customer emails matching "{searchQuery}" were located in the system.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
                                    <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</th>
                                    <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</th>
                                    <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Joined</th>
                                    <th style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map((user) => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', transition: 'background-color 0.2s ease' }} className="table-row-hover">
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: getAvatarBg(user.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold', color: '#FFF', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                                                    {getInitials(user.name)}
                                                </div>
                                                <span style={{ fontWeight: 600, color: '#FFF' }}>{user.name || 'Anonymous Guest'}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '13px', verticalAlign: 'middle' }}>
                                            {user.email}
                                        </td>
                                        <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '13px', verticalAlign: 'middle' }}>
                                            {new Date(user.created_at).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right', verticalAlign: 'middle' }}>
                                            <button
                                                onClick={() => openSendModal(user.email)}
                                                className="btn btn-primary"
                                                style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px' }}
                                            >
                                                Send Promo Code
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* --- FORM MODAL DIALOG --- */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '520px', padding: '28px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="modal-close"
                            style={{ top: '20px', right: '20px' }}
                        >
                            &times;
                        </button>

                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: 800, background: 'linear-gradient(135deg, #FFF 30%, #C084FC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>Draft Promo Code</h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>Recipient: <span style={{ fontFamily: 'monospace', color: '#FFF' }}>{selectedUserEmail}</span></p>
                        </div>

                        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Step 1: Check Promo Code */}
                            <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#C084FC', margin: 0 }}>
                                    1. Enter & Verify Promo Code
                                </label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        placeholder="WELCOME50"
                                        value={couponCode}
                                        onChange={(e) => {
                                            setCouponCode(e.target.value.toUpperCase());
                                            if (checkStatus !== 'idle') {
                                                setCheckStatus('idle');
                                                setCheckInfo(null);
                                            }
                                        }}
                                        disabled={checkStatus === 'checking' || sendingCoupon}
                                        className="form-input"
                                        style={{ fontFamily: 'monospace', fontWeight: 750, letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCheckCode}
                                        disabled={checkStatus === 'checking' || sendingCoupon || !couponCode.trim()}
                                        className="btn btn-secondary"
                                        style={{ padding: '10px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}
                                    >
                                        {checkStatus === 'checking' ? 'Checking...' : 'Check Status'}
                                    </button>
                                </div>
                                {checkError && (
                                    <p style={{ color: '#EF4444', fontSize: '12px', margin: 0 }}>⚠️ {checkError}</p>
                                )}

                                {/* Status Indicators */}
                                {checkStatus === 'available' && (
                                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34D399', borderRadius: '8px', padding: '10px', fontSize: '12px' }}>
                                        ✓ Code is <strong>available</strong>! Configure properties in step 2.
                                    </div>
                                )}
                                {checkStatus === 'active' && (
                                    <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#60A5FA', borderRadius: '8px', padding: '10px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span>ℹ <strong>Active coupon found</strong> ({checkInfo?.usedCount || 0}/{checkInfo?.totalUses || 0} claims used).</span>
                                        <span style={{ color: 'var(--text-secondary)' }}>Rules are locked. You can email it to this customer.</span>
                                    </div>
                                )}
                                {checkStatus === 'depleted' && (
                                    <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#F59E0B', borderRadius: '8px', padding: '10px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span>⚠ <strong>Promo code depletion reached</strong> ({checkInfo?.usedCount || 0}/{checkInfo?.totalUses || 0} claims used).</span>
                                        <span style={{ color: 'var(--text-secondary)' }}>You can customize and reactivate it to reset the claims back to 0.</span>
                                    </div>
                                )}
                            </div>

                            {/* Step 2: Live Ticket Card Preview */}
                            {checkStatus !== 'idle' && checkStatus !== 'checking' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                                        2. Live Coupon Ticket Preview
                                    </label>

                                    <div style={{ position: 'relative', background: 'linear-gradient(135deg, #1b1926 0%, #0E0D14 100%)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', left: '-8px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#0B0A0F', borderRight: '1px solid var(--border-color)' }}></div>
                                        <div style={{ position: 'absolute', right: '-8px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#0B0A0F', borderLeft: '1px solid var(--border-color)' }}></div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, paddingLeft: '12px', paddingRight: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '10px', fontWeight: 800, fontFamily: 'monospace', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#C084FC', padding: '2px 6px', borderRadius: '4px' }}>
                                                    {couponCode || 'CODE'}
                                                </span>
                                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                    Max Claims: {maxUses || '1'}
                                                </span>
                                            </div>
                                            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#FFF', margin: '4px 0 0 0' }}>
                                                {couponTitle || 'Enter Coupon Title Header'}
                                            </h4>
                                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, minHeight: '32px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                {couponDesc || 'Short description of requirements or benefits.'}
                                            </p>
                                            {parseFloat(minBillAmount || 0) > 0 && (
                                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'monospace' }}>
                                                    Min Spend: ₹{minBillAmount}
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ minWidth: '95px', textAlign: 'center', borderLeft: '1px dashed rgba(255, 255, 255, 0.1)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>DISCOUNT</span>
                                            <span style={{ fontSize: '18px', fontWeight: 900, background: discountType === 'cashback' ? 'linear-gradient(135deg, #A855F7 30%, #C084FC 100%)' : 'linear-gradient(135deg, #EF4444 30%, #F59E0B 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'monospace', margin: '2px 0' }}>
                                                {discountType === 'percent' ? `${discountValue || 0}%` : `₹${discountValue || 0}`}
                                            </span>
                                            <span style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>
                                                {discountType === 'cashback' ? 'CASHBACK' : 'OFF'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Configure Parameters Form */}
                            {checkStatus !== 'idle' && checkStatus !== 'checking' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                                        3. Adjust Promotion Rules
                                    </label>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '12px' }}>Coupon Header Title</label>
                                            <input
                                                type="text"
                                                placeholder="₹50 Discount"
                                                value={couponTitle}
                                                onChange={(e) => setCouponTitle(e.target.value)}
                                                disabled={checkStatus === 'active'}
                                                required
                                                className="form-input"
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '12px' }}>Description Details</label>
                                            <input
                                                type="text"
                                                placeholder="Min spend ₹200"
                                                value={couponDesc}
                                                onChange={(e) => setCouponDesc(e.target.value)}
                                                disabled={checkStatus === 'active'}
                                                required
                                                className="form-input"
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '12px' }}>Discount Type</label>
                                            <select
                                                value={discountType}
                                                onChange={(e) => setDiscountType(e.target.value)}
                                                disabled={checkStatus === 'active'}
                                                className="form-input"
                                                style={{ height: '45px' }}
                                            >
                                                <option value="flat">Flat Bill discount (₹)</option>
                                                <option value="percent">Percentage Rate (%)</option>
                                                <option value="cashback">Wallet Cashback Reward (Earn ₹)</option>
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '12px' }}>Discount Value</label>
                                            <input
                                                type="number"
                                                placeholder="50"
                                                value={discountValue}
                                                onChange={(e) => setDiscountValue(e.target.value)}
                                                disabled={checkStatus === 'active'}
                                                required
                                                className="form-input"
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '12px' }}>Min Bill Required (₹)</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={minBillAmount}
                                                onChange={(e) => setMinBillAmount(e.target.value)}
                                                disabled={checkStatus === 'active'}
                                                className="form-input"
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '12px' }}>Max Redemptions</label>
                                            <input
                                                type="number"
                                                placeholder="1"
                                                value={maxUses}
                                                onChange={(e) => setMaxUses(e.target.value)}
                                                disabled={checkStatus === 'active'}
                                                className="form-input"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {checkStatus === 'idle' && (
                                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                                    Please enter and verify a promo code above to proceed.
                                </div>
                            )}
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '20px', marginTop: '20px' }}>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="btn btn-secondary"
                                style={{ padding: '10px 20px', fontSize: '13px' }}
                                disabled={sendingCoupon}
                            >
                                Cancel
                            </button>
                            {checkStatus !== 'idle' && checkStatus !== 'checking' && (
                                <button
                                    type="button"
                                    onClick={handleSendCoupon}
                                    className="btn btn-primary"
                                    style={{ padding: '10px 24px', fontSize: '13px' }}
                                    disabled={sendingCoupon}
                                >
                                    {sendingCoupon ? 'Processing...' :
                                        checkStatus === 'available' ? 'Create & Dispatch' :
                                            checkStatus === 'active' ? 'Send Existing Code' :
                                                'Reactivate & Dispatch'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
