import { Component, lazy, Suspense, useEffect, useRef, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { RTL } from './RTL';
import MainLayout from './components/Layout/MainLayout';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { AppThemeProvider, useAppTheme } from './contexts/ThemeContext';
import { isElectron, getElectronUpdater, getElectronAPI } from './services/electronUpdater';

// In Electron the page is loaded via file:// — BrowserRouter then sees the
// pathname as the absolute file path (e.g. "/C:/Program%20Files/Hanouti/...")
// and no route matches → blank page. HashRouter sidesteps this by routing
// off the URL hash (#/login), which works under any protocol.
const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
const Router = isFileProtocol ? HashRouter : BrowserRouter;

interface ErrorBoundaryState { error: Error | null; }

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // Surfaces React render-time crashes that would otherwise produce a
        // blank screen. Logged to devtools console + main-process log.
        // eslint-disable-next-line no-console
        console.error('[ErrorBoundary] render error:', error, info);
    }

    render() {
        if (this.state.error) {
            return (
                <div dir="rtl" style={{
                    minHeight: '100vh', padding: 40, fontFamily: "'Cairo','Tajawal',sans-serif",
                    background: '#0F172A', color: '#fff', lineHeight: 1.6,
                }}>
                    <h1 style={{ color: '#F87171', fontSize: 28, marginBottom: 8 }}>تعذّر تحميل الواجهة</h1>
                    <p style={{ color: '#94A3B8', marginBottom: 24 }}>حدث خطأ غير متوقّع أثناء عرض الصفحة.</p>
                    <pre style={{
                        background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)',
                        padding: 16, borderRadius: 8, fontSize: 13, color: '#FCA5A5',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word', direction: 'ltr', textAlign: 'left',
                    }}>{String(this.state.error?.stack || this.state.error?.message || this.state.error)}</pre>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: 24, background: '#38BDF8', color: '#0F172A', border: 'none',
                            padding: '12px 24px', borderRadius: 6, fontSize: 14, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'inherit',
                        }}
                    >إعادة تحميل البرنامج</button>
                </div>
            );
        }
        return this.props.children;
    }
}

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

/**
 * Global one-shot listener for the post-install success snackbar.
 *
 * Mounted at App-root level so the event is delivered no matter which
 * page the user happens to land on after upgrading. Uses a session-level
 * dedupe key in addition to a ref so the snackbar fires AT MOST ONCE
 * per session even if React strict-mode re-runs the effect or the user
 * also opens the Updater Settings panel (which has its own listener
 * for live status updates but does NOT show this snackbar anymore).
 */
function UpgradeSuccessNotifier() {
    const { showNotification } = useNotification();
    const firedRef = useRef(false);
    useEffect(() => {
        if (!isElectron()) return;
        const updater = getElectronUpdater();
        const api = getElectronAPI();
        if (!updater || !api) return;
        const cleanup = updater.onStatus((s) => {
            if (s.state !== 'upgrade-success') return;
            if (firedRef.current) return;
            // Session-level dedupe in case the listener was mounted twice
            // (StrictMode dev double-effect, etc.).
            const SESSION_KEY = `hanouti.upgrade-notified.${s.to}`;
            try {
                if (window.sessionStorage.getItem(SESSION_KEY)) return;
                window.sessionStorage.setItem(SESSION_KEY, '1');
            } catch { /* private mode etc. — keep going */ }
            firedRef.current = true;
            showNotification(
                `تمّت ترقية البرنامج بنجاح من v${s.from} إلى v${s.to}.`,
                'success',
                {
                    title: 'مرحباً بك في الإصدار الجديد',
                    duration: 0,
                    action: {
                        label: 'ما الجديد؟',
                        onClick: () => api.openExternal(s.releaseUrl),
                    },
                },
            );
        });
        return cleanup;
    }, [showNotification]);
    return null;
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
        <Router>
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
        </Router>
    );
}

export default function App() {
    return (
        <ErrorBoundary>
            <RTL>
                <AppThemeProvider>
                    <NotificationProvider>
                        <UpgradeSuccessNotifier />
                        <AppContent />
                    </NotificationProvider>
                </AppThemeProvider>
            </RTL>
        </ErrorBoundary>
    );
}
