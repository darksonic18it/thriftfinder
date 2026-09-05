import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FeaturedCategories from './components/FeaturedCategories';
import FeaturedProducts from './components/FeaturedProducts';
import CallToAction from './components/CallToAction';
import Footer from './components/Footer';
import About from './pages/About';
import Browse from './pages/Browse';
import ListingDetails from './pages/ListingDetails';
import UITest from './pages/UITest';
import ScrollToTop from './components/ScrollToTop';
import './App.css';

function LandingPage() {
  return (
    <>
      <Hero />
      <FeaturedCategories />
      <FeaturedProducts />
      <CallToAction />
    </>
  );
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="app">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/listing/:id" element={<ListingDetails />} />
            <Route path="/ui-test" element={<UITest />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
