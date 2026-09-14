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
    imageUrl: 'https://source.unsplash.com/featured/1200x900?clothing,thrift&sig=201',
  },
  Shoes: {
    description: 'Sneakers, boots & pre-owned pairs.',
    imageUrl: 'https://source.unsplash.com/featured/1200x900?shoes,sneakers&sig=202',
  },
  Accessories: {
    description: 'Small upgrades with big personality.',
    imageUrl: 'https://source.unsplash.com/featured/1200x900?accessories,jewelry&sig=203',
  },
  Electronics: {
    description: 'Retro tech and everyday gadgets.',
    imageUrl: 'https://source.unsplash.com/featured/1200x900?electronics,technology&sig=204',
  },
  Collectibles: {
    description: 'Games, memorabilia, and keepsakes.',
    imageUrl: 'https://source.unsplash.com/featured/1200x900?collectibles,vintage&sig=205',
  },
  Bags: {
    description: 'Totes, bags, and carry essentials.',
    imageUrl: 'https://source.unsplash.com/featured/1200x900?bag,handbag&sig=206',
  },
  Vintage: {
    description: 'Old-school charm and classic finds.',
    imageUrl: 'https://source.unsplash.com/featured/1200x900?vintage,antique&sig=207',
  },
  Furniture: {
    description: 'Secondhand pieces for better living.',
    imageUrl: 'https://source.unsplash.com/featured/1200x900?furniture,interior&sig=208',
  },
  Books: {
    description: 'Pre-loved reads for every mood.',
    imageUrl: 'https://source.unsplash.com/featured/1200x900?books,bookstore&sig=209',
  },
  Sports: {
    description: 'Gear up with used sports essentials.',
    imageUrl: 'https://source.unsplash.com/featured/1200x900?sports,equipment&sig=210',
  },
  Others: {
    description: 'Unexpected finds worth bringing home.',
    imageUrl: 'https://source.unsplash.com/featured/1200x900?thrift,market&sig=211',
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
