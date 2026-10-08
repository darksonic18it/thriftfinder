import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FeaturedCategories from './components/FeaturedCategories';
import CirculationCTA from './components/CirculationCTA';
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
import SavedItems from './pages/SavedItems';
import MyListings from './pages/MyListings';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import AppNavbar from './components/AppNavbar';
import ReportListing from './pages/ReportListing';
import FloatingMessages from './components/messaging/FloatingMessages';

import { AuthGateProvider } from './context/AuthGateContext';
import SellAuthModal from './components/SellAuthModal';
// ...
<Router>
  <AuthGateProvider>
    <ScrollToTop />
    <AppShell />
    <SellAuthModal />
  </AuthGateProvider>
</Router>

import './App.css';

function LandingPage() {
  return (
    <>
      <Hero />
      <FeaturedCategories />
      <CirculationCTA />
      <FeaturedProducts />
      <CallToAction />
    </>
  );
}

function AppShell() {
  const location = useLocation();

  const isProfileRoute =
    location.pathname === '/profile' ||
    location.pathname.startsWith('/profile/');

  const isAppShell =
    location.pathname === '/dashboard' ||
    location.pathname === '/create-listing' ||
    location.pathname === '/saved-items' ||
    location.pathname === '/my-listings' ||
    location.pathname.startsWith('/edit-listing/') ||
    (location.pathname.startsWith('/listing/') &&
    ['/dashboard', '/saved-items', '/my-listings'].includes(
        (location.state as { from?: string } | null)?.from ?? ''
      ))

  return (
    <div className="app">
      {isAppShell ? <AppNavbar /> : isProfileRoute ? null : <Navbar />}

      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route path="/about" element={<About />} />

          {/* Public browse page */}
          <Route path="/browse" element={<Browse />} />

          {/* Authenticated dashboard browse page */}
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
          <Route path="/listing/:id/report" element={<ReportListing />} />

          {/* Create listing */}
          <Route
            path="/create-listing"
            element={
              <RequireAuth>
                <CreateListing />
              </RequireAuth>
            }
          />

          {/* Edit listing */}
          <Route
            path="/edit-listing/:id"
            element={
              <RequireAuth>
                <CreateListing />
              </RequireAuth>
            }
          />

          {/* Saved items */}
          <Route
            path="/saved-items"
            element={
              <RequireAuth>
                <SavedItems />
              </RequireAuth>
            }
          />

          {/* The signed-in seller's own listings */}
          <Route
            path="/my-listings"
            element={
              <RequireAuth>
                <MyListings />
              </RequireAuth>
            }
          />

          <Route path="/login" element={<Login />} />

          <Route path="/signup" element={<Signup />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />

          <Route path="/ui-test" element={<UITest />} />

          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />

          <Route
            path="/profile/:userId"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
        </Routes>
      </main>

       <FloatingMessages />

      {!isAppShell && !isProfileRoute ? <Footer /> : null}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthGateProvider>
        <ScrollToTop />
        <AppShell />
        <SellAuthModal />
      </AuthGateProvider>
      
    </Router>
  );
}

export default App;