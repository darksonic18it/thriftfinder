import React from 'react';
import { useNavigate } from 'react-router-dom';
import './FeaturedCategories.css';

/**
 * UI ONLY — display names + counts mirror the inspiration screenshot exactly.
 * Backend untouched: clicks route to the existing /browse page via a
 * search/category mapping (see CATEGORY_TARGET below). No DB types,
 * services, migrations, or RLS touched here.
 */
interface DisplayCategory {
  name: string;
  count: string;
  /** Where the row links — always the existing /browse route. */
  search?: string;
  category?: string;
}

const LEFT_CATEGORIES: DisplayCategory[] = [
  { name: 'Women', count: '3,412', search: 'women' },
  { name: 'Tops', count: '4,105', search: 'tops' },
  { name: 'Outerwear', count: '1,204', search: 'outerwear' },
  { name: 'Bags', count: '942', category: 'Bags' },
  { name: 'Vintage', count: '2,061', category: 'Vintage' },
  { name: 'Streetwear', count: '2,644', search: 'streetwear' },
];

const RIGHT_CATEGORIES: DisplayCategory[] = [
  { name: 'Men', count: '2,870', search: 'men' },
  { name: 'Bottoms', count: '2,238', search: 'bottoms' },
  { name: 'Shoes', count: '1,876', category: 'Shoes' },
  { name: 'Accessories', count: '1,530', category: 'Accessories' },
  { name: 'Y2K', count: '1,318', search: 'y2k' },
];

const CATEGORY_PHOTO =
  'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=800&auto=format&fit=crop';

const FeaturedCategories: React.FC = () => {
  const navigate = useNavigate();

  const goToBrowse = (item: DisplayCategory) => {
    const params = new URLSearchParams();
    if (item.category) params.set('category', item.category);
    if (item.search) params.set('search', item.search);
    const qs = params.toString();
    navigate(qs ? `/browse?${qs}` : '/browse');
  };

  const renderList = (items: DisplayCategory[]) => (
    <ul className="shopby-list">
      {items.map((item) => (
        <li key={item.name}>
          <button
            type="button"
            className="shopby-row"
            onClick={() => goToBrowse(item)}
            aria-label={`Browse ${item.name}`}
          >
            <span className="shopby-name">{item.name}</span>
            <span className="shopby-count">{item.count}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="featured-categories" id="browse">
      <div className="categories-container">
        <div className="shopby-top">
          <span className="shopby-label">Shop by</span>
          <span className="shopby-label shopby-label--muted">Categories — 11</span>
        </div>

        <div className="shopby-body">
          <div className="shopby-col">{renderList(LEFT_CATEGORIES)}</div>
          <div className="shopby-col">{renderList(RIGHT_CATEGORIES)}</div>
          <div className="shopby-photo-wrap" aria-hidden="true">
            <img
              src={CATEGORY_PHOTO}
              alt=""
              className="shopby-photo"
              loading="lazy"
            />
          </div>
        </div>

        <div className="shopby-bottom">
          <span className="shopby-label shopby-label--muted">
            Women — Men — Everyone
          </span>
          <span className="shopby-label shopby-label--muted">
            New drops every Friday
          </span>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;

