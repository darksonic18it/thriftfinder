import React from 'react';
import logoMark from '../assets/brand/logo-mark.svg';
import './BrandMark.css';

// Width / height of the logo artwork (viewBox 666 x 764).
const ASPECT = 666 / 764;

interface BrandMarkProps {
  /** Rendered height in px. Width follows the artwork's proportions. */
  size?: number;
  className?: string;
}

/**
 * The official ThriftFinder logo mark (the shopping-bag mascot).
 * Transparent background, so it works on light and dark surfaces.
 * Decorative: the "ThriftFinder" text next to it names the brand.
 */
const BrandMark: React.FC<BrandMarkProps> = ({ size = 40, className = '' }) => (
  <img
    className={`brand-mark${className ? ` ${className}` : ''}`}
    src={logoMark}
    alt=""
    aria-hidden="true"
    width={Math.round(size * ASPECT)}
    height={size}
    draggable={false}
  />
);

export default BrandMark;