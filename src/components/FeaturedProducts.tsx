import { ArrowUpRight, Heart, MapPin } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { browseRowToProduct } from '../lib/listingMappers';
import { favoriteService } from '../services/favoriteService';
import { listingService } from '../services/listingService';
import './FeaturedProducts.css';
import type { Product } from './ProductCard';

/**
 * Landing-page "Popular Near You" section.
 *
 * UI: Framer "Featured Finds" vertical editorial list. Single-column,
 * full-width image-first cards (Title + arrow / Category / Price /
 * Seller / Condition) stacked vertically.
 * Scroll-triggered staggered blur+rise reveal when the section enters.
 *
 * UI ONLY: data (8 most recent ACTIVE listings), favorites behavior,
 * navigation (/listing/:id, /browse), and backend calls are unchanged.
 */

const SKELETON_COUNT = 3;

const pad2 = (n: number) => String(n).padStart(2, '0');

const conditionClass = (condition: Product['condition']) => {
  switch (condition) {
    case 'Like New':
      return 'ff-condition--like-new';
    case 'Excellent':
      return 'ff-condition--excellent';
    case 'Good':
      return 'ff-condition--good';
    default:
      return 'ff-condition--fair';
  }
};

interface FindProduct extends Product {
  /** Category comes from the already-fetched browse row — no extra backend call. */
  category?: string;
}

interface FindCardProps {
  product: FindProduct;
  index: number;
  isFavorite: boolean;
  onToggleFavorite: (productId: string, e: React.MouseEvent) => void;
}

const FindCard: React.FC<FindCardProps> = ({
  product,
  index,
  isFavorite,
  onToggleFavorite,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const open = () => navigate(`/listing/${product.id}`, { state: { from: location.pathname } });

  return (
    <article
      className="ff-card ff-reveal"
      style={{ '--ff-i': index } as React.CSSProperties}
      onClick={open}
    >
      <div className="ff-card__media">
        <img
          className="ff-card__img"
          src={product.image}
          alt={product.name}
          loading="lazy"
          draggable={false}
        />
        {product.tag ? <span className="ff-card__tag">{product.tag}</span> : null}
        <button
          type="button"
          className={`ff-heart${isFavorite ? ' active' : ''}`}
          onClick={(e) => onToggleFavorite(product.id, e)}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={isFavorite}
        >
          <Heart size={18} />
        </button>
      </div>

      <div className="ff-card__body">
        <div className="ff-card__top">
          <h3 className="ff-card__title">
            <Link
              to={`/listing/${product.id}`}
              state={{ from: location.pathname }}
              onClick={(e) => e.stopPropagation()}
              title={product.name}
            >
              {product.name}
            </Link>
          </h3>
          <span className="ff-card__open" aria-hidden="true">
            <ArrowUpRight size={20} />
          </span>
        </div>
        <p className="ff-card__meta-row">
          {product.category ? (
            <span className="ff-card__category">{product.category}</span>
          ) : null}
          <span className="ff-card__price">₱{product.price.toLocaleString()}</span>
          <span className="ff-card__seller">Seller — {product.seller}</span>
          <span className={`ff-condition ${conditionClass(product.condition)}`}>
            {product.condition}
          </span>
        </p>

        <p className="ff-card__place">
          <MapPin size={13} aria-hidden="true" />
          <span>{product.location}</span>
        </p>
      </div>
    </article>
  );
};

const FeaturedProducts: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState<FindProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // ---- data (unchanged behavior) -------------------------------------
  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await listingService.browse({ limit: 8 });
      if (!active) return;
      setProducts(
        (data ?? []).map((row) => ({
          ...browseRowToProduct(row),
          category: row.category,
        }))
      );
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

  // ---- scroll animation ------------------------------------------------
  const sectionRef = useRef<HTMLElement>(null);

  const [inView, setInView] = useState(false);

  // Reveal once when the section scrolls into view.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Nothing listed yet: hide the whole section rather than show placeholders.
  if (!loading && products.length === 0) return null;

  const total = products.length;

  return (
    <section
      className={`featured-products${inView ? ' ff-in' : ''}`}
      id="products"
      ref={sectionRef}
    >
      <div className="ff-container">
        <header className="ff-header ff-reveal">
          <div className="ff-header__text">
            {!loading ? (
              <p className="ff-kicker">{pad2(total)} — This week</p>
            ) : (
              <p className="ff-kicker">This week</p>
            )}
            <h2 className="ff-title" aria-label="Popular Near You">
              Popular Near You
            </h2>
            <p className="ff-subtitle">
              One-of-one finds from sellers around you — new pieces land every week.
            </p>
          </div>
          {!loading ? (
            <p className="ff-count" aria-hidden="true">
              {pad2(total)} — Near you
            </p>
          ) : null}
        </header>
      </div>

      <div className="ff-container">
        <div
          className="ff-list"
          role="list"
          aria-label="Popular listings near you."
        >
          {loading
            ? Array.from({ length: SKELETON_COUNT }, (_, i) => (
                <div className="ff-card ff-card--skeleton" key={i} aria-hidden="true">
                  <div className="ff-card__media" />
                  <div className="ff-card__body">
                    <span className="ff-skel ff-skel--title" />
                    <span className="ff-skel ff-skel--meta" />
                  </div>
                </div>
              ))
            : products.map((product, i) => (
                <FindCard
                  key={product.id}
                  product={product}
                  index={i}
                  isFavorite={!!favorites[product.id]}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
        </div>
      </div>

      {!loading ? (
        <div className="ff-container">
          <div className="ff-footer ff-reveal">
            <p className="ff-pieces" aria-hidden="true">
              {total.toLocaleString()}+ pieces
            </p>

            <button type="button" className="ff-explore" onClick={() => navigate('/browse')}>
              <span>Explore all finds</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default FeaturedProducts;