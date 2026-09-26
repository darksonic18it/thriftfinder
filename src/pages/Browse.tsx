import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, MapPin, Loader2, PackageOpen, AlertCircle } from 'lucide-react';
import ProductCard, { Product } from '../components/ProductCard';
import { listingService } from '../services/listingService';
import { favoriteService } from '../services/favoriteService';
import { browseRowToProduct } from '../lib/listingMappers';
import { useAuth } from '../context/AuthContext';
import { LISTING_CONDITIONS } from '../types/database';
import './Browse.css';

/**
 * Static UI configuration — NOT mock marketplace data. These labels drive the
 * category filter chips and are sent to browse_listings() as p_category.
 * They match src/types/database.ts LISTING_CATEGORIES (plus 'All').
 */
const categories = [
  'All',
  'Clothing',
  'Shoes',
  'Accessories',
  'Electronics',
  'Collectibles',
  'Bags',
  'Vintage',
  'Furniture',
  'Books',
  'Sports',
  'Others',
];

const conditions = ['All', ...LISTING_CONDITIONS];

const Browse: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCondition, setSelectedCondition] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Debounce the keyword so typing doesn't fire a query per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const parsedMin = useMemo(() => {
    const n = Number(minPrice);
    return minPrice.trim() && Number.isFinite(n) ? n : null;
  }, [minPrice]);

  const parsedMax = useMemo(() => {
    const n = Number(maxPrice);
    return maxPrice.trim() && Number.isFinite(n) ? n : null;
  }, [maxPrice]);

  const loadListings = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: loadError } = await listingService.browse({
      search: debouncedSearch,
      category: selectedCategory,
      condition: selectedCondition,
      minPrice: parsedMin,
      maxPrice: parsedMax,
      limit: 48,
    });

    if (loadError || !data) {
      setProducts([]);
      setError(loadError?.message ?? 'Could not load listings.');
      setLoading(false);
      return;
    }

    setProducts(data.map(browseRowToProduct));
    setLoading(false);
  }, [debouncedSearch, selectedCategory, selectedCondition, parsedMin, parsedMax]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  // Saved items (OPTIONAL module — requires migration 04 + favoriteService).
  // If the favorites table is absent the call fails quietly and hearts simply
  // stay unfilled, so Browse keeps working without it.
  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setFavorites({});
      return;
    }

    (async () => {
      const { data } = await favoriteService.getMyFavoriteIds();
      if (!active || !data) return;
      const map: Record<string, boolean> = {};
      data.forEach((id) => {
        map[id] = true;
      });
      setFavorites(map);
    })();

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const toggleFavorite = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) return;

    const currentlySaved = !!favorites[productId];
    // Optimistic flip, reverted if the database rejects it.
    setFavorites((prev) => ({ ...prev, [productId]: !currentlySaved }));

    const { error: toggleError } = await favoriteService.toggleFavorite(
      productId,
      currentlySaved
    );

    if (toggleError) {
      setFavorites((prev) => ({ ...prev, [productId]: currentlySaved }));
    }
  };

  const hasActiveFilters =
    debouncedSearch.trim().length > 0 ||
    selectedCategory !== 'All' ||
    selectedCondition !== 'All' ||
    parsedMin !== null ||
    parsedMax !== null;

  return (
    <div className="browse-page">
      {/* Page Header */}
      <div className="browse-header">
        <div className="browse-header-container">
          <div className="location-indicator">
            <MapPin size={16} />
            <span>Items near you</span>
          </div>
          <h1 className="browse-title">Browse Items</h1>
          <p className="browse-description">
            Discover unique pre-loved items available in your area. Find your next treasure today.
          </p>
        </div>
      </div>

      {/* Search & Filters Section */}
      <div className="browse-controls">
        <div className="browse-controls-container">
          {/* Search Bar */}
          <div className="search-wrapper">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search for items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <div className="category-filter">
            {categories.map((category) => (
              <button
                key={category}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {/*
            SRS FR-004 requires filtering by keyword, category, PRICE RANGE and
            CONDITION. The shipped UI only had keyword + category, so this row
            is the minimum addition needed to satisfy the requirement. It reuses
            the existing .category-btn chip styling.
          */}
          <div className="browse-refine-row">
            <div className="condition-filter">
              {conditions.map((c) => (
                <button
                  key={c}
                  className={`category-btn ${selectedCondition === c ? 'active' : ''}`}
                  onClick={() => setSelectedCondition(c)}
                >
                  {c === 'All' ? 'Any condition' : c}
                </button>
              ))}
            </div>

            <div className="price-range-filter">
              <span className="price-range-label">₱</span>
              <input
                type="number"
                min={0}
                className="price-range-input"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                aria-label="Minimum price"
              />
              <span className="price-range-dash">–</span>
              <input
                type="number"
                min={0}
                className="price-range-input"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                aria-label="Maximum price"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="browse-products">
        <div className="browse-products-container">
          {loading ? (
            <div className="browse-state" role="status" aria-live="polite">
              <Loader2 size={28} className="browse-state-spinner" />
              <p>Loading listings…</p>
            </div>
          ) : error ? (
            <div className="browse-state" role="alert">
              <AlertCircle size={28} className="browse-state-icon" />
              <p>{error}</p>
              <button type="button" className="category-btn active" onClick={() => void loadListings()}>
                Try again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="browse-state">
              <PackageOpen size={28} className="browse-state-icon" />
              <p>
                {hasActiveFilters
                  ? 'No items match your search yet. Try a different keyword or filter.'
                  : 'No items have been listed yet. Be the first to sell something!'}
              </p>
            </div>
          ) : (
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isFavorite={!!favorites[product.id]}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Browse;