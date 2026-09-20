import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import './Signup.css';

type SignupErrors = Partial<Record<'fullName' | 'email' | 'password' | 'confirmPassword' | 'terms', string>>;

function isValidEmail(email: string) {
  // Simple, good-enough MVP validation.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<SignupErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [welcomeTitle, setWelcomeTitle] = useState<string>('');

  const errorSummaryId = useMemo(() => 'signup-error-summary', []);

  const validate = (): SignupErrors => {
    const next: SignupErrors = {};

    const name = fullName.trim();
    if (!name) next.fullName = 'Please enter your full name.';

    const e = email.trim();
    if (!e) next.email = 'Email is required.';
    else if (!isValidEmail(e)) next.email = 'Please enter a valid email address.';

    if (!password) next.password = 'Password is required.';
    else if (password.length < 8) next.password = 'Password must be at least 8 characters.';

    if (!confirmPassword) next.confirmPassword = 'Please confirm your password.';
    else if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match.';

    if (!termsAccepted) next.terms = 'You must agree to the Terms and Conditions.';

    return next;
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    const normalizedName = fullName.trim();

    setSubmitting(true);
    const { error } = await signUp(email, password, normalizedName);
    setSubmitting(false);

    if (error) {
      // Surface the server error in the existing email error slot.
      setErrors({ email: error });
      return;
    }

    setWelcomeTitle(`Welcome, ${normalizedName}!`);
    setSuccess(true);
  };

  return (
    <div className="signup-page">
      <div className="signup-auth-shell">
        <div className="signup-auth-grid">
          <aside className="signup-auth-aside" aria-hidden="true">
            <div className="signup-auth-aside-inner">
              <div className="signup-auth-brand">
                <div className="signup-auth-brand-icon">
                  <ShoppingBag size={22} color="#ffffff" />
                </div>
                <div className="signup-auth-brand-text">
                  <span className="signup-auth-brand-name">Thrift</span>
                  <span className="signup-auth-brand-accent">Finder</span>
                </div>
              </div>

              <div className="signup-auth-aside-copy">
                <h2 className="signup-auth-aside-title">Quality deals, delivered nearby.</h2>
                <p className="signup-auth-aside-desc">
                  Create your account with email + password. No social logins.
                </p>
              </div>
            </div>
          </aside>

          <main className="signup-auth-main">
            <div className="signup-card" role="region" aria-label="Sign up">
              <div className="signup-card-header">
                <Link to="/browse" className="signup-back-link">
                  <ArrowLeft size={18} />
                  <span>Back to Browse</span>
                </Link>
              </div>

              {!success ? (
                <form
                  className="signup-form"
                  onSubmit={handleSubmit}
                  aria-describedby={errorSummaryId}
                >
                  <div id={errorSummaryId} className="sr-only" aria-live="polite">
                    {errors.fullName || errors.email || errors.password || errors.confirmPassword || errors.terms
                      ? 'Please fix the errors below.'
                      : ''}
                  </div>

                  <h1 className="signup-title">Create your account</h1>
                  <p className="signup-subtitle">Join ThriftFinder and get notified about quality deals.</p>

                  <div className="signup-field">
                    <Label htmlFor="signup-full-name">Full name</Label>
                    <Input
                      id="signup-full-name"
                      type="text"
                      placeholder="Juan Dela Cruz"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      aria-invalid={errors.fullName ? true : undefined}
                      aria-describedby={errors.fullName ? 'signup-full-name-error' : undefined}
                      className={errors.fullName ? 'signup-input-error' : undefined}
                    />
                    {errors.fullName ? (
                      <div id="signup-full-name-error" className="signup-error" role="alert">
                        {errors.fullName}
                      </div>
                    ) : null}
                  </div>

                  <div className="signup-field">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-invalid={errors.email ? true : undefined}
                      aria-describedby={errors.email ? 'signup-email-error' : undefined}
                      className={errors.email ? 'signup-input-error' : undefined}
                    />
                    {errors.email ? (
                      <div id="signup-email-error" className="signup-error" role="alert">
                        {errors.email}
                      </div>
                    ) : null}
                  </div>

                  <div className="signup-field">
                    <Label htmlFor="signup-password">Password</Label>

                    <div className="signup-password-wrap">
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        aria-invalid={errors.password ? true : undefined}
                        aria-describedby={errors.password ? 'signup-password-error' : undefined}
                        className={errors.password ? 'signup-input-error' : undefined}
                      />

                      <button
                        type="button"
                        className="signup-password-toggle"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <div className="signup-hint" aria-live="polite">
                      Use at least 8 characters.
                    </div>

                    {errors.password ? (
                      <div id="signup-password-error" className="signup-error" role="alert">
                        {errors.password}
                      </div>
                    ) : null}
                  </div>

                  <div className="signup-field">
                    <Label htmlFor="signup-confirm-password">Confirm password</Label>

                    <div className="signup-password-wrap">
                      <Input
                        id="signup-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        aria-invalid={errors.confirmPassword ? true : undefined}
                        aria-describedby={errors.confirmPassword ? 'signup-confirm-password-error' : undefined}
                        className={errors.confirmPassword ? 'signup-input-error' : undefined}
                      />

                      <button
                        type="button"
                        className="signup-password-toggle"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {errors.confirmPassword ? (
                      <div id="signup-confirm-password-error" className="signup-error" role="alert">
                        {errors.confirmPassword}
                      </div>
                    ) : null}
                  </div>

                  <div className="signup-terms-field">
                    <label className="signup-terms">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="signup-checkbox"
                        aria-invalid={errors.terms ? true : undefined}
                        aria-describedby={errors.terms ? 'signup-terms-error' : undefined}
                      />
                      <span>
                        I agree to the{' '}
                        <button
                          type="button"
                          className="signup-legal-link"
                          onClick={() => {}}
                        >
                          Terms and Conditions
                        </button>{' '}
                        and{' '}
                        <button
                          type="button"
                          className="signup-legal-link"
                          onClick={() => {}}
                        >
                          Privacy Policy
                        </button>
                        .
                      </span>
                    </label>

                    {errors.terms ? (
                      <div id="signup-terms-error" className="signup-error" role="alert">
                        {errors.terms}
                      </div>
                    ) : null}
                  </div>

                  <div className="signup-submit-row">
                    <Button type="submit" className="signup-submit-btn" disabled={submitting}>
                      Sign Up
                    </Button>
                  </div>

                  <div className="signup-login">
                    <span>Already have an account? </span>
                    <Link to="/login" className="signup-login-link">
                      Log in
                    </Link>
                  </div>
                </form>
              ) : (
                <div className="signup-success" role="status" aria-live="polite">
                  <div className="signup-success-icon" aria-hidden="true">
                    ✓
                  </div>

                  <h1 className="signup-success-title">{welcomeTitle || 'You’re in!'}</h1>
                  <p className="signup-success-desc">Your account is ready. Next, log in to start browsing and managing your listings.</p>

                  <div className="signup-success-actions">
                    <Button
                      type="button"
                      className="signup-submit-btn"
                      onClick={() => navigate('/dashboard')}
                    >
                      Get started
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="signup-secondary-action"
                      onClick={() => navigate('/login')}
                    >
                      Go to Log In
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Signup;