import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, User } from 'lucide-react';
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
}

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (productId: string, e: React.MouseEvent) => void;
}

const getConditionClass = (condition: Product['condition']) => {
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

const ProductCard: React.FC<ProductCardProps> = ({ product, isFavorite, onToggleFavorite }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/listing/${product.id}`);
  };

  return (
    <div className="product-card" onClick={handleCardClick}>
      {/* Image Container */}
      <div className="product-image-container">
        <img
          src={product.image}
          alt={product.name}
          className="product-image"
          loading="lazy"
        />
        {product.tag && (
          <span className="product-tag">{product.tag}</span>
        )}
        <button
          className={`product-heart-btn ${isFavorite ? 'active' : ''}`}
          onClick={(e) => onToggleFavorite(product.id, e)}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            size={18}
            className="heart-icon"
            fill={isFavorite ? '#ec4899' : 'none'}
            color={isFavorite ? '#ec4899' : '#475569'}
          />
        </button>
      </div>

      {/* Content Container */}
      <div className="product-body">
        <div className="product-meta-top">
          <span className={`condition-pill ${getConditionClass(product.condition)}`}>
            {product.condition}
          </span>
        </div>

        <h3 className="product-name" title={product.name}>
          {product.name}
        </h3>

        <div className="product-price">
          ₱{product.price.toLocaleString()}
        </div>

        <div className="product-footer">
          <div className="product-seller">
            <User size={13} className="meta-icon" />
            <span>{product.seller}</span>
          </div>
          <div className="product-location">
            <MapPin size={13} className="meta-icon" />
            <span>{product.location}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
