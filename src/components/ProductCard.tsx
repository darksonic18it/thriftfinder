
import { Heart, MapPin, User } from 'lucide-react';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './ProductCard.css';

export interface Product {
  id: string;
  name: string;
  price: number;
  condition: 'Like New' | 'Excellent' | 'Good' | 'Fair';
  location: string;
  seller: string;
  image: string;
  tag?: string;

  /** Approximate straight-line distance supplied by nearby search. */
  distanceKm?: number | null;
}

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (
    productId: string,
    e: React.MouseEvent
  ) => void;
}

const getConditionClass = (
  condition: Product['condition']
): string => {
  switch (condition) {
    case 'Like New':
      return 'condition-like-new';
    case 'Excellent':
      return 'condition-excellent';
    case 'Good':
      return 'condition-good';
    case 'Fair':
      return 'condition-fair';
    default:
      return '';
  }
};

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFavorite,
  onToggleFavorite,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleCardClick = () => {
    navigate(`/listing/${product.id}`, {
      state: {
        from: location.pathname,
        distanceKm: product.distanceKm ?? null,
        product,
      },
    });
  };

  const distanceKm = product.distanceKm;

const formattedDistance =
  typeof distanceKm === 'number' &&
  Number.isFinite(distanceKm) &&
  distanceKm >= 0
    ? distanceKm.toLocaleString('en-PH', {
        maximumFractionDigits: 1,
      })
    : null;

const hasDistance = formattedDistance !== null;

  return (
    <div
      className="product-card"
      onClick={handleCardClick}
    >
      {/* Product Image */}
      <div className="product-image-container">
        <img
          src={product.image}
          alt={product.name}
          className="product-image"
          loading="lazy"
        />

        {product.tag && (
          <span className="product-tag">
            {product.tag}
          </span>
        )}

        <button
          type="button"
          className={`product-heart-btn ${
            isFavorite ? 'active' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id, e);
          }}
          aria-label={
            isFavorite
              ? 'Remove from favorites'
              : 'Add to favorites'
          }
        >
          <Heart
            size={18}
            className={`heart-icon ${
              isFavorite ? 'heart-icon--active' : ''
            }`}
          />
        </button>
      </div>

      {/* Product Details */}
      <div className="product-body">
        <div className="product-meta-top">
          <span
            className={`condition-pill ${getConditionClass(
              product.condition
            )}`}
          >
            {product.condition}
          </span>
        </div>

        <h3 className="product-name" title={product.name}>
          {product.name}
        </h3>

        <div className="product-price">
          ₱{product.price.toLocaleString('en-PH')}
        </div>

        <div className="product-footer">
          <div className="product-seller">
            <User size={13} className="meta-icon" />
            <span>{product.seller}</span>
          </div>

          <div
            className="product-location"
            aria-label={
              hasDistance
                ? `${product.location}, approximately ${formattedDistance} kilometres away`
                : product.location
            }
          >
            <MapPin size={13} className="meta-icon" />

            <span>
              {product.location}

              {hasDistance && (
                <> · ~{formattedDistance} km away</>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
