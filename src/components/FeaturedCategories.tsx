import React from 'react';
import {
  Shirt,
  ShoppingBag,
  Watch,
  Zap,
  Trophy,
  PackageOpen,
  Sparkles,
  MoreHorizontal,
} from 'lucide-react';
import './FeaturedCategories.css';

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  accent: string;
}

const categories: Category[] = [
  {
    id: 'clothing',
    name: 'Clothing',
    icon: <Shirt size={28} />,
    description: 'Everyday styles & thrift finds',
    accent: '#6366f1',
  },
  {
    id: 'shoes',
    name: 'Shoes',
    icon: <ShoppingBag size={28} />,
    description: 'Sneakers, boots & more',
    accent: '#8b5cf6',
  },
  {
    id: 'accessories',
    name: 'Accessories',
    icon: <Watch size={28} />,
    description: 'Small upgrades, big personality',
    accent: '#ec4899',
  },
  {
    id: 'electronics',
    name: 'Electronics',
    icon: <Zap size={28} />,
    description: 'Retro tech & daily gadgets',
    accent: '#f59e0b',
  },
  {
    id: 'collectibles',
    name: 'Collectibles',
    icon: <Trophy size={28} />,
    description: 'Games, posters, and keepsakes',
    accent: '#10b981',
  },
  {
    id: 'bags',
    name: 'Bags',
    icon: <PackageOpen size={28} />,
    description: 'Carry it your way',
    accent: '#ef4444',
  },
  {
    id: 'vintage',
    name: 'Vintage',
    icon: <Sparkles size={28} />,
    description: 'Old-school charm & classics',
    accent: '#06b6d4',
  },
  {
    id: 'others',
    name: 'Others',
    icon: <MoreHorizontal size={28} />,
    description: 'Unlisted finds we love',
    accent: '#64748b',
  },
];

const FeaturedCategories: React.FC = () => {
  return (
    <section className="featured-categories" id="browse">
      <div className="categories-container">
        <div className="section-header">
          <div className="header-content">
            <h2 className="section-title">Browse by Category</h2>
            <p className="section-description">
              Find something useful, unique, or just worth bringing home.
            </p>
          </div>
        </div>

        <div className="categories-grid" aria-label="Category discovery">
          {categories.map((category) => (
            <div key={category.id} className="category-card">
              <div
                className="category-icon-badge"
                style={{ borderColor: `${category.accent}33`, backgroundColor: `${category.accent}12` }}
              >
                <span style={{ color: category.accent, display: 'flex' }}>
                  {category.icon}
                </span>
              </div>

              <h3 className="category-name">{category.name}</h3>
              <p className="category-description">{category.description}</p>

              <span className="category-cta">Explore</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;
