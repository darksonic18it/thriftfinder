import React from 'react';

import type { ListingCategory } from '../types/database';

import AccordionGallery, { type AccordionGalleryItem } from './AccordionGallery';
import './FeaturedCategories.css';

const CATEGORY_ORDER: ListingCategory[] = [
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

const CATEGORY_META: Record<ListingCategory, { description: string; imageUrl: string }> = {
  Clothing: {
    description: 'Pre-loved styles for every wardrobe.',
    imageUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  Shoes: {
    description: 'Sneakers, boots & pre-owned pairs.',
    imageUrl: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  Accessories: {
    description: 'Small upgrades with big personality.',
    imageUrl: 'https://plus.unsplash.com/premium_photo-1709033404514-c3953af680b4?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  Electronics: {
    description: 'Retro tech and everyday gadgets.',
    imageUrl: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  Collectibles: {
    description: 'Games, memorabilia, and keepsakes.',
    imageUrl: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?q=80&w=1228&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  Bags: {
    description: 'Totes, bags, and carry essentials.',
    imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=738&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  Vintage: {
    description: 'Old-school charm and classic finds.',
    imageUrl: 'https://images.unsplash.com/photo-1488841714725-bb4c32d1ac94?q=80&w=1130&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  Furniture: {
    description: 'Secondhand pieces for better living.',
    imageUrl: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?q=80&w=1092&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  Books: {
    description: 'Pre-loved reads for every mood.',
    imageUrl: 'https://images.unsplash.com/photo-1680973543493-6c03e66402fe?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  Sports: {
    description: 'Gear up with used sports essentials.',
    imageUrl: 'https://images.unsplash.com/photo-1694173563800-a73d4a0f248e?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  Others: {
    description: 'Unexpected finds worth bringing home.',
    imageUrl: 'https://images.unsplash.com/photo-1586634102162-1efe45163b66?q=80&w=1073&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
};

const galleryItems: AccordionGalleryItem[] = CATEGORY_ORDER.map((category) => {
  const { description, imageUrl } = CATEGORY_META[category];

  return {
    image: imageUrl,
    alt: category,
    link: undefined,
    label: `${category}\n${description}`,
  };
});

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

        <div className="categories-accordion" aria-label="Category discovery">
          <AccordionGallery
            items={galleryItems}
            height={460}
            gap={10}
            radius={16}
            expandRatio={0.48}
            trigger="hover"
            showLabels
            grayscale={false}
          />
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;
