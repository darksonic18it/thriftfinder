import React from 'react';

import ThemeToggle from '../components/ThemeToggle';

import './Profile.css';

const Profile: React.FC = () => {
  return (
    <div className="profile-page">
      <header className="profile-header">
        <div className="profile-header-container">
          <div className="profile-header-left">
            <div className="profile-avatar-ring" aria-hidden="true" />
            <div className="profile-header-text">
              <h1 className="profile-heading">Profile</h1>
              <p className="profile-subtitle">Update your account details.</p>
            </div>
          </div>

          <div className="profile-header-theme">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="profile-content">
        <section className="profile-card" aria-label="Profile placeholder">
          <h2 className="profile-card-title">Profile page (placeholder)</h2>
          <p className="profile-card-text">
            This is a minimal placeholder page. Your actual profile content will go here.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Profile;
