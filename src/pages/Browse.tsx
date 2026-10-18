
import { AlertCircle, Loader2, LocateFixed, MapPin, PackageOpen, Search } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard, { Product } from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { useHideOnScroll } from '../hooks/useHideOnScroll';
import { browseRowToProduct } from '../lib/listingMappers';
import { searchBarangayCoordinates, type BarangayCoordinate } from '../lib/philippineBarangays';
import { favoriteService } from '../services/favoriteService';
import { listingService } from '../services/listingService';

import {
  getBuyerLocation,
  getCurrentGpsLocation,
  saveBuyerLocation,
} from '../lib/nearbyLocation';

import { LISTING_CONDITIONS } from '../types/database';
import './Browse.css';
import './SavedItems.css';

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
  const [searchParams] = useSearchParams();

  const initialCategory = searchParams.get('category') ?? 'All';
  const initialSearch = searchParams.get('search') ?? '';

  const [selectedCategory, setSelectedCategory] = useState(
    categories.includes(initialCategory) ? initialCategory : 'All'
  );
  const [selectedCondition, setSelectedCondition] = useState('All');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [nearbyOrigin, setNearbyOrigin] = useState<{ latitude: number; longitude: number; label: string; source: 'gps' | 'barangay' } | null>(null);
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState(5);
  const [manualLocationQuery, setManualLocationQuery] = useState('');
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const manualLocationResults = useMemo(
    () => searchBarangayCoordinates(manualLocationQuery, 10),
    [manualLocationQuery]
  );

  const controlsHidden = useHideOnScroll(false);

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
    setLoadMoreError(null);
    setHasMore(false);

    const filters = {
      search: debouncedSearch,
      category: selectedCategory,
      condition: selectedCondition,
      minPrice: parsedMin,
      maxPrice: parsedMax,
      limit: 48,
      offset: 0,
    };
    const result = nearbyOrigin
      ? await listingService.browseNearby(
          { latitude: nearbyOrigin.latitude, longitude: nearbyOrigin.longitude },
          nearbyRadiusKm,
          filters
        )
      : await listingService.browse(filters);
    const { data, error: loadError } = result;

    if (loadError || !data) {
      setProducts([]);
      setError(loadError?.message ?? 'Could not load listings.');
      setLoading(false);
      return;
    }

    setProducts(data.map(browseRowToProduct));
    setHasMore(data.length === 48);
    setLoading(false);
  }, [debouncedSearch, selectedCategory, selectedCondition, parsedMin, parsedMax, nearbyOrigin, nearbyRadiusKm]);

  const loadMoreListings = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    const filters = {
      search: debouncedSearch,
      category: selectedCategory,
      condition: selectedCondition,
      minPrice: parsedMin,
      maxPrice: parsedMax,
      limit: 48,
      offset: products.length,
    };
    const result = nearbyOrigin
      ? await listingService.browseNearby(
          { latitude: nearbyOrigin.latitude, longitude: nearbyOrigin.longitude },
          nearbyRadiusKm,
          filters
        )
      : await listingService.browse(filters);
    if (result.error || !result.data) {
      setLoadMoreError(result.error?.message ?? 'Could not load more listings.');
      setLoadingMore(false);
      return;
    }
    setProducts((previous) => [...previous, ...result.data!.map(browseRowToProduct)]);
    setHasMore(result.data.length === 48);
    setLoadingMore(false);
  }, [loadingMore, loading, hasMore, debouncedSearch, selectedCategory, selectedCondition, parsedMin, parsedMax, products.length, nearbyOrigin, nearbyRadiusKm]);

  
const findNearbyWithGps = async () => {
  setLocationMessage(null);
  setLocating(true);

  try {
    // This helper also saves the GPS location for later use.
    const buyerLocation = await getCurrentGpsLocation();

    setNearbyOrigin(buyerLocation);
    setShowManualFallback(false);
    setLocationMessage(
      'Using your current location. Distances are approximate because listing locations are rounded for privacy.'
    );
  } catch {
    setShowManualFallback(true);
    setLocationMessage(
      'Could not get GPS. Search for your barangay below to continue.'
    );
  } finally {
    setLocating(false);
  }
};


  const chooseManualLocation = (place: BarangayCoordinate) => {
  const buyerLocation = {
    latitude: place.latitude,
    longitude: place.longitude,
    label: place.label,
    source: 'barangay' as const,
  };

  saveBuyerLocation(buyerLocation);
  setNearbyOrigin(buyerLocation);
  setManualLocationQuery(place.label);
  setShowManualFallback(false);

  setLocationMessage(
    'Using an approximate barangay reference point. Distances may be less precise.'
  );
};

  const showAllListings = () => {
    setNearbyOrigin(null);
    setShowManualFallback(false);
    setLocationMessage(null);
    setManualLocationQuery('');
  };

  
    
