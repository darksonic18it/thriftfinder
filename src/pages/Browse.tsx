import React, { useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import ProductCard, { Product } from '../components/ProductCard';
import './Browse.css';

// Mock product data for the Browse page
const mockProducts: Product[] = [
  {
    id: 'browse-1',
    name: 'Vintage Denim Jacket',
    price: 850,
    condition: 'Excellent',
    location: 'Quezon City',
    seller: 'vintage_closet',
    image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=600&auto=format&fit=crop',
    tag: 'Vintage 90s',
  },
  {
    id: 'browse-2',
    name: 'Nike Sneakers',
    price: 1200,
    condition: 'Like New',
    location: 'Makati City',
    seller: 'kicks_manila',
    image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'browse-3',
    name: 'Y2K Shoulder Bag',
    price: 650,
    condition: 'Good',
    location: 'Cebu City',
    seller: 'retrochic.ph',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=600&auto=format&fit=crop',
    tag: 'Trending',
  },
  {
    id: 'browse-4',
    name: 'Graphic T-Shirt',
    price: 450,
    condition: 'Good',
    location: 'Pasig City',
    seller: 'thrifted_finds',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'browse-5',
    name: 'Vintage Camera',
    price: 2500,
    condition: 'Like New',
    location: 'Manila',
    seller: 'analog_vault',
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop',
    tag: 'Rare',
  },
  {
    id: 'browse-6',
    name: 'Cargo Pants',
    price: 700,
    condition: 'Good',
    location: 'Taguig City',
    seller: 'street_wear_ph',
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'browse-7',
    name: 'Leather Bag',
    price: 900,
    condition: 'Excellent',
    location: 'Davao City',
    seller: 'classic_leather',
    image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'browse-8',
    name: 'Retro Game Console',
    price: 1800,
    condition: 'Fair',
    location: 'Mandaluyong',
    seller: 'nostalgia_arcade',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'browse-9',
    name: 'Vintage Sunglasses',
    price: 580,
    condition: 'Excellent',
    location: 'Quezon City',
    seller: 'retro_accessories',
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'browse-10',
    name: 'Varsity Jacket',
    price: 950,
    condition: 'Good',
    location: 'Manila',
    seller: 'campus_vibes',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'browse-11',
    name: 'Leather Boots',
    price: 1350,
    condition: 'Like New',
    location: 'Makati City',
    seller: 'footwear_ph',
    image: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'browse-12',
    name: 'Vintage Watch',
    price: 2200,
    condition: 'Excellent',
    location: 'Pasig City',
    seller: 'timeless_watches',
    image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=600&auto=format&fit=crop',
    tag: 'Rare',
  },
];

const categories = [
  'All',
  'Clothing',
  'Shoes',
  'Accessories',
  'Electronics',
  'Collectibles',
  'Bags',
  'Vintage',
  'Others',
];

const Browse: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleFavorite = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

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
        </div>
      </div>

      {/* Product Grid */}
      <div className="browse-products">
        <div className="browse-products-container">
          <div className="products-grid">
            {mockProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorite={!!favorites[product.id]}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Browse;
