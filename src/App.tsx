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
import CreateListing from './pages/CreateListing';
import UITest from './pages/UITest';
import Login from './pages/Login';
import Signup from './pages/Signup';
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
            <Route path="/create-listing" element={<CreateListing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/ui-test" element={<UITest />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
