import { ArrowUpRight } from 'lucide-react';
import React, { useState } from 'react';
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
  /** Where the row links — always the existing /browse route. */
  search?: string;
  category?: string;
  /** Swapped into the side preview panel on hover. */
  image: string;
}

const LEFT_CATEGORIES: DisplayCategory[] = [
  {
    name: 'Clothing',
    search: 'clothing',
    image: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    name: 'Collectibles',
    search: 'collectibles',
    image: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?q=80&w=1228&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    name: 'Electronics',
    search: 'electronics',
    image: 'https://images.unsplash.com/photo-1648737966636-2fc3a5fffc8a?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    name: 'Bags',
    category: 'Bags',
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800&auto=format&fit=crop',
  },
  {
    name: 'Vintage',
    
    category: 'Vintage',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop',
  },
  {
    name: 'Streetwear',
    search: 'streetwear',
    image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=800&auto=format&fit=crop',
  },
];

const RIGHT_CATEGORIES: DisplayCategory[] = [
  {
    name: 'Books',
    search: 'books',
    image: 'https://images.unsplash.com/photo-1550399105-c4db5fb85c18?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    name: 'Furniture',
    search: 'furniture',
    image: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    name: 'Shoes',
    category: 'Shoes',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=800&auto=format&fit=crop',
  },
  {
    name: 'Accessories',
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?q=80&w=800&auto=format&fit=crop',
  },
  {
    name: 'Y2K',
    search: 'y2k',
    image: 'https://images.unsplash.com/photo-1724606854879-9321f9340a89?q=80&w=574&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
];

const DEFAULT_PHOTO =
  'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=800&auto=format&fit=crop';

const FeaturedCategories: React.FC = () => {
  const navigate = useNavigate();
  // UI-only hover state — swaps the side preview photo. No data fetching,
  // no service calls; purely a visual affordance.
  const [previewImage, setPreviewImage] = useState<string>(DEFAULT_PHOTO);

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
            onMouseEnter={() => setPreviewImage(item.image)}
            onFocus={() => setPreviewImage(item.image)}
            aria-label={`Browse ${item.name}`}
          >
            <span className="shopby-row-fill" aria-hidden="true" />
            <span className="shopby-row-left">
              <ArrowUpRight size={22} className="shopby-arrow" aria-hidden="true" />
              <span className="shopby-name">{item.name}</span>
            </span>
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

        <div
          className="shopby-body"
          onMouseLeave={() => setPreviewImage(DEFAULT_PHOTO)}
        >
          <div className="shopby-col">{renderList(LEFT_CATEGORIES)}</div>
          <div className="shopby-col">{renderList(RIGHT_CATEGORIES)}</div>
          <div className="shopby-photo-wrap" aria-hidden="true">
            <img
              key={previewImage}
              src={previewImage}
              alt=""
              className="shopby-photo"
              loading="lazy"
            />
          </div>
        </div>

        <div className="shopby-bottom">
          <span className="shopby-label shopby-label--muted">
            Give Pre-Loved Items Another Chance.
          </span>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;