import { useRef } from 'react';
import {
    InputBase, Box, IconButton, CircularProgress,
    alpha, type SxProps, type Theme,
} from '@mui/material';
import {
    SearchRounded as SearchIcon,
    CloseRounded as ClearIcon,
} from '@mui/icons-material';

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    isLoading?: boolean;
    fullWidth?: boolean;
    size?: 'small' | 'medium';
    sx?: SxProps<Theme>;
    autoFocus?: boolean;
}

export default function SearchInput({
    value,
    onChange,
    placeholder = 'بحث...',
    isLoading = false,
    fullWidth = true,
    size = 'small',
    sx,
    autoFocus,
}: SearchInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const hasValue = value.length > 0;
    const height = size === 'small' ? 40 : 48;
    const iconSize = size === 'small' ? 20 : 22;

    return (
        <Box
            onClick={() => inputRef.current?.focus()}
            sx={[
                (theme) => ({
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    height,
                    width: fullWidth ? '100%' : 'auto',
                    px: size === 'small' ? 1.5 : 2,
                    borderRadius: 2.5,
                    border: '1.5px solid',
                    borderColor: alpha(theme.palette.divider, 0.7),
                    background:
                        theme.palette.mode === 'light'
                            ? alpha('#fff', 0.92)
                            : alpha(theme.palette.background.paper, 0.7),
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
                    cursor: 'text',
                    '&:focus-within': {
                        borderColor: theme.palette.primary.main,
                        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.13)}`,
                        background:
                            theme.palette.mode === 'light'
                                ? '#fff'
                                : theme.palette.background.paper,
                        '& .search-icon': {
                            color: theme.palette.primary.main,
                        },
                    },
                    '&:hover:not(:focus-within)': {
                        borderColor: alpha(theme.palette.primary.main, 0.45),
                        background:
                            theme.palette.mode === 'light'
                                ? '#fff'
                                : alpha(theme.palette.background.paper, 0.85),
                    },
                }),
                ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
            ]}
        >
            {/* Search icon */}
            <SearchIcon
                className="search-icon"
                sx={{
                    fontSize: iconSize,
                    color: hasValue ? 'primary.main' : 'text.disabled',
                    transition: 'color 0.2s',
                    flexShrink: 0,
                }}
            />

            {/* Text input */}
            <InputBase
                inputRef={inputRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoFocus={autoFocus}
                fullWidth
                sx={{
                    fontSize: size === 'small' ? '0.875rem' : '1rem',
                    '& input': {
                        p: 0,
                        color: 'text.primary',
                        '&::placeholder': { color: 'text.disabled', opacity: 1 },
                    },
                }}
            />

            {/* End: spinner while loading, clear button when text present */}
            {isLoading ? (
                <CircularProgress
                    size={16}
                    sx={{ flexShrink: 0, color: 'primary.main', opacity: 0.7 }}
                />
            ) : hasValue ? (
                <IconButton
                    size="small"
                    tabIndex={-1}
                    onClick={(e) => {
                        e.stopPropagation();
                        onChange('');
                        inputRef.current?.focus();
                    }}
                    sx={(theme) => ({
                        flexShrink: 0,
                        p: 0.3,
                        color: 'text.secondary',
                        opacity: 0.6,
                        transition: 'all 0.15s',
                        '&:hover': {
                            opacity: 1,
                            color: 'error.main',
                            background: alpha(theme.palette.error.main, 0.1),
                        },
                    })}
                >
                    <ClearIcon sx={{ fontSize: 16 }} />
                </IconButton>
            ) : null}
        </Box>
    );
}
