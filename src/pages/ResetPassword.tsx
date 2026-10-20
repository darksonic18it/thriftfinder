import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase } from '../lib/supabaseClient';
import './Login.css';
import './ResetPassword.css';

const ResetPassword: React.FC = () => {
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === 'PASSWORD_RECOVERY' && session) {
        setHasRecoverySession(true);
        setCheckingSession(false);
      } else if (!session) {
        setHasRecoverySession(false);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;

        setHasRecoverySession(!!data.session);
        if (sessionError) {
          setError('We could not verify this reset link. Please request a new one.');
        }
        setCheckingSession(false);
      })
      .catch(() => {
        if (!active) return;
        setError('We could not verify this reset link. Please request a new one.');
        setCheckingSession(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Your password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    if (!hasRecoverySession) {
      setError('Your reset session has expired. Please request a new password reset email.');
      return;
    }

    setSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setCompleted(true);
    } catch {
      setError('Something went wrong while updating your password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page reset-password-page">
      <div className="login-auth-shell">
        <div className="login-auth-grid">
          <aside className="login-auth-aside" aria-hidden="true">
            <div className="login-auth-aside-inner">
              <div className="login-auth-brand">
                <BrandMark size={44} />
                <div className="login-auth-brand-text">
                  <span className="login-auth-brand-name">Thrift</span>
                  <span className="login-auth-brand-accent">Finder</span>
                </div>
              </div>
              <div className="login-auth-aside-copy">
                <h2 className="login-auth-aside-title">A fresh start, securely.</h2>
                <p className="login-auth-aside-desc">
                  Choose a new password to get back to finding quality secondhand items.
                </p>
              </div>
            </div>
          </aside>

          <main className="login-auth-main">
            <section className="login-card" aria-labelledby="reset-password-title">
              <div className="login-card-header">
                <Link to="/login" className="login-back-link">
                  <ArrowLeft size={18} />
                  <span>Back to sign in</span>
                </Link>
              </div>

              {checkingSession ? (
                <div className="reset-password-message" role="status" aria-live="polite">
                  <h1 id="reset-password-title" className="login-title">Verifying reset link</h1>
                  <p className="login-subtitle">Please wait while we verify your secure password-reset session.</p>
                </div>
              ) : completed ? (
                <div className="login-success" role="status" aria-live="polite">
                  <div className="login-success-icon" aria-hidden="true">✓</div>
                  <h1 id="reset-password-title" className="login-success-title">Password updated!</h1>
                  <p className="login-success-desc">
                    Your ThriftFinder password has been changed successfully. You can now continue to sign in with your new password.
                  </p>
                  <Link to="/login" className="reset-password-link-button">
                    Return to sign in
                  </Link>
                </div>
              ) : !hasRecoverySession ? (
                <div className="reset-password-message">
                  <h1 id="reset-password-title" className="login-title">Reset link expired</h1>
                  <p className="login-subtitle">
                    This password-reset link is invalid, expired, or has already been used. Request a new reset email to continue.
                  </p>
                  {error ? <p className="login-error" role="alert">{error}</p> : null}
                  <Link to="/login" className="reset-password-link-button">
                    Return to sign in
                  </Link>
                </div>
              ) : (
                <form className="login-form" onSubmit={handleSubmit}>
                  <h1 id="reset-password-title" className="login-title">Create a new password</h1>
                  <p className="login-subtitle">
                    Use at least 8 characters. Choose a password you have not used before.
                  </p>

                  <div className="login-field">
                    <Label htmlFor="reset-password">New password</Label>
                    <div className="login-password-wrap">
                      <Input
                        id="reset-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        minLength={8}
                        required
                        aria-describedby="reset-password-hint"
                      />
                      <button
                        type="button"
                        className="login-password-toggle"
                        onClick={() => setShowPassword((visible) => !visible)}
                        aria-label={showPassword ? 'Hide new password' : 'Show new password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <span id="reset-password-hint" className="reset-password-hint">
                      Minimum 8 characters.
                    </span>
                  </div>

                  <div className="login-field">
                    <Label htmlFor="reset-confirm-password">Confirm new password</Label>
                    <div className="login-password-wrap">
                      <Input
                        id="reset-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Enter your new password again"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        className="login-password-toggle"
                        onClick={() => setShowConfirmPassword((visible) => !visible)}
                        aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {error ? <div className="login-error" role="alert">{error}</div> : null}

                  <div className="login-submit-row">
                    <Button type="submit" className="login-submit-btn" disabled={submitting}>
                      {submitting ? 'Updating password…' : 'Update password'}
                    </Button>
                  </div>
                </form>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
