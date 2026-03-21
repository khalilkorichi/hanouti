import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar, { DRAWER_WIDTH, DRAWER_COLLAPSED_WIDTH } from './Sidebar';
import ChangePasswordDialog from '../Auth/ChangePasswordDialog';

interface MainLayoutProps {
    children: ReactNode;
    isDarkMode: boolean;
    onThemeToggle: () => void;
}

export default function MainLayout({ children, isDarkMode, onThemeToggle }: MainLayoutProps) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => {
        return localStorage.getItem('sidebar_collapsed') === 'true';
    });
    const [forcePasswordChange, setForcePasswordChange] = useState(false);
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const sidebarWidth = collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

    useEffect(() => {
        const checkUserStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const response = await fetch('/api/users/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const user = await response.json();
                    if (user.requires_password_change) {
                        setForcePasswordChange(true);
                    }
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
        <Box dir="rtl" sx={{ display: 'flex', direction: 'rtl', minHeight: '100vh' }}>
            <Header
                onMenuClick={() => setMobileSidebarOpen(true)}
                isDarkMode={isDarkMode}
                onThemeToggle={onThemeToggle}
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
                    minHeight: '100vh',
                    backgroundColor: theme.palette.background.default,
                    transition: 'margin 0.3s cubic-bezier(0.4,0,0.2,1)',
                    mr: isMobile ? 0 : `${sidebarWidth}px`,
                    width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)`,
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
        </Box>
    );
}
