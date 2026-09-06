import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import './Login.css';

type LoginErrors = Partial<Record<'email' | 'password', string>>;

type ForgotErrors = Partial<Record<'email', string>>;

function isValidEmail(email: string) {
  // Simple, good-enough MVP validation.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const Login: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<LoginErrors>({});
  const [success, setSuccess] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotErrors, setForgotErrors] = useState<ForgotErrors>({});
  const [forgotSent, setForgotSent] = useState(false);

  const errorSummaryId = useMemo(() => 'login-error-summary', []);

  const validate = (): LoginErrors => {
    const next: LoginErrors = {};

    const e = email.trim();
    if (!e) next.email = 'Email is required.';
    else if (!isValidEmail(e)) next.email = 'Please enter a valid email address.';

    if (!password) next.password = 'Password is required.';

    return next;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    // Frontend-only MVP demo success.
    setSuccess(true);
  };

  const resetForgotDialog = () => {
    setForgotEmail('');
    setForgotErrors({});
    setForgotSent(false);
  };

  const openForgot = () => {
    resetForgotDialog();
    setForgotOpen(true);
  };

  const validateForgot = (): ForgotErrors => {
    const next: ForgotErrors = {};
    const e = forgotEmail.trim();
    if (!e) next.email = 'Email is required.';
    else if (!isValidEmail(e)) next.email = 'Please enter a valid email address.';
    return next;
  };

  const handleForgotSend = () => {
    const nextErrors = validateForgot();
    setForgotErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Frontend-only demo state.
    setForgotSent(true);
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-back">
          <Link to="/browse" className="login-back-link">
            <ArrowLeft size={18} />
            <span>Back to Browse</span>
          </Link>
        </div>

        <div className="login-card" role="region" aria-label="Login">
          <div className="login-brand">
            <div className="login-brand-icon" aria-hidden="true">
              <ShoppingBag size={22} color="#ffffff" />
            </div>
            <div className="login-brand-text">
              <span className="login-brand-name">Thrift</span>
              <span className="login-brand-accent">Finder</span>
            </div>
          </div>

          <h1 className="login-title">Welcome back</h1>
          <p className="login-subtitle">
            Sign in to continue finding great secondhand items near you.
          </p>

          {success ? (
            <div className="login-success" role="status" aria-live="polite">
              <div className="login-success-icon" aria-hidden="true">
                ✓
              </div>
              <h2 className="login-success-title">You’re signed in (MVP demo)</h2>
              <p className="login-success-desc">
                This is a frontend-only flow. Next, you’ll explore listings and manage your account in the full implementation.
              </p>
              <div className="login-success-actions">
                <Button
                  type="button"
                  className="login-submit-btn"
                  onClick={() => navigate('/browse')}
                >
                  Continue to Browse
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="login-secondary-btn"
                  onClick={() => setSuccess(false)}
                >
                  Sign out (demo)
                </Button>
              </div>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit} aria-describedby={errorSummaryId}>
              <div id={errorSummaryId} className="sr-only" aria-live="polite">
                {errors.email || errors.password ? 'Please fix the errors below.' : ''}
              </div>

              <div className="login-field">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                  className={errors.email ? 'login-input-error' : undefined}
                />
                {errors.email ? (
                  <div id="login-email-error" className="login-error" role="alert">
                    {errors.email}
                  </div>
                ) : null}
              </div>

              <div className="login-field">
                <Label htmlFor="login-password">Password</Label>

                <div className="login-password-wrap">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={errors.password ? 'login-password-error' : undefined}
                    className={errors.password ? 'login-input-error' : undefined}
                  />

                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {errors.password ? (
                  <div id="login-password-error" className="login-error" role="alert">
                    {errors.password}
                  </div>
                ) : null}
              </div>

              <div className="login-row">
                <label className="login-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="login-checkbox"
                  />
                  <span>Remember me</span>
                </label>
              </div>

              <div className="login-forgot-row">
                <button type="button" className="login-link" onClick={openForgot}>
                  Forgot password?
                </button>
              </div>

              <div className="login-submit-row">
                <Button type="submit" className="login-submit-btn">
                  Log In
                </Button>
              </div>

              <div className="login-signup">
                <span>Don’t have an account? </span>
                <Link to="/signup" className="login-signup-link">
                  Sign up
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          {!forgotSent ? (
            <>
              <DialogHeader>
                <DialogTitle>Recover your password</DialogTitle>
                <DialogDescription>
                  Enter your email and we’ll send recovery instructions in the full implementation.
                </DialogDescription>
              </DialogHeader>

              <div className="dialog-field">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  aria-invalid={forgotErrors.email ? true : undefined}
                  aria-describedby={forgotErrors.email ? 'forgot-email-error' : undefined}
                  className={forgotErrors.email ? 'login-input-error' : undefined}
                />
                {forgotErrors.email ? (
                  <div id="forgot-email-error" className="login-error" role="alert">
                    {forgotErrors.email}
                  </div>
                ) : null}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" className="login-submit-btn" onClick={handleForgotSend}>
                  Send recovery email
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="forgot-success" role="status" aria-live="polite">
                <div className="login-success-icon" aria-hidden="true">
                  ✓
                </div>
                <DialogHeader>
                  <DialogTitle>Request received (MVP demo)</DialogTitle>
                  <DialogDescription>
                    In this demo, we’re only showing the UX. Password recovery will be wired up in the next chunk.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  className="login-submit-btn"
                  onClick={() => {
                    setForgotOpen(false);
                    resetForgotDialog();
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
