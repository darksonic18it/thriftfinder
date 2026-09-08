import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import ProductCard, { Product } from './ProductCard';
import './FeaturedProducts.css';

const products: Product[] = [
  {
    id: 'prod-1',
    name: 'Oversized Denim Jacket',
    price: 1250,
    condition: 'Excellent',
    location: 'Cagayan de Oro',
    seller: 'vintage_closet',
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=600&auto=format&fit=crop',
    tag: 'Local find',
  },
  {
    id: 'prod-2',
    name: 'Nike Sneakers',
    price: 1200,
    condition: 'Like New',
    location: 'Lapasan',
    seller: 'kicks_manila',
    image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'prod-3',
    name: 'Y2K Shoulder Bag',
    price: 650,
    condition: 'Good',
    location: 'Carmen',
    seller: 'retrochic.ph',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=600&auto=format&fit=crop',
    tag: 'Popular',
  },
  {
    id: 'prod-4',
    name: 'Graphic T-Shirt',
    price: 450,
    condition: 'Good',
    location: 'Kauswagan',
    seller: 'thrifted_finds',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'prod-5',
    name: 'Vintage Camera',
    price: 2500,
    condition: 'Like New',
    location: 'Macasandig',
    seller: 'analog_vault',
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop',
    tag: 'Demo deal',
  },
  {
    id: 'prod-6',
    name: 'Cargo Pants',
    price: 700,
    condition: 'Good',
    location: 'Cagayan de Oro',
    seller: 'street_wear_ph',
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'prod-7',
    name: 'Leather Bag',
    price: 900,
    condition: 'Excellent',
    location: 'Lapasan',
    seller: 'classic_leather',
    image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'prod-8',
    name: 'Retro Game Console',
    price: 1800,
    condition: 'Fair',
    location: 'Carmen',
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
        <div className="products-header">
          <div>
            <div className="products-badge" aria-hidden="true">
              <Sparkles size={14} />
              <span>Local discovery</span>
            </div>
            <h2 className="products-title">Popular Near You</h2>
            <p className="products-subtitle">
              See what people around their area are selling.
              <span className="demo-label"> Demo listings for this capstone MVP.</span>
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
