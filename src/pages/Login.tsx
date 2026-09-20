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
import { useAuth } from '../context/AuthContext';
import './Login.css';

type LoginErrors = Partial<Record<'email' | 'password', string>>;

type ForgotErrors = Partial<Record<'email', string>>;

function isValidEmail(email: string) {
  // Simple, good-enough MVP validation.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signOut, sendPasswordReset, displayName } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [welcomeTitle, setWelcomeTitle] = useState<string>('');

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotErrors, setForgotErrors] = useState<ForgotErrors>({});
  const [forgotSending, setForgotSending] = useState(false);
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

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);

    if (error) {
      // Surface the server error in the existing password error slot.
      setErrors({ password: error });
      return;
    }

    setWelcomeTitle(displayName ? `Welcome back, ${displayName}!` : 'Welcome back!');
    setSuccess(true);
  };

  const resetForgotDialog = () => {
    setForgotEmail('');
    setForgotErrors({});
    setForgotSent(false);
    setForgotSending(false);
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

  const handleForgotSend = async () => {
    if (forgotSending) return;

    const nextErrors = validateForgot();
    setForgotErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setForgotSending(true);
    const { error } = await sendPasswordReset(forgotEmail);
    setForgotSending(false);

    if (error) {
      setForgotErrors({ email: error });
      return;
    }

    setForgotSent(true);
  };

  const handleDemoSignOut = async () => {
    await signOut();
    setSuccess(false);
    setWelcomeTitle('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="login-page">
      <div className="login-auth-shell">
        <div className="login-auth-grid">
          <aside className="login-auth-aside" aria-hidden="true">
            <div className="login-auth-aside-inner">
              <div className="login-auth-brand">
                <div className="login-auth-brand-icon">
                  <ShoppingBag size={22} color="#ffffff" />
                </div>
                <div className="login-auth-brand-text">
                  <span className="login-auth-brand-name">Thrift</span>
                  <span className="login-auth-brand-accent">Finder</span>
                </div>
              </div>

              <div className="login-auth-aside-copy">
                <h2 className="login-auth-aside-title">Secondhand, sorted—near you.</h2>
                <p className="login-auth-aside-desc">
                  Sign in to keep track of listings and save deals for later.
                </p>
              </div>
            </div>
          </aside>

          <main className="login-auth-main">
            <div className="login-card" role="region" aria-label="Login">
              <div className="login-card-header">
                <Link to="/browse" className="login-back-link">
                  <ArrowLeft size={18} />
                  <span>Back to Browse</span>
                </Link>
              </div>

              {!success ? (
                <form
                  className="login-form"
                  onSubmit={handleSubmit}
                  aria-describedby={errorSummaryId}
                >
                  <div id={errorSummaryId} className="sr-only" aria-live="polite">
                    {errors.email || errors.password ? 'Please fix the errors below.' : ''}
                  </div>

                  <h1 className="login-title">Sign in</h1>
                  <p className="login-subtitle">
                    Pick up where you left off and find quality secondhand items.
                  </p>

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
                    <Button type="submit" className="login-submit-btn" disabled={submitting}>
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
              ) : (
                <div className="login-success" role="status" aria-live="polite">
                  <div className="login-success-icon" aria-hidden="true">
                    ✓
                  </div>

                  <h2 className="login-success-title">{welcomeTitle || "Welcome back!"}</h2>
                  <p className="login-success-desc">
                    Continue to your dashboard to manage listings and track activity.
                  </p>

                  <div className="login-success-actions">
                    <Button
                      type="button"
                      className="login-submit-btn"
                      onClick={() => navigate('/dashboard')}
                    >
                      Continue
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="login-secondary-btn"
                      onClick={handleDemoSignOut}
                    >
                      Sign out (demo)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </main>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForgotOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="login-submit-btn"
                  onClick={handleForgotSend}
                  disabled={forgotSending}
                >
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