import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { RTL } from './RTL';
import MainLayout from './components/Layout/MainLayout';
import { NotificationProvider } from './contexts/NotificationContext';
import { AppThemeProvider, useAppTheme } from './contexts/ThemeContext';

const loadDashboard      = () => import('./pages/Dashboard');
const loadLogin          = () => import('./pages/Login');
const loadSettings       = () => import('./pages/Settings');
const loadProducts       = () => import('./pages/Products');
const loadCategories     = () => import('./pages/Categories');
const loadSales          = () => import('./pages/Sales');
const loadSalesList      = () => import('./pages/SalesList');
const loadInventory      = () => import('./pages/Inventory');
const loadReports        = () => import('./pages/Reports');
const loadComponentsDemo = () => import('./pages/ComponentsDemo');

const Dashboard      = lazy(loadDashboard);
const Login          = lazy(loadLogin);
const Settings       = lazy(loadSettings);
const Products       = lazy(loadProducts);
const Categories     = lazy(loadCategories);
const Sales          = lazy(loadSales);
const SalesList      = lazy(loadSalesList);
const Inventory      = lazy(loadInventory);
const Reports        = lazy(loadReports);
const ComponentsDemo = lazy(loadComponentsDemo);

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

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback
            || ((cb: () => void) => setTimeout(cb, 1500));
        idle(() => {
            loadDashboard(); loadProducts(); loadSales(); loadInventory();
            loadCategories(); loadSalesList(); loadReports(); loadSettings();
        });
    }, []);

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
