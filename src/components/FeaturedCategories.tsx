import React, { useRef, useState, useEffect } from 'react';
import { Shirt, ShoppingBag, Watch, Zap, Trophy, PackageOpen, Sparkles, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import './FeaturedCategories.css';

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  itemCount: string;
  image: string;
  color: string;
}

const categories: Category[] = [
  {
    id: 'clothing',
    name: 'Clothing',
    icon: <Shirt size={32} />,
    description: 'Vintage fashion & streetwear',
    itemCount: '18k+ items',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=600&auto=format&fit=crop',
    color: '#6366f1',
  },
  {
    id: 'shoes',
    name: 'Shoes',
    icon: <ShoppingBag size={32} />,
    description: 'Sneakers, boots & more',
    itemCount: '7k+ items',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=600&auto=format&fit=crop',
    color: '#8b5cf6',
  },
  {
    id: 'accessories',
    name: 'Accessories',
    icon: <Watch size={32} />,
    description: 'Watches, jewelry & details',
    itemCount: '12k+ items',
    image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=600&auto=format&fit=crop',
    color: '#ec4899',
  },
  {
    id: 'electronics',
    name: 'Electronics',
    icon: <Zap size={32} />,
    description: 'Retro tech & gadgets',
    itemCount: '5k+ items',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=600&auto=format&fit=crop',
    color: '#f59e0b',
  },
  {
    id: 'collectibles',
    name: 'Collectibles',
    icon: <Trophy size={32} />,
    description: 'Rare finds & treasures',
    itemCount: '9k+ items',
    image: 'https://images.unsplash.com/photo-1580674285054-bed31e145f59?q=80&w=600&auto=format&fit=crop',
    color: '#10b981',
  },
  {
    id: 'bags',
    name: 'Bags',
    icon: <PackageOpen size={32} />,
    description: 'Handbags, backpacks & totes',
    itemCount: '6k+ items',
    image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=600&auto=format&fit=crop',
    color: '#ef4444',
  },
  {
    id: 'vintage',
    name: 'Vintage',
    icon: <Sparkles size={32} />,
    description: 'Curated retro & antiques',
    itemCount: '15k+ items',
    image: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=600&auto=format&fit=crop',
    color: '#06b6d4',
  },
  {
    id: 'others',
    name: 'Others',
    icon: <MoreHorizontal size={32} />,
    description: 'Everything else unique',
    itemCount: '10k+ items',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=600&auto=format&fit=crop',
    color: '#64748b',
  },
];

const FeaturedCategories: React.FC = () => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = () => {
    if (!carouselRef.current) return;
    // Always show navigation arrows since it's an infinite loop
    setCanScrollLeft(true);
    setCanScrollRight(true);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const scrollAmount = 320; // Card width + gap
    const midPoint = carouselRef.current.scrollWidth / 2;

    let newScrollLeft = direction === 'left'
      ? carouselRef.current.scrollLeft - scrollAmount
      : carouselRef.current.scrollLeft + scrollAmount;

    // Handle wrapping for manual navigation
    if (newScrollLeft < 0) {
      carouselRef.current.scrollLeft = midPoint;
      newScrollLeft = midPoint - scrollAmount;
    } else if (newScrollLeft >= midPoint + carouselRef.current.clientWidth) {
      carouselRef.current.scrollLeft = 0;
      newScrollLeft = scrollAmount;
    }

    carouselRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    updateScrollButtons();

    const handleScroll = () => {
      updateScrollButtons();
    };

    carousel.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', updateScrollButtons);

    // Auto-scroll functionality with infinite loop
    let animationFrameId: number;
    let lastTimestamp = 0;
    const scrollSpeed = 0.3; // pixels per frame

    const autoScroll = (timestamp: number) => {
      if (!isHovered && carousel) {
        if (lastTimestamp === 0) {
          lastTimestamp = timestamp;
        }

        const delta = timestamp - lastTimestamp;

        // Calculate the midpoint (where original content ends)
        const midPoint = carousel.scrollWidth / 2;

        // If we've scrolled past the midpoint, reset to beginning
        if (carousel.scrollLeft >= midPoint) {
          carousel.scrollLeft = 0;
        } else {
          carousel.scrollLeft += scrollSpeed * (delta / 16);
        }

        lastTimestamp = timestamp;
      } else {
        lastTimestamp = 0;
      }

      animationFrameId = requestAnimationFrame(autoScroll);
    };

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
      animationFrameId = requestAnimationFrame(autoScroll);
    }

    return () => {
      carousel.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateScrollButtons);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isHovered]);

  return (
    <section className="featured-categories" id="browse">
      <div className="categories-container">
        <div className="section-header">
          <div className="header-content">
            <h2 className="section-title">Browse by Category</h2>
            <p className="section-description">
              Explore curated collections of vintage treasures across all your favorite categories
            </p>
          </div>
        </div>

        <div
          className="carousel-wrapper"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {canScrollLeft && (
            <button
              className="carousel-nav-btn nav-left"
              onClick={() => scroll('left')}
              aria-label="Scroll left"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          <div className="carousel-container" ref={carouselRef}>
            <div className="carousel-track">
              {/* Render categories twice for infinite loop effect */}
              {[...categories, ...categories].map((category, index) => (
                <div
                  key={`${category.id}-${index}`}
                  className="category-card"
                >
                  <div className="card-image-wrapper">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="card-image"
                      loading="lazy"
                    />
                    <div className="card-overlay"></div>
                  </div>
                  <div className="card-content">
                    <div
                      className="category-icon-badge"
                      style={{ backgroundColor: `${category.color}15`, color: category.color }}
                    >
                      {category.icon}
                    </div>
                    <h3 className="category-name">{category.name}</h3>
                    <p className="category-description">{category.description}</p>
                    <span className="category-count">{category.itemCount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {canScrollRight && (
            <button
              className="carousel-nav-btn nav-right"
              onClick={() => scroll('right')}
              aria-label="Scroll right"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;
