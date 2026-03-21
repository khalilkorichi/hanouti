import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RTL } from './RTL';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Sales from './pages/Sales';
import SalesList from './pages/SalesList';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import ComponentsDemo from './pages/ComponentsDemo';
import { NotificationProvider } from './contexts/NotificationContext';



// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

import { AppThemeProvider, useAppTheme } from './contexts/ThemeContext';

function AppContent() {
  const { mode, toggleMode } = useAppTheme();
  const isDarkMode = mode === 'dark';

  return (
    <BrowserRouter>
      <Routes>
        {/* Login Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout isDarkMode={isDarkMode} onThemeToggle={toggleMode}>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <MainLayout isDarkMode={isDarkMode} onThemeToggle={toggleMode}>
                <Products />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <ProtectedRoute>
              <MainLayout isDarkMode={isDarkMode} onThemeToggle={toggleMode}>
                <Categories />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales"
          element={
            <ProtectedRoute>
              <MainLayout isDarkMode={isDarkMode} onThemeToggle={toggleMode}>
                <Sales />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales-list"
          element={
            <ProtectedRoute>
              <MainLayout isDarkMode={isDarkMode} onThemeToggle={toggleMode}>
                <SalesList />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <MainLayout isDarkMode={isDarkMode} onThemeToggle={toggleMode}>
                <Inventory />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <MainLayout isDarkMode={isDarkMode} onThemeToggle={toggleMode}>
                <Reports />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <MainLayout isDarkMode={isDarkMode} onThemeToggle={toggleMode}>
                <Settings />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/components-demo"
          element={
            <ProtectedRoute>
              <MainLayout isDarkMode={isDarkMode} onThemeToggle={toggleMode}>
                <ComponentsDemo />
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <RTL>
      <AppThemeProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AppThemeProvider>
    </RTL>
  );
}

export default App;