useEffect(() => {
  const savedLocation = getBuyerLocation();

  if (!savedLocation) return;

  setNearbyOrigin(savedLocation);

  if (savedLocation.source === 'barangay') {
    setManualLocationQuery(savedLocation.label);
  }
}, []);



  useEffect(() => {
    void loadListings();
  }, [loadListings]);

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
    parsedMax !== null ||
    nearbyOrigin !== null;

  return (
    <div className="browse-page">
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

      <div className="browse-controls">
        <div className="browse-controls-container">
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

          <div className="nearby-search-panel">
            <div className="nearby-search-actions">
              <button type="button" className="category-btn" onClick={findNearbyWithGps} disabled={locating}>
                {locating ? <Loader2 size={15} className="browse-state-spinner" /> : <LocateFixed size={15} />}
                {locating ? 'Finding you…' : 'Use my location'}
              </button>
              <button type="button" className={`category-btn${showManualFallback ? ' active' : ''}`} onClick={() => setShowManualFallback((open) => !open)}>
                <MapPin size={15} /> Choose barangay manually
              </button>
              {nearbyOrigin ? (
                <button type="button" className="category-btn" onClick={showAllListings}>Show all listings</button>
              ) : null}
            </div>

            {nearbyOrigin ? (
              <div className="nearby-active-location">
                <span><MapPin size={14} /> Nearby: {nearbyOrigin.label}</span>
                <label className="nearby-radius-label">
                  Radius
                  <select value={nearbyRadiusKm} onChange={(event) => setNearbyRadiusKm(Number(event.target.value))} aria-label="Nearby search radius">
                    {[1, 5, 10, 20, 50].map((radius) => <option key={radius} value={radius}>{radius} km</option>)}
                  </select>
                </label>
              </div>
            ) : null}

            {showManualFallback ? (
              <div className="nearby-manual-picker">
                <label htmlFor="nearby-location-query">Search barangay, city/municipality, or province</label>
                <input
                  id="nearby-location-query"
                  className="search-input nearby-manual-input"
                  type="search"
                  placeholder="e.g. Matina, Davao City"
                  value={manualLocationQuery}
                  onChange={(event) => setManualLocationQuery(event.target.value)}
                  autoComplete="off"
                />
                {manualLocationResults.length > 0 ? (
                  <div className="nearby-manual-results" role="listbox" aria-label="Barangay location suggestions">
                    {manualLocationResults.map((place) => (
                      <button type="button" key={`${place.label}-${place.latitude}-${place.longitude}`} role="option" aria-selected={nearbyOrigin?.label === place.label} onClick={() => chooseManualLocation(place)}>
                        <MapPin size={14} /> <span>{place.label}</span>
                      </button>
                    ))}
                  </div>
                ) : manualLocationQuery.trim().length >= 2 ? (
                  <p className="nearby-location-note">No matching coordinate candidate found. Try the barangay or municipality name.</p>
                ) : (
                  <p className="nearby-location-note">Type at least 2 characters, then select the matching barangay and municipality.</p>
                )}
                <p className="nearby-location-note">Manual points are approximate reference coordinates, not exact addresses; some source points still need independent verification.</p>
              </div>
            ) : null}
                        {locationMessage ? <p className="nearby-location-message" role="status">{locationMessage}</p> : null}
          </div>
        </div>
      </div>

      <div className={`browse-categories-bar${controlsHidden ? ' browse-categories-bar--navhidden' : ''}`}>
        <div className="browse-controls-container">
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
        </div>
      </div>

      <div className="browse-refine-bar">
        <div className="browse-controls-container">
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
                {nearbyOrigin
                  ? `No items with saved approximate locations were found within ${nearbyRadiusKm} km. Try a wider radius or choose another location.`
                  : hasActiveFilters
                  ? 'No items match your search yet. Try a different keyword or filter.'
                  : 'No items have been listed yet. Be the first to sell something!'}
              </p>
            </div>
          ) : (
            <>
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
              {loadMoreError ? <p className="nearby-location-message" role="alert">{loadMoreError}</p> : null}
              {hasMore ? (
                <div className="browse-load-more-wrap">
                  <button type="button" className="category-btn active" onClick={() => void loadMoreListings()} disabled={loadingMore}>
                    {loadingMore ? 'Loading more…' : 'Load more listings'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Browse;
