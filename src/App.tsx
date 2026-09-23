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
import RequireAuth from './components/RequireAuth';

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

  const isProfileRoute = location.pathname === '/profile'

  const isAppShell =
    location.pathname === '/dashboard' ||
    location.pathname === '/create-listing' ||
    (location.pathname.startsWith('/listing/') &&
      (location.state as { from?: string } | null)?.from === '/dashboard')

  return (
    <div className="app">
      {isAppShell ? <AppNavbar /> : isProfileRoute ? null : <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/browse" element={<Browse />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <div className="dashboard-browse-route">
                  <Browse />
                </div>
              </RequireAuth>
            }
          />
          <Route path="/listing/:id" element={<ListingDetails />} />
          <Route
            path="/create-listing"
            element={
              <RequireAuth>
                <CreateListing />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/ui-test" element={<UITest />} />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
        </Routes>
      </main>
      {!isAppShell && !isProfileRoute ? <Footer /> : null}
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