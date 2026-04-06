import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { RTL } from './RTL';
import MainLayout from './components/Layout/MainLayout';
import { NotificationProvider } from './contexts/NotificationContext';
import { AppThemeProvider, useAppTheme } from './contexts/ThemeContext';

const Dashboard      = lazy(() => import('./pages/Dashboard'));
const Login          = lazy(() => import('./pages/Login'));
const Settings       = lazy(() => import('./pages/Settings'));
const Products       = lazy(() => import('./pages/Products'));
const Categories     = lazy(() => import('./pages/Categories'));
const Sales          = lazy(() => import('./pages/Sales'));
const SalesList      = lazy(() => import('./pages/SalesList'));
const Inventory      = lazy(() => import('./pages/Inventory'));
const Reports        = lazy(() => import('./pages/Reports'));
const ComponentsDemo = lazy(() => import('./pages/ComponentsDemo'));

function PageLoader() {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 300 }}>
            <CircularProgress size={36} />
        </Box>
    );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const token = localStorage.getItem('token');
    if (!token) return <Navigate to="/login" replace />;
    return <>{children}</>;
}

function AppContent() {
    const { mode, toggleMode } = useAppTheme();
    const isDarkMode = mode === 'dark';

    const wrap = (Component: React.ComponentType) => (
        <ProtectedRoute>
            <MainLayout isDarkMode={isDarkMode} onThemeToggle={toggleMode}>
                <Suspense fallback={<PageLoader />}>
                    <Component />
                </Suspense>
            </MainLayout>
        </ProtectedRoute>
    );

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
                <Route path="/"               element={wrap(Dashboard)} />
                <Route path="/products"       element={wrap(Products)} />
                <Route path="/categories"     element={wrap(Categories)} />
                <Route path="/sales"          element={wrap(Sales)} />
                <Route path="/sales-list"     element={wrap(SalesList)} />
                <Route path="/inventory"      element={wrap(Inventory)} />
                <Route path="/reports"        element={wrap(Reports)} />
                <Route path="/settings"       element={wrap(Settings)} />
                <Route path="/components-demo" element={wrap(ComponentsDemo)} />
                <Route path="*"              element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default function App() {
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
