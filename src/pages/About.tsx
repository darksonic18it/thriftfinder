import React from 'react';
import { Target, Users, Heart, ShoppingBag, Store, Search } from 'lucide-react';
import './About.css';

const About: React.FC = () => {
  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="about-hero-container">
          <h1 className="about-hero-title">About ThriftFinder</h1>
          <p className="about-hero-subtitle">
            Making secondhand shopping easier, more accessible, and more sustainable for everyone.
          </p>
        </div>
      </section>

      {/* Main About Content */}
      <section className="about-content">
        <div className="about-container">
          {/* What is ThriftFinder */}
          <div className="about-section">
            <h2 className="section-title">What is ThriftFinder?</h2>
            <p className="section-text">
              ThriftFinder is a modern marketplace platform that connects buyers and sellers of pre-loved,
              secondhand, and vintage items. We believe great finds shouldn't stay hidden in closets or
              hard-to-reach thrift stores. Our platform makes it simple to discover unique treasures and
              give your unused items a second chance to shine.
            </p>
          </div>

          {/* The Problem We Solve */}
          <div className="about-section">
            <h2 className="section-title">The Problem We Solve</h2>
            <div className="problem-grid">
              <div className="problem-card">
                <div className="problem-icon">
                  <Search size={28} color="#6366f1" />
                </div>
                <h3>Hard to Find Quality Thrift Items</h3>
                <p>
                  Searching through physical thrift stores can be time-consuming and unpredictable.
                  You never know what you'll find, and great items disappear quickly.
                </p>
              </div>
              <div className="problem-card">
                <div className="problem-icon">
                  <ShoppingBag size={28} color="#8b5cf6" />
                </div>
                <h3>Buyers Need Better Discovery</h3>
                <p>
                  Thrift enthusiasts want an easier way to browse what's available, filter by
                  category, and connect with sellers directly.
                </p>
              </div>
              <div className="problem-card">
                <div className="problem-icon">
                  <Store size={28} color="#ec4899" />
                </div>
                <h3>Sellers Lack a Simple Platform</h3>
                <p>
                  People with quality pre-loved items often don't have a convenient way to list
                  and sell them to the right audience.
                </p>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="about-section how-it-works-section">
            <h2 className="section-title">How ThriftFinder Works</h2>
            <div className="steps-container">
              <div className="step-card">
                <div className="step-number">1</div>
                <h3 className="step-title">Discover</h3>
                <p className="step-description">
                  Browse through thousands of verified secondhand items across categories like
                  clothing, shoes, accessories, electronics, and collectibles.
                </p>
              </div>
              <div className="step-card">
                <div className="step-number">2</div>
                <h3 className="step-title">Connect</h3>
                <p className="step-description">
                  Find something you love? View detailed product information, seller profiles,
                  and location to make an informed decision.
                </p>
              </div>
              <div className="step-card">
                <div className="step-number">3</div>
                <h3 className="step-title">Sell</h3>
                <p className="step-description">
                  Have items to sell? List your pre-loved treasures with photos, descriptions,
                  and pricing so others can discover them.
                </p>
              </div>
            </div>
          </div>

          {/* Who Is It For */}
          <div className="about-section">
            <h2 className="section-title">Who Is ThriftFinder For?</h2>
            <div className="audience-grid">
              <div className="audience-card">
                <div className="audience-icon">
                  <ShoppingBag size={32} color="#6366f1" />
                </div>
                <h3>Buyers</h3>
                <p>
                  Thrift enthusiasts, vintage lovers, and bargain hunters looking for unique,
                  affordable, and sustainable finds.
                </p>
              </div>
              <div className="audience-card">
                <div className="audience-icon">
                  <Store size={32} color="#8b5cf6" />
                </div>
                <h3>Sellers</h3>
                <p>
                  Anyone with quality pre-loved items they no longer use—from clothes to
                  electronics—looking for an easy way to sell.
                </p>
              </div>
              <div className="audience-card">
                <div className="audience-icon">
                  <Heart size={32} color="#ec4899" />
                </div>
                <h3>Thrift Enthusiasts</h3>
                <p>
                  People passionate about sustainable living, reducing waste, and giving items
                  a second life in the circular economy.
                </p>
              </div>
            </div>
          </div>

          {/* Our Vision */}
          <div className="about-section vision-section">
            <div className="vision-content">
              <div className="vision-icon">
                <Target size={48} color="#6366f1" />
              </div>
              <h2 className="section-title">Our Vision</h2>
              <p className="section-text">
                ThriftFinder aims to make secondhand shopping the first choice, not the last resort.
                We envision a future where reuse is celebrated, where every pre-loved item finds a new
                home, and where buying secondhand is as easy and enjoyable as buying new. By connecting
                conscious buyers and sellers, we're building a community that values sustainability,
                affordability, and the joy of discovering hidden gems.
              </p>
            </div>
          </div>

          {/* Meet the Team */}
          <div className="about-section team-section">
            <h2 className="section-title">Meet the Team</h2>
            <p className="section-text center">
              ThriftFinder is a capstone project developed by a dedicated team of students passionate
              about building solutions that make a difference. This platform represents our commitment
              to sustainable technology, user-centered design, and community-driven innovation.
            </p>
            <div className="team-grid">
              <div className="team-card">
                <div className="team-avatar">
                  <Users size={32} color="#6366f1" />
                </div>
                <h3>Development Team</h3>
                <p className="team-role">Capstone Project</p>
                <p className="team-description">
                  A collaborative team of developers building ThriftFinder as part of our
                  final capstone project.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
