import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
import Profile from './pages/Profile';
import ScrollToTop from './components/ScrollToTop';

import AppNavbar from './components/AppNavbar';

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

function AppShell() {
  const location = useLocation();

  const isAppShell =
    location.pathname === '/dashboard' ||
    location.pathname === '/profile' ||
    (location.pathname.startsWith('/listing/') &&
      (location.state as { from?: string } | null)?.from === '/dashboard');

  return (
    <div className="app">
      {isAppShell ? <AppNavbar /> : <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/browse" element={<Browse />} />
          <Route
            path="/dashboard"
            element={
              <div className="dashboard-browse-route">
                <Browse />
              </div>
            }
          />
          <Route path="/listing/:id" element={<ListingDetails />} />
          <Route path="/create-listing" element={<CreateListing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/ui-test" element={<UITest />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
      {!isAppShell ? <Footer /> : null}
    </div>
  );
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AppShell />
    </Router>
  );
}

export default App;
