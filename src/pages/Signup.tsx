import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/button';
import './Signup.css';

const Signup: React.FC = () => {
  return (
    <div className="signup-page">
      <div className="signup-shell">
        <div className="signup-back">
          <Link to="/login" className="signup-back-link">
            <ArrowLeft size={18} />
            <span>Back to Login</span>
          </Link>
        </div>

        <div className="signup-card" role="region" aria-label="Sign up">
          <div className="signup-brand">
            <div className="signup-brand-icon" aria-hidden="true">
              <ShoppingBag size={22} color="#ffffff" />
            </div>
            <div className="signup-brand-text">
              <span className="signup-brand-name">Thrift</span>
              <span className="signup-brand-accent">Finder</span>
            </div>
          </div>

          <h1 className="signup-title">Sign up is coming soon</h1>
          <p className="signup-subtitle">
            This chunk focuses on the login UX. Registration will be wired up in the next
            implementation step.
          </p>

          <div className="signup-actions">
            <Button type="button" className="signup-primary" onClick={() => {}}>
              Continue
            </Button>
          </div>

          <div className="signup-actions">
            <Link to="/login" className="signup-primary-link" aria-label="Go to login">
              <span>Go to Login</span>
            </Link>
            <Link to="/browse" className="signup-secondary-link" aria-label="Back to browse">
              Back to Browse
            </Link>
          </div>

          <div className="signup-note" role="note">
            MVP demo only—no account is created yet.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
