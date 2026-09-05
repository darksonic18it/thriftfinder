import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, MapPin, Star, Package } from 'lucide-react';
import { Product } from '../components/ProductCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import './ListingDetails.css';

// Mock product data - imported from Browse page
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

// Mock descriptions for products
const mockDescriptions: Record<string, string> = {
  'browse-1': 'Classic vintage denim jacket in excellent condition. Minimal signs of wear and no major stains or damage. Great for everyday casual outfits. Features authentic 90s styling with classic button closure and chest pockets.',
  'browse-2': 'Premium Nike sneakers in like-new condition. Only worn a handful of times. No visible scuffs or sole wear. Original box not included. Perfect for collectors or anyone looking for quality footwear.',
  'browse-3': 'Trendy Y2K-style shoulder bag with unique charm. Good condition with minor wear on the handles. All zippers and closures work perfectly. Spacious interior fits daily essentials comfortably.',
  'browse-4': 'Cool graphic t-shirt with vintage-inspired print. Good condition with slight fading from wash, which adds to the authentic vintage look. Comfortable cotton blend fabric. Perfect for casual wear.',
  'browse-5': 'Rare vintage film camera in excellent working condition. Tested and fully functional. Comes with original leather case. A beautiful piece for analog photography enthusiasts or collectors. Minor cosmetic wear adds character.',
  'browse-6': 'Comfortable cargo pants with multiple pockets. Good condition with normal wear. Durable fabric perfect for everyday use or streetwear styling. Classic fit with adjustable waist.',
  'browse-7': 'High-quality leather bag with timeless design. Excellent condition with rich patina. Spacious interior with multiple compartments. Genuine leather that ages beautifully. Perfect for work or everyday use.',
  'browse-8': 'Classic retro gaming console with controllers. Fair condition with some cosmetic wear but fully functional. Great for nostalgic gaming sessions. Comes with essential cables.',
  'browse-9': 'Stylish vintage sunglasses with unique frame design. Excellent condition with minimal scratches. Lenses provide good UV protection. Perfect for adding retro flair to any outfit.',
  'browse-10': 'Classic varsity jacket with embroidered patches. Good condition with authentic vintage appeal. Warm and comfortable for cooler weather. Snap button closure and ribbed cuffs.',
  'browse-11': 'Premium leather boots in like-new condition. Only worn a few times. Quality construction with durable soles. Perfect for both casual and semi-formal occasions. Classic design that never goes out of style.',
  'browse-12': 'Beautiful vintage timepiece in excellent working condition. Keeps accurate time. Minimal signs of wear on the band. A rare find for watch enthusiasts. Classic design with timeless appeal.',
};

// Mock proximity data based on location
const getProximity = (location: string): string => {
  const proximityMap: Record<string, string> = {
    'Quezon City': '1.2 km away',
    'Makati City': '3.1 km away',
    'Cebu City': '5.8 km away',
    'Pasig City': '2.4 km away',
    'Manila': '4.0 km away',
    'Taguig City': '2.8 km away',
    'Davao City': '8.2 km away',
    'Mandaluyong': '3.5 km away',
  };
  return proximityMap[location] || '3.0 km away';
};

// Mock seller data
const getSellerInfo = (username: string) => {
  const sellerMap: Record<string, { rating: number; listings: number; initials: string }> = {
    vintage_closet: { rating: 4.8, listings: 12, initials: 'VC' },
    kicks_manila: { rating: 4.9, listings: 24, initials: 'KM' },
    'retrochic.ph': { rating: 4.7, listings: 18, initials: 'RC' },
    thrifted_finds: { rating: 4.6, listings: 31, initials: 'TF' },
    analog_vault: { rating: 5.0, listings: 8, initials: 'AV' },
    street_wear_ph: { rating: 4.7, listings: 15, initials: 'SW' },
    classic_leather: { rating: 4.8, listings: 10, initials: 'CL' },
    nostalgia_arcade: { rating: 4.5, listings: 22, initials: 'NA' },
    retro_accessories: { rating: 4.9, listings: 14, initials: 'RA' },
    campus_vibes: { rating: 4.6, listings: 19, initials: 'CV' },
    footwear_ph: { rating: 4.8, listings: 27, initials: 'FP' },
    timeless_watches: { rating: 5.0, listings: 6, initials: 'TW' },
  };
  return sellerMap[username] || { rating: 4.5, listings: 10, initials: 'SE' };
};

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

const ListingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(false);
  const [showReserveDialog, setShowReserveDialog] = useState(false);
  const [reservationConfirmed, setReservationConfirmed] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const product = mockProducts.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="listing-not-found">
        <div className="not-found-content">
          <Package size={64} className="not-found-icon" />
          <h1>Listing not found</h1>
          <p>Sorry, we couldn't find the listing you're looking for.</p>
          <Button onClick={() => navigate('/browse')} className="back-to-browse-btn">
            Back to Browse
          </Button>
        </div>
      </div>
    );
  }

  const description = mockDescriptions[product.id] || 'No description available for this item.';
  const proximity = getProximity(product.location);
  const sellerInfo = getSellerInfo(product.seller);

  // Create mock thumbnail images (reusing the same image for demo)
  const thumbnails = [product.image, product.image, product.image];

  const handleReserve = () => {
    setShowReserveDialog(true);
  };

  const handleConfirmReservation = () => {
    setReservationConfirmed(true);
    setTimeout(() => {
      setShowReserveDialog(false);
      setReservationConfirmed(false);
    }, 2000);
  };

  return (
    <div className="listing-details-page">
      {/* Breadcrumb Navigation */}
      <div className="breadcrumb-container">
        <Link to="/browse" className="breadcrumb-link">
          <ArrowLeft size={18} />
          <span>Back to Browse</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="listing-content">
        {/* Left Column - Images */}
        <div className="listing-images">
          <div className="main-image-container">
            <img
              src={thumbnails[selectedImageIndex]}
              alt={product.name}
              className="main-image"
            />
            {product.tag && (
              <span className="listing-tag">{product.tag}</span>
            )}
          </div>

          {/* Thumbnail Gallery */}
          <div className="thumbnail-gallery">
            {thumbnails.map((img, index) => (
              <button
                key={index}
                className={`thumbnail ${selectedImageIndex === index ? 'active' : ''}`}
                onClick={() => setSelectedImageIndex(index)}
                aria-label={`View image ${index + 1}`}
              >
                <img src={img} alt={`${product.name} view ${index + 1}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="listing-info">
          {/* Category Badge */}
          <div className="listing-header">
            <span className={`condition-pill ${getConditionClass(product.condition)}`}>
              {product.condition}
            </span>
          </div>

          {/* Title */}
          <h1 className="listing-title">{product.name}</h1>

          {/* Price */}
          <div className="listing-price">₱{product.price.toLocaleString()}</div>

          {/* Location & Proximity */}
          <div className="listing-location">
            <MapPin size={18} className="location-icon" />
            <div className="location-text">
              <span className="location-name">{product.location}</span>
              <span className="location-proximity">{proximity}</span>
            </div>
          </div>

          <div className="divider"></div>

          {/* Seller Information */}
          <div className="seller-section">
            <h3 className="section-title">Sold by</h3>
            <div className="seller-card">
              <div className="seller-avatar">{sellerInfo.initials}</div>
              <div className="seller-details">
                <div className="seller-name">{product.seller}</div>
                <div className="seller-meta">
                  <span className="seller-rating">
                    <Star size={14} fill="#f59e0b" color="#f59e0b" />
                    {sellerInfo.rating}
                  </span>
                  <span className="seller-listings">{sellerInfo.listings} listings</span>
                </div>
                <div className="seller-location">{product.location}</div>
              </div>
            </div>
            <Button variant="outline" className="view-seller-btn" onClick={() => {}}>
              View Seller
            </Button>
          </div>

          <div className="divider"></div>

          {/* Description */}
          <div className="description-section">
            <h3 className="section-title">About this item</h3>
            <p className="description-text">{description}</p>
          </div>

          <div className="divider"></div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <Button
              variant="outline"
              className={`save-btn ${isSaved ? 'saved' : ''}`}
              onClick={() => setIsSaved(!isSaved)}
            >
              <Heart
                size={20}
                fill={isSaved ? '#ec4899' : 'none'}
                color={isSaved ? '#ec4899' : 'currentColor'}
              />
              {isSaved ? 'Saved' : 'Save Item'}
            </Button>
            <Button className="reserve-btn" onClick={handleReserve}>
              Reserve Item
            </Button>
          </div>
        </div>
      </div>

      {/* Reserve Dialog */}
      <Dialog open={showReserveDialog} onOpenChange={setShowReserveDialog}>
        <DialogContent>
          {!reservationConfirmed ? (
            <>
              <DialogHeader>
                <DialogTitle>Reserve this item?</DialogTitle>
                <DialogDescription>
                  You're about to reserve <strong>{product.name}</strong> for{' '}
                  <strong>₱{product.price.toLocaleString()}</strong>.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReserveDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmReservation}>
                  Confirm Reservation
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="reservation-success">
              <div className="success-icon">✓</div>
              <DialogHeader>
                <DialogTitle>Reservation request sent</DialogTitle>
                <DialogDescription>
                  The seller will be notified of your reservation request.
                </DialogDescription>
              </DialogHeader>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListingDetails;
