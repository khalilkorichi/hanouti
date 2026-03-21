import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Box, Toolbar, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import ChangePasswordDialog from '../Auth/ChangePasswordDialog';

interface MainLayoutProps {
    children: ReactNode;
    isDarkMode: boolean;
    onThemeToggle: () => void;
}

export default function MainLayout({ children, isDarkMode, onThemeToggle }: MainLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [forcePasswordChange, setForcePasswordChange] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkUserStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const response = await fetch('http://localhost:8000/users/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
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

    return (
        <Box dir="rtl" sx={{ display: 'flex', direction: 'rtl' }}>
            <Header
                onMenuClick={() => setSidebarOpen(true)}
                isDarkMode={isDarkMode}
                onThemeToggle={onThemeToggle}
            />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: { xs: 2, sm: 3 },
                    backgroundColor: (theme) => theme.palette.background.default,
                    minHeight: '100vh',
                }}
            >
                <Toolbar sx={{ minHeight: { xs: 64, md: 70 } }} />
                <Container maxWidth={false} disableGutters>
                    {children}
                </Container>
            </Box>
            <Sidebar
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                onLogout={handleLogout}
            />

            <ChangePasswordDialog
                open={forcePasswordChange}
                onClose={() => setForcePasswordChange(false)}
                forceChange={true}
            />
        </Box>
    );
}
