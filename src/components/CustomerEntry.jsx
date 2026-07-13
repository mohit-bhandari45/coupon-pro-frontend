import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import ScratchCard from './ScratchCard';

export default function CustomerEntry() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [cafe, setCafe] = useState(null);
    const [coupons, setCoupons] = useState([]);
    const [walletCoupons, setWalletCoupons] = useState([]); // User's claimed/wallet coupons
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Customer session/login state
    const [customerUser, setCustomerUser] = useState(() => {
        const saved = localStorage.getItem('customerUser');
        try {
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const [remainingCredits, setRemainingCredits] = useState(() => {
        const saved = localStorage.getItem('customerCredits');
        return saved ? parseInt(saved, 10) : 3;
    });

    const [walletBalance, setWalletBalance] = useState(() => {
        const saved = localStorage.getItem('customerWalletBalance');
        return saved ? parseFloat(saved) : 0;
    });

    const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
    const [isCashbackApplied, setIsCashbackApplied] = useState(false);

    // Redirect if owner is logged in
    useEffect(() => {
        if (localStorage.getItem('ownerToken')) {
            navigate('/dashboard');
        }
    }, [navigate]);

    const [loginName, setLoginName] = useState('');
    const [loginEmail, setLoginEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState('');

    // Interactive Customer Input Fields
    const [billAmount, setBillAmount] = useState('');
    const [selectedCoupon, setSelectedCoupon] = useState(null);
    const [claimSuccess, setClaimSuccess] = useState(false);

    // Coupon redemption OTP states
    const [couponOtp, setCouponOtp] = useState('');
    const [isCouponOtpSent, setIsCouponOtpSent] = useState(false);
    const [couponOtpLoading, setCouponOtpLoading] = useState(false);

    // Promo Code States
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [isPromoLoading, setIsPromoLoading] = useState(false);
    const [promoError, setPromoError] = useState('');

    // Referral sharing states
    const [sharingCouponId, setSharingCouponId] = useState(null);
    const [shareEmail, setShareEmail] = useState('');
    const [shareMessage, setShareMessage] = useState('');
    const [shareSuccess, setShareSuccess] = useState(false);
    const [shareLoading, setShareLoading] = useState(false);

    // Auto-deselect coupon if bill amount drops below its min spend requirement
    useEffect(() => {
        if (selectedCoupon && billAmount) {
            const bill = parseFloat(billAmount);
            const minBill = parseFloat(selectedCoupon.min_bill_amount || 0);
            if (!isNaN(bill) && bill < minBill) {
                setSelectedCoupon(null);
                if (appliedPromo) {
                    setAppliedPromo(null);
                    setPromoCode('');
                }
            }
        }
    }, [billAmount, selectedCoupon, appliedPromo]);

    const [couponOtpError, setCouponOtpError] = useState('');
    const [couponVerified, setCouponVerified] = useState(false);

    const handleApplyPromoCode = async (e) => {
        e.preventDefault();
        if (!promoCode.trim()) {
            setPromoError('Please enter a promo code');
            return;
        }
        setIsPromoLoading(true);
        setPromoError('');

        try {
            const res = await fetch(`${API_BASE_URL}/api/coupon/apply-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: promoCode.trim().toUpperCase(),
                    email: customerUser?.email,
                    billAmount: parseFloat(billAmount),
                    cafeSlug: slug
                })
            });

            const data = await res.json();
            if (data.success) {
                setAppliedPromo(data.coupon);
                setSelectedCoupon(data.coupon);
                setPromoError('');
            } else {
                setPromoError(data.message || 'Invalid promo code');
            }
        } catch (err) {
            setPromoError('Connection to server failed');
        } finally {
            setIsPromoLoading(false);
        }
    };

    const handleRemovePromoCode = () => {
        setAppliedPromo(null);
        setSelectedCoupon(null);
        setPromoCode('');
        setPromoError('');
    };

    // Transaction outcome states
    const [transactionSuccess, setTransactionSuccess] = useState(false);
    const [transactionLoading, setTransactionLoading] = useState(false);
    const [transactionError, setTransactionError] = useState('');
    const [transactionResult, setTransactionResult] = useState(null);



    const handleCreateTransaction = async () => {
        setTransactionLoading(true);
        setTransactionError('');

        const cbToApply = getCashbackToApply();

        try {
            const res = await fetch(`${API_BASE_URL}/api/transaction/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cafe_id: cafe.id,
                    user_id: customerUser.id,
                    coupon_id: selectedCoupon ? selectedCoupon.id : null,
                    bill_amount: parseFloat(billAmount),
                    discount_amount: getDiscountedAmount(),
                    payable_amount: parseFloat(getPayableAmount()),
                    cashback_applied: cbToApply
                })
            });

            const data = await res.json();
            if (data.success) {
                setTransactionResult(data.transaction);
                setTransactionSuccess(true);
                // Dynamically deduct applied cashback or add earned cashback locally
                let nextBal = walletBalance;
                if (cbToApply > 0) {
                    nextBal = Math.max(0, nextBal - cbToApply);
                }
                if (selectedCoupon && selectedCoupon.discount_type === 'cashback') {
                    nextBal = nextBal + parseFloat(selectedCoupon.discount_value);
                }
                if (nextBal !== walletBalance) {
                    localStorage.setItem('customerWalletBalance', nextBal.toString());
                    setWalletBalance(nextBal);
                }
            } else {
                if (data.session_expired) {
                    localStorage.removeItem('customerUser');
                    localStorage.removeItem('customerCredits');
                    localStorage.removeItem('customerWalletBalance');
                    setCustomerUser(null);
                    setRemainingCredits(3);
                    setWalletBalance(0);
                    alert('Session expired or user not found. Please log in or register again.');
                    handleResetFlow();
                } else {
                    setTransactionError(data.message || 'Failed to record transaction');
                }
            }
        } catch (err) {
            setTransactionError('Connection error to backend');
        } finally {
            setTransactionLoading(false);
        }
    };

    const [advertisedCoupons, setAdvertisedCoupons] = useState([]);
    const [claimingIds, setClaimingIds] = useState(new Set());
    const [claimedIds, setClaimedIds] = useState(new Set());

    const handleResetFlow = () => {
        setBillAmount('');
        setSelectedCoupon(null);
        setClaimSuccess(false);
        setCouponOtp('');
        setIsCouponOtpSent(false);
        setCouponVerified(false);
        setIsCashbackApplied(false);
        setTransactionSuccess(false);
        setTransactionResult(null);
        setTransactionError('');
        setCouponOtpError('');
        setPromoCode('');
        setAppliedPromo(null);
        setPromoError('');
        setClaimingIds(new Set());
        setClaimedIds(new Set());

        // Refresh user coupon bank
        if (customerUser?.id && cafe?.id) {
            fetch(`${API_BASE_URL}/api/wallet?userId=${customerUser.id}&cafeId=${cafe.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setWalletCoupons(data.coupons || []);
                    }
                })
                .catch(console.error);

            // Refresh public store coupons
            fetch(`${API_BASE_URL}/api/cafe/${slug}?userId=${customerUser.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) setCoupons(data.coupons || []);
                })
                .catch(console.error);
        }

        // Refresh customer credits
        if (customerUser?.email) {
            fetch(`${API_BASE_URL}/api/auth/credits/${customerUser.email}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        localStorage.setItem('customerCredits', data.remaining.toString());
                        setRemainingCredits(data.remaining);
                    }
                })
                .catch(console.error);
        }
    };

    // Fetch user wallet coupons whenever user or cafe changes
    useEffect(() => {
        if (customerUser?.id && cafe?.id) {
            fetch(`${API_BASE_URL}/api/wallet?userId=${customerUser.id}&cafeId=${cafe.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setWalletCoupons(data.coupons || []);
                    }
                })
                .catch(console.error);
        } else {
            setWalletCoupons([]);
        }
    }, [customerUser, cafe]);

    // Fetch success screen promotion ads
    useEffect(() => {
        if (transactionSuccess && customerUser?.id) {
            fetch(`${API_BASE_URL}/api/wallet/advertised?userId=${customerUser.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setAdvertisedCoupons(data.coupons || []);
                    }
                })
                .catch(console.error);
        }
    }, [transactionSuccess, customerUser]);

    const handleClaimCoupon = async (couponId) => {
        if (!customerUser?.id) return;
        setClaimingIds(prev => new Set([...prev, couponId]));
        try {
            const res = await fetch(`${API_BASE_URL}/api/wallet/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: customerUser.id,
                    couponId
                })
            });
            const data = await res.json();
            if (data.success) {
                setClaimedIds(prev => new Set([...prev, couponId]));
                // Re-fetch active bank coupons
                if (cafe?.id) {
                    fetch(`${API_BASE_URL}/api/wallet?userId=${customerUser.id}&cafeId=${cafe.id}`)
                        .then(r => r.json())
                        .then(d => {
                            if (d.success) setWalletCoupons(d.coupons || []);
                        });

                    // Re-fetch public store coupons
                    fetch(`${API_BASE_URL}/api/cafe/${slug}?userId=${customerUser.id}`)
                        .then(r => r.json())
                        .then(d => {
                            if (d.success) setCoupons(d.coupons || []);
                        });
                }
            } else {
                alert(data.message || 'Failed to claim coupon.');
            }
        } catch (err) {
            console.error('Error claiming coupon:', err);
            alert('Failed to claim coupon.');
        } finally {
            setClaimingIds(prev => {
                const next = new Set(prev);
                next.delete(couponId);
                return next;
            });
        }
    };

    const handleShareSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!shareEmail.trim()) {
            setShareMessage('Please enter an email address');
            setShareSuccess(false);
            return;
        }
        if (customerUser && shareEmail.trim().toLowerCase() === customerUser.email.toLowerCase()) {
            setShareMessage('You cannot share a coupon with yourself!');
            setShareSuccess(false);
            return;
        }
        setShareLoading(true);
        setShareMessage('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/wallet/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    referrerId: customerUser.id,
                    couponId: sharingCouponId,
                    refereeEmail: shareEmail.trim()
                })
            });
            const data = await res.json();
            if (data.success) {
                setShareSuccess(true);
                setShareMessage('Gift successfully shared with your friend!');
                setShareEmail('');
                // Refresh wallet coupons to show remaining limit/uses
                if (cafe?.id) {
                    fetch(`${API_BASE_URL}/api/wallet?userId=${customerUser.id}&cafeId=${cafe.id}`)
                        .then(r => r.json())
                        .then(d => {
                            if (d.success) setWalletCoupons(d.coupons || []);
                        })
                        .catch(console.error);
                }
            } else {
                setShareSuccess(false);
                setShareMessage(data.message || 'Failed to share coupon');
            }
        } catch (err) {
            setShareSuccess(false);
            setShareMessage('Network/server connection failed');
        } finally {
            setShareLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        setError('');

        const url = customerUser?.id
            ? `${API_BASE_URL}/api/cafe/${slug}?userId=${customerUser.id}`
            : `${API_BASE_URL}/api/cafe/${slug}`;

        fetch(url)
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

        if (customerUser?.email) {
            fetch(`${API_BASE_URL}/api/auth/credits/${customerUser.email}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        localStorage.setItem('customerCredits', data.remaining.toString());
                        setRemainingCredits(data.remaining);
                        const bal = data.walletBalance !== undefined ? parseFloat(data.walletBalance) : 0;
                        localStorage.setItem('customerWalletBalance', bal.toString());
                        setWalletBalance(bal);
                    }
                })
                .catch(console.error);
        }
    }, [slug, customerUser]);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (authMode === 'register' && !loginName.trim()) {
            setAuthError('Full Name is required for registration.');
            return;
        }
        setAuthLoading(true);
        setAuthError('');

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: loginEmail, mode: authMode })
            });

            const data = await res.json();
            if (data.success) {
                setIsOtpSent(true);
            } else {
                setAuthError(data.message || 'Failed to send verification code');
            }
        } catch (err) {
            setAuthError('Connection error to backend');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError('');

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: loginEmail,
                    code: otpCode,
                    name: authMode === 'register' ? loginName : undefined
                })
            });

            const data = await res.json();
            if (data.success) {
                localStorage.setItem('customerToken', data.token);
                localStorage.setItem('customerUser', JSON.stringify(data.user));
                const credits = data.remainingCredits !== undefined ? data.remainingCredits : 3;
                localStorage.setItem('customerCredits', credits.toString());
                const bal = data.user.wallet_balance !== undefined ? parseFloat(data.user.wallet_balance) : 0;
                localStorage.setItem('customerWalletBalance', bal.toString());
                setCustomerUser(data.user);
                setRemainingCredits(credits);
                setWalletBalance(bal);
                setIsCashbackApplied(false);
            } else {
                setAuthError(data.message || 'OTP verification failed');
            }
        } catch (err) {
            setAuthError('Connection error to backend');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleApplyCoupon = (e) => {
        e.preventDefault();
        if (!billAmount || isNaN(billAmount) || parseFloat(billAmount) <= 0) {
            alert('Please enter a valid bill amount');
            return;
        }

        setCouponVerified(true);
    };

    const getDiscountedAmount = () => {
        if (!selectedCoupon || !billAmount) return 0;
        const bill = parseFloat(billAmount);

        // Check minimum bill amount cap
        const minBill = parseFloat(selectedCoupon.min_bill_amount || 0);
        if (bill < minBill) return 0;

        if (selectedCoupon.discount_type === 'cashback') {
            return 0; // Cashback does not reduce the bill amount directly
        }

        if (selectedCoupon.discount_type === 'percent') {
            return (bill * parseFloat(selectedCoupon.discount_value)) / 100;
        } else {
            // Flat discount
            const val = selectedCoupon.referred_by
                ? 0.80 * parseFloat(selectedCoupon.discount_value)
                : parseFloat(selectedCoupon.discount_value);
            return Math.min(bill, val);
        }
    };

    const getCashbackToApply = () => {
        if (!isCashbackApplied) return 0;
        const bill = parseFloat(billAmount || 0);
        const disc = getDiscountedAmount();
        const costAfterCoupon = Math.max(0, bill - disc);
        return Math.min(walletBalance, costAfterCoupon);
    };

    const getPayableAmount = () => {
        const bill = parseFloat(billAmount || 0);
        const disc = getDiscountedAmount();
        const cb = getCashbackToApply();
        return Math.max(0, bill - disc - cb).toFixed(2);
    };

    const renderCouponList = (list, title, emptyMessage) => {
        if (appliedPromo) return null;
        if (list.length === 0) {
            return (
                <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '15px', marginBottom: '10px', fontWeight: 600, color: 'var(--text-muted)', paddingLeft: '8px' }}>
                        {title}
                    </h3>
                    <div className="card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                        {emptyMessage}
                    </div>
                </div>
            );
        }

        return (
            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', marginBottom: '10px', fontWeight: 600, color: '#fff', paddingLeft: '8px' }}>
                    {title}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {list.map((coupon) => {
                        const minBill = parseFloat(coupon.min_bill_amount || 0);
                        const isBelowMin = minBill > 0 && (!billAmount || parseFloat(billAmount) < minBill);
                        const welcomeIds = ['WELCOME10', 'FREEBUI', 'FEST25'];
                        const isWelcome = welcomeIds.includes(coupon.id);
                        const isExhausted = (coupon.remaining_uses !== undefined && coupon.remaining_uses <= 0) || (isWelcome && remainingCredits === 0);
                        const isCouponDisabled = isExhausted || isBelowMin;

                        return (
                            <div
                                key={coupon.id}
                                onClick={() => {
                                    if (!isCouponDisabled) {
                                        if (selectedCoupon?.id === coupon.id) {
                                            setSelectedCoupon(null);
                                        } else {
                                            setSelectedCoupon(coupon);
                                        }
                                    }
                                }}
                                className={`card`}
                                style={{
                                    padding: '16px',
                                    cursor: isCouponDisabled ? 'not-allowed' : 'pointer',
                                    opacity: isCouponDisabled ? 0.55 : 1,
                                    borderColor: selectedCoupon?.id === coupon.id && !isCouponDisabled ? 'var(--color-accent)' : 'var(--border-color)',
                                    background: selectedCoupon?.id === coupon.id && !isCouponDisabled ? 'rgba(139, 92, 246, 0.05)' : 'var(--bg-card)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                                    </div>

                                    <input
                                        type="radio"
                                        name="selected_coupon"
                                        disabled={isCouponDisabled}
                                        checked={selectedCoupon?.id === coupon.id && !isCouponDisabled}
                                        onChange={() => {
                                            if (!isCouponDisabled) {
                                                setSelectedCoupon(coupon);
                                            }
                                        }}
                                        style={{ accentColor: '#8b5cf6' }}
                                    />
                                </div>

                                <h4 style={{ fontSize: '16px', margin: '10px 0 4px 0', color: '#fff' }}>{coupon.title}</h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 10px 0' }}>{coupon.desc_text}</p>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                                    <div style={{ fontSize: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', display: 'inline-block', padding: '4px 10px', borderRadius: '6px', color: 'var(--text-secondary)' }}>
                                        Discount: <strong style={{ color: '#fff' }}>{coupon.discount_type === 'percent' ? `${coupon.discount_value}% Off` : `₹${(coupon.referred_by ? 0.8 * parseFloat(coupon.discount_value) : parseFloat(coupon.discount_value)).toFixed(0)} Off`}</strong>
                                    </div>
                                    {coupon.referred_by && coupon.discount_type === 'flat' && (
                                        <div style={{ fontSize: '11px', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.2)', background: 'rgba(59, 130, 246, 0.05)', padding: '4px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center' }}>
                                            🎁 Referral (80% off ₹{parseFloat(coupon.discount_value).toFixed(0)})
                                        </div>
                                    )}
                                    {parseFloat(coupon.min_bill_amount || 0) > 0 && (
                                        <div style={{
                                            fontSize: '11px',
                                            background: isBelowMin ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.02)',
                                            border: isBelowMin ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            color: isBelowMin ? '#F87171' : 'var(--text-secondary)'
                                        }}>
                                            <span>ⓘ Min Spend: <strong>₹{parseFloat(coupon.min_bill_amount).toFixed(2)}</strong> {isBelowMin && <span style={{ fontSize: '9px', fontWeight: 'bold' }}>(Need more)</span>}</span>
                                        </div>
                                    )}
                                    {title.includes('Bank') && coupon.discount_type === 'flat' && !isWelcome && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (sharingCouponId === coupon.id) {
                                                    setSharingCouponId(null);
                                                } else {
                                                    setSharingCouponId(coupon.id);
                                                    setShareEmail('');
                                                    setShareMessage('');
                                                    setShareSuccess(false);
                                                }
                                            }}
                                            style={{
                                                background: 'rgba(59, 130, 246, 0.1)',
                                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                                color: '#60A5FA',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                marginLeft: 'auto'
                                            }}
                                        >
                                            Share & Refer 🎁
                                        </button>
                                    )}
                                </div>

                                {title.includes('Bank') && coupon.discount_type === 'flat' && !isWelcome && sharingCouponId === coupon.id && (
                                    <div style={{
                                        marginTop: '12px',
                                        padding: '12px',
                                        borderTop: '1px solid var(--border-color)',
                                        background: 'rgba(255,255,255,0.01)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        width: '100%'
                                    }} onClick={(e) => e.stopPropagation()}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                            🎁 Referral Split: Your friend gets <b>80%</b> of the discount value (₹{(0.8 * coupon.discount_value).toFixed(0)}), and you receive <b>20%</b> (₹{(0.2 * coupon.discount_value).toFixed(0)}) as cashback upon their redemption.
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="email"
                                                placeholder="Friend's email address"
                                                value={shareEmail}
                                                onChange={(e) => setShareEmail(e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: '6px 10px',
                                                    background: 'rgba(0,0,0,0.2)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '6px',
                                                    color: '#fff',
                                                    fontSize: '12px',
                                                    outline: 'none'
                                                }}
                                            />
                                            <button
                                                type="button"
                                                disabled={shareLoading}
                                                onClick={handleShareSubmit}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: '#3B82F6',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {shareLoading ? 'Sending...' : 'Invite'}
                                            </button>
                                        </div>
                                        {shareMessage && (
                                            <div style={{
                                                fontSize: '11px',
                                                color: shareSuccess ? '#34D399' : '#F87171',
                                                fontWeight: 500
                                            }}>
                                                {shareMessage}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 8px', marginBottom: '16px' }}>
                    <div className="nav-brand" style={{ fontSize: '20px' }}>
                        <div className="nav-logo-icon" style={{ width: '30px', height: '30px', borderRadius: '8px', fontSize: '16px' }}>
                            {cafe?.logo_url ? <img src={cafe.logo_url} alt="Logo" style={{ width: '100%', height: '100%', borderRadius: '8px' }} /> : '☕'}
                        </div>
                        <span>{cafe?.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {customerUser && (
                            <button
                                type="button"
                                onClick={() => {
                                    localStorage.removeItem('customerUser');
                                    localStorage.removeItem('customerToken');
                                    localStorage.removeItem('customerCredits');
                                    localStorage.removeItem('customerWalletBalance');
                                    setCustomerUser(null);
                                    setRemainingCredits(3);
                                    setWalletBalance(0);
                                    handleResetFlow();
                                }}
                                style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#F87171',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    padding: '4px 8px',
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                Logout ⤶
                            </button>
                        )}
                        <div className="badge" style={{ margin: 0, padding: '4px 10px', fontSize: '11px' }}>Customer Portal</div>
                    </div>
                </div>

                {!customerUser ? (
                    /* Customer Auth (Sign-in / Signup) Email-Only Flow */
                    <div className="card" style={{ padding: '32px 24px', textAlign: 'center', animation: 'fadeIn 0.3s ease', marginTop: '24px' }}>
                        <h2 style={{ fontSize: '22px', color: '#fff', marginBottom: '8px', fontWeight: 700 }}>
                            {isOtpSent ? 'Verify Your Email' : authMode === 'register' ? 'Customer Sign-Up' : 'Customer Sign-In'}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px', lineHeight: '1.5' }}>
                            {isOtpSent
                                ? `We've sent a 6-digit verification code to ${loginEmail}. Please enter it below.`
                                : authMode === 'register'
                                    ? 'Create an account to claim custom cafe discounts and get welcome wallet cashback.'
                                    : `Welcome to ${cafe?.name || 'our Cafe'}! Sign in to view and unlock custom store loyalty discounts.`
                            }
                        </p>

                        {authError && (
                            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171', fontSize: '13px', marginBottom: '16px', textAlign: 'left' }}>
                                ⚠️ {authError}
                            </div>
                        )}

                        {!isOtpSent ? (
                            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => { setAuthMode('login'); setAuthError(''); }}
                                        style={{
                                            flex: 1, padding: '8px', background: 'none', border: 'none',
                                            color: authMode === 'login' ? '#C084FC' : 'var(--text-secondary)',
                                            fontWeight: authMode === 'login' ? 'bold' : 'normal',
                                            borderBottom: authMode === 'login' ? '2px solid #C084FC' : 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Sign In
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setAuthMode('register'); setAuthError(''); }}
                                        style={{
                                            flex: 1, padding: '8px', background: 'none', border: 'none',
                                            color: authMode === 'register' ? '#C084FC' : 'var(--text-secondary)',
                                            fontWeight: authMode === 'register' ? 'bold' : 'normal',
                                            borderBottom: authMode === 'register' ? '2px solid #C084FC' : 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Sign Up
                                    </button>
                                </div>
                                {authMode === 'register' && (
                                    <div>
                                        <label className="form-label" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Full Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g. John Doe"
                                            value={loginName}
                                            onChange={(e) => setLoginName(e.target.value)}
                                            required
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="form-label" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Email Address</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="e.g. john@example.com"
                                        value={loginEmail}
                                        onChange={(e) => setLoginEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%', height: '48px', marginTop: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                    disabled={authLoading}
                                >
                                    {authLoading ? 'Sending...' : authMode === 'register' ? 'Send Sign-Up Code' : 'Send Sign-In Code'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                                <div>
                                    <label className="form-label" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>6-Digit OTP Code</label>
                                    <input
                                        type="text"
                                        maxLength="6"
                                        className="form-input"
                                        placeholder="e.g. 123456"
                                        style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '20px', fontWeight: 700 }}
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value)}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%', height: '48px', marginTop: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                    disabled={authLoading}
                                >
                                    {authLoading ? 'Verifying...' : 'Verify & Continue'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOtpSent(false);
                                        setOtpCode('');
                                        setAuthError('');
                                    }}
                                    className="btn btn-secondary"
                                    style={{ width: '100%' }}
                                >
                                    Edit Name / Email
                                </button>
                            </form>
                        )}
                    </div>
                ) : transactionSuccess ? (
                    /* SUCCESS SCREEN */
                    <div className="card" style={{ padding: '36px 24px', textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
                        <div style={{ fontSize: '64px', marginBottom: '16px', color: '#10B981' }}>✅</div>
                        <h2 style={{ fontSize: '26px', color: '#fff', marginBottom: '12px', fontWeight: 800 }}>
                            {selectedCoupon?.discount_type === 'cashback' ? 'Cashback Earned!' : 'Discount Redeemed!'}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
                            {selectedCoupon?.discount_type === 'cashback' ? (
                                <>
                                    Your cashback coupon <strong>{selectedCoupon?.title}</strong> was applied. <strong>₹{parseFloat(selectedCoupon?.discount_value).toFixed(2)} Cashback</strong> has been added to your Wallet balance!
                                </>
                            ) : (
                                <>
                                    Your coupon <strong>{selectedCoupon?.title}</strong> was successfully redeemed. A copy of the receipt has been emailed to you.
                                </>
                            )}
                        </p>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border-color)', marginBottom: '28px', textAlign: 'left' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                <span>Cafe:</span>
                                <span style={{ color: '#fff', fontWeight: 600 }}>{cafe?.name}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                <span>Receipt Code:</span>
                                <span style={{ color: 'var(--color-accent)', fontWeight: 700, fontFamily: 'monospace' }}>{transactionResult?.id || 't-884930'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                <span>Discount Savings:</span>
                                <span style={{ color: '#F87171', fontWeight: 600 }}>- ₹{parseFloat(transactionResult?.discount_amount || 0).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '10px', color: 'var(--text-muted)' }}>
                                <span style={{ fontWeight: 700, color: '#fff' }}>Paid Amount:</span>
                                <span style={{ color: '#34D399', fontWeight: 800 }}>₹{parseFloat(transactionResult?.payable_amount || 0).toFixed(2)}</span>
                            </div>
                        </div>

                        {advertisedCoupons.length > 0 && (
                            <div style={{ marginTop: '24px', marginBottom: '24px', textAlign: 'left' }}>
                                <h4 style={{ fontSize: '14px', color: '#C084FC', marginBottom: '16px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    🎁 Scratch and Claim Next Visit Rewards
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                    {advertisedCoupons.map((promo) => (
                                        <ScratchCard
                                            key={promo.id}
                                            coupon={promo}
                                            onClaim={handleClaimCoupon}
                                            isClaimed={claimedIds.has(promo.id)}
                                            isClaiming={claimingIds.has(promo.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleResetFlow}
                            className="btn btn-primary"
                            style={{ width: '100%', height: '48px' }}
                        >
                            Return to Entry Portal
                        </button>
                    </div>
                ) : couponVerified ? (
                    /* COUNTER VERIFICATION SCREEN (UPI PAYMENT & COUNTER CONFIRMATION) */
                    <div className="card" style={{ padding: '32px 24px', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
                        <h2 style={{ fontSize: '24px', color: '#fff', marginBottom: '12px', fontWeight: 700 }}>Complete Your Payment</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
                            {selectedCoupon || isCashbackApplied ? 'Your discount is verified!' : 'Your checkout details are verified!'} Touch the button below to pay <strong>₹{getPayableAmount()}</strong> via UPI, or show this screen to the cashier.
                        </p>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px', textAlign: 'left' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Applied Reward:</div>
                            <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>{selectedCoupon?.title || 'None'}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Final Payable:</div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: '#34D399' }}>₹{getPayableAmount()}</div>
                        </div>

                        {transactionError && (
                            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171', fontSize: '13px', marginBottom: '16px', textAlign: 'left' }}>
                                ⚠️ {transactionError}
                            </div>
                        )}

                        {cafe?.upi_id && (
                            <a
                                href={`upi://pay?pa=${cafe.upi_id}&pn=${encodeURIComponent(cafe.name)}&am=${getPayableAmount()}&cu=INR&tn=RedPerks%20Payment`}
                                className="btn btn-primary"
                                style={{ width: '100%', height: '48px', marginBottom: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', textDecoration: 'none', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', border: 'none' }}
                            >
                                ⚡ Touch to Pay via UPI
                            </a>
                        )}

                        <button
                            onClick={handleCreateTransaction}
                            className="btn btn-primary"
                            style={{ width: '100%', height: '48px', marginBottom: '12px' }}
                            disabled={transactionLoading}
                        >
                            {transactionLoading ? 'Registering...' : 'Cashier Verified - Complete Transaction'}
                        </button>

                        <button
                            onClick={handleResetFlow}
                            className="btn btn-secondary"
                            style={{ width: '100%' }}
                            disabled={transactionLoading}
                        >
                            Cancel & Clear
                        </button>
                    </div>
                ) : (
                    /* Standard Scan Landing Entry Screen */
                    <form onSubmit={handleApplyCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Customer Credits & Cashback Wallet Panel */}
                        {customerUser && (
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div className="card" style={{
                                    flex: 1,
                                    padding: '12px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    borderLeft: remainingCredits === 0 ? '4px solid #EF4444' : '4px solid #34D399',
                                    background: 'rgba(255,255,255,0.01)'
                                }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Redemption Credits</div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                                        {remainingCredits === 0 ? '0 (Exhausted)' : `${remainingCredits} Left`}
                                    </div>
                                </div>
                                <div className="card" style={{
                                    flex: 1,
                                    padding: '12px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    borderLeft: '4px solid #8b5cf6',
                                    background: 'rgba(255,255,255,0.01)'
                                }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cashback Wallet</div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#C084FC', marginTop: '4px' }}>
                                        ₹{walletBalance.toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        )}

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

                        {/* Promo Code Input Card */}
                        <div className="card" style={{ padding: '20px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <label className="form-label" style={{ fontSize: '14px', marginBottom: 0 }}>Have a Promo/Coupon Code?</label>
                            {!appliedPromo ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        style={{ flexGrow: 1, textTransform: 'uppercase' }}
                                        placeholder="e.g. WELCOME50"
                                        value={promoCode}
                                        onChange={(e) => setPromoCode(e.target.value)}
                                        disabled={!billAmount || isNaN(billAmount) || parseFloat(billAmount) <= 0}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleApplyPromoCode}
                                        className="btn btn-secondary"
                                        style={{ padding: '0 16px', margin: 0, height: '44px', width: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                        disabled={isPromoLoading || !billAmount || isNaN(billAmount) || parseFloat(billAmount) <= 0}
                                    >
                                        {isPromoLoading ? '...' : 'Apply'}
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16, 185, 129, 0.05)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                    <div>
                                        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Promo Code Applied</span>
                                        <strong style={{ fontSize: '15px', color: '#fff' }}>{appliedPromo.id}</strong>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemovePromoCode}
                                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                            {promoError && (
                                <span style={{ color: '#F87171', fontSize: '12px' }}>⚠️ {promoError}</span>
                            )}
                        </div>

                        {/* Coupons Selection List */}
                        {appliedPromo ? (
                            <div className="card" style={{ padding: '20px', textAlign: 'center', color: '#FCD34D', fontSize: '13px', background: 'rgba(251, 191, 36, 0.02)', borderColor: 'rgba(251, 191, 36, 0.2)', lineHeight: '1.5', marginBottom: '24px' }}>
                                ✨ <strong>Promo Code applied ({appliedPromo.id})</strong>. The store's loyalty rewards and welcome credits are hidden. Remove the promo code to view them.
                            </div>
                        ) : (
                            <>
                                {customerUser ? (
                                    renderCouponList(
                                        walletCoupons,
                                        `Your Coupon Bank (Wallet)`,
                                        "Your Coupon Bank is empty."
                                    )
                                ) : (
                                    renderCouponList(
                                        coupons,
                                        "Select 1 Loyalty Coupon",
                                        "No coupons configured for this store yet."
                                    )
                                )}
                            </>
                        )}

                        {/* Cashback Apply Wallet Checkbox */}
                        {customerUser && walletBalance > 0 && billAmount && parseFloat(billAmount) > 0 && (
                            <div className="card" style={{ padding: '16px 20px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input
                                    type="checkbox"
                                    id="apply-cashback"
                                    checked={isCashbackApplied}
                                    onChange={(e) => setIsCashbackApplied(e.target.checked)}
                                    style={{ width: '18px', height: '18px', accentColor: '#8b5cf6', cursor: 'pointer' }}
                                />
                                <label htmlFor="apply-cashback" style={{ fontSize: '14px', color: '#fff', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                                    Apply Cashback Wallet Balance (Available: <strong>₹{walletBalance.toFixed(2)}</strong>)
                                </label>
                            </div>
                        )}

                        {/* Calculations Card (if bill and coupon/cashback active) */}
                        {billAmount && parseFloat(billAmount) > 0 && (selectedCoupon || isCashbackApplied) && (
                            <div className="card" style={{ padding: '20px', textAlign: 'left', animation: 'fadeIn 0.2s ease', borderStyle: 'dashed' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    <span>Bill Amount:</span>
                                    <span>₹{parseFloat(billAmount).toFixed(2)}</span>
                                </div>
                                {selectedCoupon && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                        {selectedCoupon.discount_type === 'cashback' ? (
                                            <>
                                                <span>Cashback to be Earned:</span>
                                                <span style={{ color: '#C084FC' }}>+ ₹{parseFloat(selectedCoupon.discount_value).toFixed(2)}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Applied Coupon Discount ({selectedCoupon.title}):</span>
                                                <span style={{ color: '#F87171' }}>- ₹{getDiscountedAmount().toFixed(2)}</span>
                                            </>
                                        )}
                                    </div>
                                )}
                                {isCashbackApplied && getCashbackToApply() > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                                        <span>Wallet Cashback Applied:</span>
                                        <span style={{ color: '#F87171' }}>- ₹{getCashbackToApply().toFixed(2)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, borderTop: '1px solid var(--border-color)', paddingTop: '10px', color: '#fff' }}>
                                    <span>Payable at Counter:</span>
                                    <span style={{ color: '#34D399' }}>₹{getPayableAmount()}</span>
                                </div>
                            </div>
                        )}

                        {selectedCoupon && remainingCredits === 0 && (
                            <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171', fontSize: '13px', textAlign: 'center', fontWeight: '500' }}>
                                ⚠️ You have exhausted your maximum limit of 3 coupon claims. You cannot redeem welcome coupons.
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className={`btn btn-primary`}
                            style={{ height: '52px', marginTop: '12px' }}
                            disabled={
                                (!selectedCoupon && !isCashbackApplied) ||
                                (selectedCoupon && remainingCredits === 0)
                            }
                        >
                            {selectedCoupon && remainingCredits === 0
                                ? 'Credits Limit Exhausted'
                                : 'Verify & Lock Discount'
                            }
                        </button>
                        <div style={{ height: '30px' }}></div>
                    </form>
                )}
            </div>
        </div>
    );
}
