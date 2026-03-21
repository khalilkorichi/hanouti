import { AppBar, Toolbar, IconButton, Typography, Box, useTheme, alpha } from '@mui/material';
import {
    Menu as MenuIcon,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
    AccountCircle
} from '@mui/icons-material';

interface HeaderProps {
    onMenuClick: () => void;
    isDarkMode: boolean;
    onThemeToggle: () => void;
}

export default function Header({ onMenuClick, isDarkMode, onThemeToggle }: HeaderProps) {
    const theme = useTheme();

    return (
        <AppBar 
            position="fixed" 
            sx={{ 
                zIndex: theme.zIndex.drawer + 1,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                boxShadow: `0 1px 3px 0 ${alpha(theme.palette.common.black, 0.1)}, 0 1px 2px 0 ${alpha(theme.palette.common.black, 0.06)}`,
            }}
        >
            <Toolbar>
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    onClick={onMenuClick}
                    sx={{ mr: 2, display: { sm: 'none' } }}
                >
                    <MenuIcon />
                </IconButton>
                <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 'bold', color: theme.palette.primary.main }}>
                    حانوتي POS
                </Typography>
                <Box>
                    <IconButton sx={{ ml: 1 }} onClick={onThemeToggle} color="inherit">
                        {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
                    </IconButton>
                    <IconButton
                        size="large"
                        edge="end"
                        aria-label="account of current user"
                        aria-haspopup="true"
                        color="inherit"
                    >
                        <AccountCircle />
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
