import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar, { DRAWER_WIDTH, DRAWER_COLLAPSED_WIDTH } from './Sidebar';
import ChangePasswordDialog from '../Auth/ChangePasswordDialog';
import OnboardingWizard from '../Onboarding/OnboardingWizard';
import GlobalCustomShortcuts from '../Shortcuts/GlobalCustomShortcuts';
import ShortcutsManagerDialog from '../Shortcuts/ShortcutsManagerDialog';
import useOnboarding from '../../hooks/useOnboarding';
import api from '../../services/api';
import { useAppTheme } from '../../contexts/ThemeContext';

interface MainLayoutProps {
    children: ReactNode;
    isDarkMode: boolean;
    onThemeToggle: () => void;
}

export default function MainLayout({ children, isDarkMode, onThemeToggle }: MainLayoutProps) {
    const { sidebarCollapsedDefault } = useAppTheme();
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => {
        const stored = localStorage.getItem('sidebar_collapsed');
        if (stored === 'true' || stored === 'false') return stored === 'true';
        return sidebarCollapsedDefault;
    });
    const [forcePasswordChange, setForcePasswordChange] = useState(false);
    const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
    const { showOnboarding, completeOnboarding } = useOnboarding();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    void (collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH);

    useEffect(() => {
        const checkUserStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const { data: user } = await api.get('/users/me', {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (user?.requires_password_change) {
                    setForcePasswordChange(true);
                }
            } catch (error) {
                console.error('Error checking user status:', error);
            }
        };

        checkUserStatus();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleCollapseToggle = () => {
        setCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem('sidebar_collapsed', String(next));
            return next;
        });
    };

    return (
        <Box dir="rtl" sx={{ display: 'flex', minHeight: '100vh' }}>
            <Header
                onMenuClick={() => setMobileSidebarOpen(true)}
                isDarkMode={isDarkMode}
                onThemeToggle={onThemeToggle}
                onOpenShortcuts={() => setShortcutsDialogOpen(true)}
                collapsed={collapsed}
                onCollapseToggle={handleCollapseToggle}
                isPermanent={!isMobile}
            />

            {/* Desktop: permanent sidebar */}
            {!isMobile && (
                <Sidebar
                    open
                    onClose={() => {}}
                    onLogout={handleLogout}
                    variant="permanent"
                    collapsed={collapsed}
                />
            )}

            {/* Mobile: temporary drawer */}
            {isMobile && (
                <Sidebar
                    open={mobileSidebarOpen}
                    onClose={() => setMobileSidebarOpen(false)}
                    onLogout={handleLogout}
                    variant="temporary"
                    collapsed={false}
                />
            )}

            {/* Main content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    minWidth: 0,          /* يمنع flex item من تجاوز حده */
                    minHeight: '100vh',
                    backgroundColor: theme.palette.background.default,
                    overflow: 'auto',
                }}
            >
                <Toolbar sx={{ minHeight: { xs: 60, md: 68 } }} />
                <Box sx={{ p: { xs: 2, sm: 3, md: 3 }, maxWidth: '100%' }}>
                    {children}
                </Box>
            </Box>

            <ChangePasswordDialog
                open={forcePasswordChange}
                onClose={() => setForcePasswordChange(false)}
                forceChange={true}
            />

            <OnboardingWizard
                open={showOnboarding && !forcePasswordChange}
                onComplete={completeOnboarding}
            />

            {/* User-defined keyboard shortcuts (theme toggle, navigation, etc.) */}
            <GlobalCustomShortcuts
                onThemeToggle={onThemeToggle}
                onOpenShortcuts={() => setShortcutsDialogOpen(true)}
            />
            <ShortcutsManagerDialog
                open={shortcutsDialogOpen}
                onClose={() => setShortcutsDialogOpen(false)}
            />
        </Box>
    );
}
