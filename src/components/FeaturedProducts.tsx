import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import ProductCard, { Product } from './ProductCard';
import './FeaturedProducts.css';

const products: Product[] = [
  {
    id: 'prod-1',
    name: 'Vintage Denim Jacket',
    price: 850,
    condition: 'Excellent',
    location: 'Quezon City',
    seller: 'vintage_closet',
    image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=600&auto=format&fit=crop',
    tag: 'Vintage 90s',
  },
  {
    id: 'prod-2',
    name: 'Nike Sneakers',
    price: 1200,
    condition: 'Like New',
    location: 'Makati City',
    seller: 'kicks_manila',
    image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'prod-3',
    name: 'Y2K Shoulder Bag',
    price: 650,
    condition: 'Good',
    location: 'Cebu City',
    seller: 'retrochic.ph',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=600&auto=format&fit=crop',
    tag: 'Trending',
  },
  {
    id: 'prod-4',
    name: 'Graphic T-Shirt',
    price: 450,
    condition: 'Good',
    location: 'Pasig City',
    seller: 'thrifted_finds',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'prod-5',
    name: 'Vintage Camera',
    price: 2500,
    condition: 'Like New',
    location: 'Manila',
    seller: 'analog_vault',
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop',
    tag: 'Rare',
  },
  {
    id: 'prod-6',
    name: 'Cargo Pants',
    price: 700,
    condition: 'Good',
    location: 'Taguig City',
    seller: 'street_wear_ph',
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'prod-7',
    name: 'Leather Bag',
    price: 900,
    condition: 'Excellent',
    location: 'Davao City',
    seller: 'classic_leather',
    image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'prod-8',
    name: 'Retro Game Console',
    price: 1800,
    condition: 'Fair',
    location: 'Mandaluyong',
    seller: 'nostalgia_arcade',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop',
  },
];

const FeaturedProducts: React.FC = () => {
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleFavorite = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  return (
    <section className="featured-products" id="products">
      <div className="products-container">
        {/* Section Header */}
        <div className="products-header">
          <div>
            <div className="products-badge">
              <Sparkles size={14} />
              <span>Handpicked Daily</span>
            </div>
            <h2 className="products-title">Featured Products</h2>
            <p className="products-subtitle">
              Discover verified secondhand & vintage treasures freshly listed by local sellers
            </p>
          </div>
        </div>

        {/* Product Grid */}
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
