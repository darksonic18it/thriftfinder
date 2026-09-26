import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Heart, Loader2, PackageOpen } from 'lucide-react';
import ProductCard, { Product } from '../components/ProductCard';
import { favoriteService } from '../services/favoriteService';
import { listingImageUrl } from '../lib/listingMappers';
import { useAuth } from '../context/AuthContext';
import type { UUID } from '../types/database';
import './SavedItems.css';

const SavedItems: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSavedItems = useCallback(async () => {
    if (!isAuthenticated) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: loadError } =
      await favoriteService.getMyFavoriteListings();

    if (loadError || !data) {
      setProducts([]);
      setError(loadError?.message ?? 'Could not load saved items.');
      setLoading(false);
      return;
    }

    const mapped: Product[] = data
    .filter((item) => item.status === 'active')
    .map((item) => ({
        id: item.listing_id,
        name: item.title,
        price: Number(item.price),
        condition: item.condition as Product['condition'],
        location: item.city,
        seller: item.seller_full_name,
        image: item.cover_image_path
        ? listingImageUrl(item.cover_image_path)
        : '',
  }));

    setProducts(mapped);
    setLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    void loadSavedItems();
  }, [loadSavedItems]);

  const handleRemoveFavorite = async (
    productId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    const previous = products;

    setProducts((current) =>
      current.filter((product) => product.id !== productId)
    );

    const { error: removeError } =
      await favoriteService.removeFavorite(productId as UUID);

    if (removeError) {
      setProducts(previous);
      setError(removeError.message);
    }
  };

  return (
    <div className="saved-items-page">
      <div className="saved-items-header">
        <div className="saved-items-header-container">
          <div className="saved-items-icon">
            <Heart size={20} />
          </div>

          <h1>Saved Items</h1>

          <p>
            Items you've saved for later. Keep track of the things you want
            to come back to.
          </p>
        </div>
      </div>

      <div className="saved-items-content">
        <div className="saved-items-container">
          {loading ? (
            <div className="saved-items-state" role="status">
              <Loader2
                size={28}
                className="saved-items-state-spinner"
              />
              <p>Loading your saved items…</p>
            </div>
          ) : error ? (
            <div className="saved-items-state" role="alert">
              <AlertCircle size={28} />
              <p>{error}</p>

              <button
                type="button"
                className="saved-items-retry"
                onClick={() => void loadSavedItems()}
              >
                Try again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="saved-items-state">
              <PackageOpen size={32} />
              <h2>No saved items yet</h2>
              <p>
                When you save an item, it will appear here.
              </p>
            </div>
          ) : (
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isFavorite
                  onToggleFavorite={handleRemoveFavorite}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedItems;