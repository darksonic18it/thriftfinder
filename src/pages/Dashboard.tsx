import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, User } from 'lucide-react';

import ThemeToggle from '../components/ThemeToggle';
import type { Product } from '../components/ProductCard';
import { listingService } from '../services/listingService';
import { favoriteService } from '../services/favoriteService';
import { browseRowToProduct, formatPeso } from '../lib/listingMappers';
import { useAuth } from '../context/AuthContext';
import type { MyStatsRow } from '../types/database';

import '../components/Hero.css';
import './Dashboard.css';

type LocationState = {
  isNewUser?: boolean;
};

const EMPTY_STATS: MyStatsRow = {
  active_listings: 0,
  archived_listings: 0,
  reserved_listings: 0,
  sold_listings: 0,
  my_active_reservations: 0,
  my_past_reservations: 0,
  incoming_reservations: 0,
};

function MiniProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();

  const handleOpen = () => {
    navigate(`/listing/${product.id}`);
  };

  return (
    <div
      className="dashboard-mini-card"
      role="link"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleOpen();
      }}
      aria-label={`Open listing: ${product.name}`}
    >
      <div className="dashboard-mini-card__image">
        <img src={product.image} alt={product.name} loading="lazy" />
        {product.tag ? <span className="dashboard-mini-card__tag">{product.tag}</span> : null}
      </div>

      <div className="dashboard-mini-card__body">
        <div className="dashboard-mini-card__condition">{product.condition}</div>
        <h3 className="dashboard-mini-card__name" title={product.name}>
          {product.name}
        </h3>
        <div className="dashboard-mini-card__price">{formatPeso(product.price)}</div>

        <div className="dashboard-mini-card__location">
          <MapPin size={14} className="dashboard-mini-card__location-icon" />
          <span>{product.location}</span>
        </div>
      </div>
    </div>
  );
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState | null) ?? undefined;

  const { displayName } = useAuth();

  const [stats, setStats] = useState<MyStatsRow>(EMPTY_STATS);
  const [savedCount, setSavedCount] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [homeCity, setHomeCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // "New user" is now derived from the database, not from router state:
  // a user with no listings, no saved items and no reservations is new.
  const routeSaysNewUser = state?.isNewUser === true;

  useEffect(() => {
    let active = true;

    (async () => {
      const [statsResult, browseResult, myListingsResult, saved] = await Promise.all([
        listingService.getMyStats(),
        listingService.browse({ limit: 3 }),
        listingService.getMyListings(),
        favoriteService.countMyFavorites(),
      ]);

      if (!active) return;

      setStats(statsResult.data ?? EMPTY_STATS);
      setProducts((browseResult.data ?? []).map(browseRowToProduct));
      setSavedCount(saved);

      // The profile table has no city column (and the SRS doesn't ask for
      // one), so the greeting location comes from the user's most recent
      // listing. If they haven't listed anything, the line is hidden rather
      // than filled with a made-up city.
      const latest = (myListingsResult.data ?? [])[0];
      setHomeCity(latest?.city ?? null);

      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  const hasActivity =
    stats.active_listings > 0 ||
    stats.archived_listings > 0 ||
    stats.my_active_reservations > 0 ||
    stats.my_past_reservations > 0 ||
    savedCount > 0;

  const isNewUser = routeSaysNewUser || (!loading && !hasActivity);

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header-container">
          <div className="dashboard-header-left">
            <div className="dashboard-avatar-ring" aria-hidden="true">
              <div className="dashboard-avatar">
                <User size={22} className="dashboard-avatar-icon" />
              </div>
            </div>

            <div className="dashboard-header-text">
              <h1 className="dashboard-heading">
                {isNewUser
                  ? `Welcome to ThriftFinder${displayName ? `, ${displayName}` : ''}!`
                  : `Welcome back${displayName ? `, ${displayName}` : ''}`}
              </h1>
              {homeCity ? (
                <div className="dashboard-location">
                  <MapPin size={14} className="dashboard-location-icon" />
                  <span>{homeCity}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="dashboard-header-theme">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        {!isNewUser ? (
          <section className="dashboard-stats" aria-label="Account stats">
            <div className="dashboard-stats-grid">
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-value">{stats.active_listings}</div>
                <div className="dashboard-stat-label">Active listings</div>
              </div>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-value">{savedCount}</div>
                <div className="dashboard-stat-label">Saved items</div>
              </div>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-value">{stats.my_active_reservations}</div>
                <div className="dashboard-stat-label">Pending pickups</div>
              </div>
            </div>
          </section>
        ) : (
          <p className="dashboard-onboarding-message">
            You haven't listed or saved anything yet — here's how to get started.
          </p>
        )}

        <section className="dashboard-actions" aria-label="Primary actions">
          <button type="button" className="btn-primary" onClick={() => navigate('/browse')}>
            Browse Items
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/create-listing')}>
            Sell an Item
          </button>
        </section>

        <section
          className="dashboard-section"
          aria-label={isNewUser ? 'Popular items' : 'Continue browsing'}
        >
          <h2 className="dashboard-section-title">
            {isNewUser ? 'Popular near you' : 'Continue browsing near you'}
          </h2>

          <div className="dashboard-mini-grid">
            {loading ? (
              <p className="dashboard-onboarding-message">Loading listings…</p>
            ) : products.length === 0 ? (
              <p className="dashboard-onboarding-message">
                No items have been listed yet. Be the first to sell something!
              </p>
            ) : (
              products.map((product) => <MiniProductCard key={product.id} product={product} />)
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;