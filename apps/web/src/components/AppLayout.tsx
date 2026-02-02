import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RATING_CACHE_KEY = 'taskflow_rating_submitted';
const PREMIUM_REDIRECT_URL =
  'https://rescuenow.ngo/?gad_source=1&gad_campaignid=22618742603&gbraid=0AAAAA9oeJEZZDRUxmdlUz-kRzluf-7oXa&gclid=Cj0KCQiAkPzLBhD4ARIsAGfah8goIu3-3LlY94rJn_Yc12caDcMx3NhwNVroz3ntbt0C6QebkSfv7CsaAqj3EALw_wcB';

interface NavItem {
  label: string;
  path: string;
  icon?: string;
}

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout, role, streakCount } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [premiumDialogOpen, setPremiumDialogOpen] = useState(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(RATING_CACHE_KEY);
      if (cached === 'true') setRatingSubmitted(true);
    } catch {
      // ignore
    }
  }, []);

  const handleStarClick = (value: number) => {
    setSelectedRating(value);
    try {
      localStorage.setItem(RATING_CACHE_KEY, 'true');
      setRatingSubmitted(true);
    } catch {
      setRatingSubmitted(true);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const adminNavItems: NavItem[] = [
    { label: 'Tasks', path: '/admin/tasks', icon: '📋' },
    { label: 'Reports', path: '/admin/reports', icon: '📊' },
  ];

  const memberNavItems: NavItem[] = [
    { label: 'My Tasks', path: '/member/tasks', icon: '📝' },
  ];

  const navItems = role === 'ADMIN' ? adminNavItems : memberNavItems;
  const contactDeveloperUrl = 'https://wa.me/48575394930';

  return (
    <div className="app-layout">
      <div className="app-sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-logo">TaskFlow</h1>
          {streakCount != null && streakCount > 0 && (
            <span className="sidebar-streak" title={`${streakCount} day streak`}>
              <img
                src="https://media.tenor.com/K3j9pwWlME0AAAAj/fire-flame.gif"
                alt="Streak"
                width={20}
                height={20}
              />
              <span>{streakCount}</span>
            </span>
          )}
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
              >
                {item.icon && <span className="nav-icon">{item.icon}</span>}
                <span>{item.label}</span>
              </Link>
            );
          })}
          <a
            href={contactDeveloperUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-item"
            style={{ marginTop: 'auto' }}
          >
            <span className="nav-icon">💬</span>
            <span>Contact developer</span>
          </a>
          <div
            className="nav-item"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 'var(--spacing-xs)',
              marginTop: 'var(--spacing-xs)',
            }}
          >
            {ratingSubmitted ? (
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Thanks for your rating!
              </span>
            ) : (
              <>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  Rate this app
                </span>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleStarClick(value)}
                      onMouseEnter={() => setHoverRating(value)}
                      onMouseLeave={() => setHoverRating(0)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        fontSize: '1.25rem',
                        lineHeight: 1,
                      }}
                      aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
                    >
                      {value <= (hoverRating || selectedRating) ? '★' : '☆'}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            className="sidebar-premium-btn"
            onClick={() => setPremiumDialogOpen(true)}
          >
            <span className="sidebar-premium-icon">✨ 💎</span>
            <span>Go Premium</span>
          </button>
        </nav>
      </div>

      {premiumDialogOpen && (
        <div className="premium-overlay" onClick={() => setPremiumDialogOpen(false)}>
          <div className="premium-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="premium-dialog-header">
              <h2 className="premium-dialog-title">✨ Upgrade to Premium</h2>
              <p className="premium-dialog-subtitle">Choose the plan that fits you</p>
              <button
                type="button"
                className="premium-dialog-close"
                onClick={() => setPremiumDialogOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="premium-tiers">
              <div className="premium-tier">
                <div className="premium-tier-badge">Starter</div>
                <div className="premium-tier-price">
                  <span className="premium-tier-amount">$9</span>
                  <span className="premium-tier-period">/month</span>
                </div>
                <ul className="premium-tier-features">
                  <li>✓ Up to 10 tasks</li>
                  <li>✓ Basic reports</li>
                  <li>✓ Email support</li>
                </ul>
                <button type="button" className="premium-tier-cta">
                  Get Started
                </button>
              </div>
              <div className="premium-tier premium-tier-featured">
                <div className="premium-tier-badge">Pro</div>
                <div className="premium-tier-price">
                  <span className="premium-tier-amount">$19</span>
                  <span className="premium-tier-period">/month</span>
                </div>
                <ul className="premium-tier-features">
                  <li>✓ Unlimited tasks</li>
                  <li>✓ Advanced reports</li>
                  <li>✓ Priority support</li>
                  <li>✓ Team collaboration</li>
                </ul>
                <button
                  type="button"
                  className="premium-tier-cta premium-tier-cta-featured"
                  onClick={() => window.open(PREMIUM_REDIRECT_URL, '_blank', 'noopener,noreferrer')}
                >
                  Most Popular
                </button>
              </div>
              <div className="premium-tier">
                <div className="premium-tier-badge">Enterprise</div>
                <div className="premium-tier-price">
                  <span className="premium-tier-amount">$49</span>
                  <span className="premium-tier-period">/month</span>
                </div>
                <ul className="premium-tier-features">
                  <li>✓ Everything in Pro</li>
                  <li>✓ SSO & API access</li>
                  <li>✓ Dedicated support</li>
                  <li>✓ Custom integrations</li>
                </ul>
                <button
                  type="button"
                  className="premium-tier-cta"
                  onClick={() => window.open(PREMIUM_REDIRECT_URL, '_blank', 'noopener,noreferrer')}
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="app-main">
        <div className="app-topbar">
          <div className="topbar-content">
            <div className="topbar-user">
              <span className="user-email">{user?.email}</span>
              <button onClick={handleLogout} className="btn btn-sm" style={{ marginLeft: 'var(--spacing-md)' }}>
                Logout
              </button>
            </div>
          </div>
        </div>
        <div className="app-content">
          {children}
        </div>
      </div>
    </div>
  );
}
