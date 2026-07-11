/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import { Home } from './pages/Home';
import { Category } from './pages/Category';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Wishlist } from './pages/Wishlist';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Account } from './pages/Account';
import { Admin } from './pages/Admin';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { NotFound } from './pages/NotFound';
import { SizeCategory } from './pages/SizeCategory';
import { SizeListing } from './pages/SizeListing';
import { EventCategory } from './pages/EventCategory';
import { EventListing } from './pages/EventListing';
import { BrandsPage } from './pages/BrandsPage';
import { Checkout } from './pages/Checkout';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SettingsProvider } from './context/SettingsContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import VersionCheck from './components/VersionCheck';

import { ContractPDF } from './pages/ContractPDF';

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <BrowserRouter>
              <VersionCheck />
              <ScrollToTop />
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="categoria" element={<Category />} />
                <Route path="categoria/:categorySlug" element={<Category />} />
                <Route path="produto/:handle" element={<ProductDetail />} />
                <Route path="carrinho" element={<Cart />} />
                <Route path="favoritos" element={<Wishlist />} />
                <Route path="login" element={<Login />} />
                <Route path="registrar" element={<Register />} />
                <Route path="recuperar-senha" element={<ForgotPassword />} />
                <Route path="resetar-senha" element={<ResetPassword />} />
                <Route path="politica-de-privacidade" element={<PrivacyPolicy />} />
                <Route path="termos-de-uso" element={<TermsOfService />} />
                <Route path="tamanho" element={<SizeCategory />} />
                <Route path="tamanho/:sizeSlug" element={<SizeListing />} />
                <Route path="evento" element={<EventCategory />} />
                <Route path="evento/:eventSlug" element={<EventListing />} />
                <Route path="marcas" element={<BrandsPage />} />
                
                {/* Protected Customer Routes */}
                <Route element={<ProtectedRoute allowedRoles={['customer', 'admin']} />}>
                  <Route path="minha-conta" element={<Account />} />
                  <Route path="checkout" element={<Checkout />} />
                  <Route path="contrato/:id" element={<ContractPDF />} />
                </Route>

                {/* Protected Admin Routes */}
                <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                  <Route path="admin" element={<Admin />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            <PWAInstallBanner />
        </BrowserRouter>
      </WishlistProvider>
      </CartProvider>
    </AuthProvider>
    </SettingsProvider>
  );
}
