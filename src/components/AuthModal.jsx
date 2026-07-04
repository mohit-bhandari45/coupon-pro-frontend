import React, { useState } from 'react';

export default function AuthModal({ onClose, onAuthSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form Fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Register Fields
    const [cafeName, setCafeName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [address, setAddress] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const url = isLogin
            ? 'http://localhost:5000/api/auth/login'
            : 'http://localhost:5000/api/auth/register';

        const payload = isLogin
            ? { email, password }
            : { name: cafeName, owner_name: ownerName, email, password, address };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Authentication failed');
            }

            // Save credentials in Session / Local Storage
            localStorage.setItem('ownerToken', data.token);
            localStorage.setItem('ownerCafe', JSON.stringify(data.cafe));

            onAuthSuccess(data.cafe, data.token);
            onClose();
        } catch (err) {
            setError(err.message || 'An error occurred during authentication');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="modal-close" onClick={onClose}>&times;</button>

                <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '28px', color: '#fff' }}>
                    {isLogin ? 'Welcome Back' : 'Register your Cafe'}
                </h2>
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px' }}>
                    {isLogin ? 'Log in to manage your loyalty dashboard' : 'Join local cafes and build customer loyalty'}
                </p>

                {error && (
                    <div className="alert-banner alert-error">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Cafe Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={cafeName}
                                    onChange={(e) => setCafeName(e.target.value)}
                                    placeholder="e.g. Brew & Co. Cafe"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Owner Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={ownerName}
                                    onChange={(e) => setOwnerName(e.target.value)}
                                    placeholder="e.g. Rajesh Kumar"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Cafe Address</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="e.g. Sector 15, Dwarka, New Delhi"
                                    required
                                />
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. owner@mycafe.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            min={6}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '10px', height: '48px' }}
                        disabled={loading}
                    >
                        {loading ? 'Authenticating...' : isLogin ? 'Sign In to Dashboard' : 'Register & Setup Cafe'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {isLogin ? "Don't have an onboarded cafe?" : "Already registered your cafe?"}{' '}
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                        }}
                        style={{ background: 'none', border: 'none', color: '#c084fc', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                    >
                        {isLogin ? 'Onboard Cafe Now' : 'Sign In'}
                    </button>
                </div>
            </div>
        </div>
    );
}
