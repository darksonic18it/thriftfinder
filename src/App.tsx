import { Suspense, lazy } from 'react';
import { Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import AdminRoute from './components/AdminRoute';
import AppNavbar from './components/AppNavbar';
import CallToAction from './components/CallToAction';
import CirculationCTA from './components/CirculationCTA';
import FeaturedCategories from './components/FeaturedCategories';
import FeaturedProducts from './components/FeaturedProducts';
import Footer from './components/Footer';
import Hero from './components/Hero';
import FloatingMessages from './components/messaging/FloatingMessages';
import Navbar from './components/Navbar';
import RequireAuth from './components/RequireAuth';
import ScrollToTop from './components/ScrollToTop';

import SellAuthModal from './components/SellAuthModal';
import { AuthGateProvider } from './context/AuthGateContext';

import './App.css';
const About = lazy(() => import('./pages/About'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Browse = lazy(() => import('./pages/Browse'));
const CreateListing = lazy(() => import('./pages/CreateListing'));
const ListingDetails = lazy(() => import('./pages/ListingDetails'));
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const MyListings = lazy(() => import('./pages/MyListings'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Profile = lazy(() => import('./pages/Profile'));
const ReportListing = lazy(() => import('./pages/ReportListing'));
const SavedItems = lazy(() => import('./pages/SavedItems'));
const Signup = lazy(() => import('./pages/Signup'));
const Terms = lazy(() => import('./pages/Terms'));
const UITest = lazy(() => import('./pages/UITest'));

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

  const isAdminRoute = location.pathname === '/admin-dashboard';

  const isAppShell =
    location.pathname === '/dashboard' ||
    location.pathname === '/create-listing' ||
    location.pathname === '/saved-items' ||
    location.pathname === '/my-listings' ||
    location.pathname.startsWith('/edit-listing/') ||
    (location.pathname.startsWith('/listing/') &&
      ['/dashboard', '/saved-items', '/my-listings', '/profile'].includes(
        (location.state as { from?: string } | null)?.from ?? ''
      ));

  return (
    <div className="app">
      {isAdminRoute ? null : isAppShell ? <AppNavbar /> : isProfileRoute ? null : <Navbar />}

      <main>
        <Suspense fallback={null}>
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
            <Route path="/reset-password" element={<ResetPassword />} />

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

            {/* Admin dashboard: must be signed in AND have an active admin account */}
            <Route
              path="/admin-dashboard"
              element={
                <RequireAuth>
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                </RequireAuth>
              }
            />
          </Routes>
        </Suspense>
      </main>

      {!isAdminRoute ? <FloatingMessages /> : null}

      {!isAppShell && !isProfileRoute && !isAdminRoute ? <Footer /> : null}
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