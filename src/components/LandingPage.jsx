import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
    const navigate = useNavigate();
    return (
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>
            <div className="bg-glow"></div>
            <div className="bg-glow-secondary"></div>

            {/* Navbar Container */}
            <header className="navbar">
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="nav-brand">
                        <div className="nav-logo-icon">☕</div>
                        <span>RedPerks</span>
                    </div>

                    <div className="flex-btn-group">
                        <button
                            onClick={() => navigate('/auth')}
                            className="btn btn-secondary"
                            style={{ padding: '8px 18px', fontSize: '14px', borderRadius: '10px' }}
                        >
                            Owner Portal
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="container">
                    <div className="badge">PWA Loyalty Platform</div>
                    <h1 className="hero-title">
                        Retain Customers with <span className="title-gradient"><br />WhatsApp-Based Loyalty</span>
                    </h1>
                    <p className="hero-description">
                        A frictionless, single-scan web app for local cafes. No app downloads required. Verified OTP claims, instant UPI deep-links, and automated owner reconciliation.
                    </p>

                    <div className="flex-btn-group" style={{ marginTop: '10px' }}>
                        <button onClick={() => navigate('/auth')} className="btn btn-primary" style={{ padding: '14px 28px' }}>
                            Onboard Your Cafe
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </button>
                        <a href="#features" className="btn btn-secondary" style={{ padding: '14px 28px' }}>
                            Explore Features
                        </a>
                    </div>
                </div>
            </section>

            {/* Features Overview */}
            <section id="features" className="features-section">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">Built for Local Cafes, Loved by Customers</h2>
                        <p className="section-subtitle">
                            We replace outdated paper cards and slow app downloads with an instant, abuse-proof QR code framework.
                        </p>
                    </div>

                    <div className="features-grid">
                        <div className="card feature-card">
                            <div className="feature-icon-wrapper">📱</div>
                            <h3 className="feature-title">Frictionless PWA Profile</h3>
                            <p className="feature-desc">
                                Customers scan a table QR code to view available offers instantly. Persisted sessions mean login happens only once.
                            </p>
                        </div>

                        <div className="card feature-card">
                            <div className="feature-icon-wrapper">💬</div>
                            <h3 className="feature-title">WhatsApp OTP Security</h3>
                            <p className="feature-desc">
                                Secure 6-digit verification codes sent directly to WhatsApp prevent repeat claims and abuse of high-value discounts.
                            </p>
                        </div>

                        <div className="card feature-card">
                            <div className="feature-icon-wrapper">💳</div>
                            <h3 className="feature-title">UPI Pay Deep-Linking</h3>
                            <p className="feature-desc">
                                Calculates discount and fires deep-links launcher for native UPI apps (GPay, PhonePe, Paytm) prefilled with payable amount.
                            </p>
                        </div>

                        <div className="card feature-card">
                            <div className="feature-icon-wrapper">✉️</div>
                            <h3 className="feature-title">Owner Receipt Sync</h3>
                            <p className="feature-desc">
                                Completed loyalty claims instantly trigger dual email invoices for customers and owners, enabling clean drawer reconciliation.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ borderTop: '1px solid var(--border-color)', padding: '40px 0', textAlign: 'center', marginTop: '60px' }}>
                <div className="container">
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                        &copy; 2026 RedPerks. Designed for modern community dining.
                    </p>
                </div>
            </footer>
        </div>
    );
}
