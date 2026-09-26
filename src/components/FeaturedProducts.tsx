import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import ProductCard, { Product } from './ProductCard';
import { listingService } from '../services/listingService';
import { favoriteService } from '../services/favoriteService';
import { browseRowToProduct } from '../lib/listingMappers';
import { useAuth } from '../context/AuthContext';
import './FeaturedProducts.css';

/**
 * Landing-page grid. Shows the 8 most recent ACTIVE listings straight from
 * the database — the hardcoded `products` array and the "Demo listings for
 * this capstone MVP" label are gone.
 */
const FeaturedProducts: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await listingService.browse({ limit: 8 });
      if (!active) return;
      setProducts((data ?? []).map(browseRowToProduct));
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

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

    const { error } = await favoriteService.toggleFavorite(productId, currentlySaved);
    if (error) {
      setFavorites((prev) => ({ ...prev, [productId]: currentlySaved }));
    }
  };

  // Nothing listed yet: hide the whole section rather than show placeholders.
  if (!loading && products.length === 0) return null;

  return (
    <section className="featured-products" id="products">
      <div className="products-container">
        <div className="products-header">
          <div>
            <div className="products-badge" aria-hidden="true">
              <Sparkles size={14} />
              <span>Local discovery</span>
            </div>
            <h2 className="products-title">Popular Near You</h2>
            <p className="products-subtitle">
              See what people around their area are selling.
            </p>
          </div>
        </div>

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
      </div>
    </section>
  );
};

export default FeaturedProducts;