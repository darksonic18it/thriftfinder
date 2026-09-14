import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, User } from 'lucide-react';

import ThemeToggle from '../components/ThemeToggle';
import type { Product } from '../components/ProductCard';

import '../components/Hero.css';
import './Dashboard.css';

const browsePreviewProducts: Product[] = [
  {
    id: 'browse-1',
    name: 'Vintage Denim Jacket',
    price: 850,
    condition: 'Excellent',
    location: 'Quezon City',
    seller: 'vintage_closet',
    image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=600&auto=format&fit=crop',
    tag: 'Vintage 90s',
  },
  {
    id: 'browse-2',
    name: 'Nike Sneakers',
    price: 1200,
    condition: 'Like New',
    location: 'Makati City',
    seller: 'kicks_manila',
    image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'browse-3',
    name: 'Y2K Shoulder Bag',
    price: 650,
    condition: 'Good',
    location: 'Cebu City',
    seller: 'retrochic.ph',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=600&auto=format&fit=crop',
    tag: 'Trending',
  },
];

const featuredPreviewProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Oversized Denim Jacket',
    price: 1250,
    condition: 'Excellent',
    location: 'Cagayan de Oro',
    seller: 'vintage_closet',
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=600&auto=format&fit=crop',
    tag: 'Local find',
  },
  {
    id: 'prod-2',
    name: 'Nike Sneakers',
    price: 1200,
    condition: 'Like New',
    location: 'Lapasan',
    seller: 'kicks_manila',
    image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'prod-3',
    name: 'Y2K Shoulder Bag',
    price: 650,
    condition: 'Good',
    location: 'Carmen',
    seller: 'retrochic.ph',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=600&auto=format&fit=crop',
    tag: 'Popular',
  },
];

type LocationState = {
  isNewUser?: boolean;
};

function formatPrice(price: number) {
  return `₱${price.toLocaleString()}`;
}

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
        <div className="dashboard-mini-card__price">{formatPrice(product.price)}</div>

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

  const isNewUser = state?.isNewUser === true;
  const displayProducts = isNewUser ? featuredPreviewProducts : browsePreviewProducts;

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
                {isNewUser ? 'Welcome to ThriftFinder, Khim Jay!' : 'Welcome back, Khim Jay'}
              </h1>
              <div className="dashboard-location">
                <MapPin size={14} className="dashboard-location-icon" />
                <span>Pagadian City</span>
              </div>
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
                <div className="dashboard-stat-value">2</div>
                <div className="dashboard-stat-label">Active listings</div>
              </div>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-value">5</div>
                <div className="dashboard-stat-label">Saved items</div>
              </div>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-value">1</div>
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

        <section className="dashboard-section" aria-label={isNewUser ? 'Popular items' : 'Continue browsing'}>
          <h2 className="dashboard-section-title">
            {isNewUser ? 'Popular near you' : 'Continue browsing near you'}
          </h2>

          <div className="dashboard-mini-grid">
            {displayProducts.map((product) => (
              <MiniProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
