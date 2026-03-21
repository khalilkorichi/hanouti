import { useState } from 'react';
import {
    Typography,
    Box,
    Paper,
    Tabs,
    Tab,
    TextField,
    Button,
    Divider,
    Switch,
    Grid,
    Stack,
    Avatar,
    Alert,
    Tooltip
} from '@mui/material';
import {
    Security as SecurityIcon,
    Palette as PaletteIcon,
    Storage as StorageIcon,
    Info as InfoIcon,
    Save as SaveIcon,
    WhatsApp as WhatsAppIcon,
    Person as PersonIcon,
    Download as DownloadIcon,
    Upload as UploadIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import ChangePasswordDialog from '../components/Auth/ChangePasswordDialog';
import { useAppTheme, COLOR_PRESETS } from '../contexts/ThemeContext';
import { CustomCard } from '../components/Common';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`settings-tabpanel-${index}`}
            aria-labelledby={`settings-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export default function Settings() {
    const [value, setValue] = useState(0);
    const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
    const { mode, toggleMode, primaryColor, setPrimaryColor, fontSize, setFontSize } = useAppTheme();
    const [username, setUsername] = useState('المسؤول');

    const handleChange = (_: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    const handleBackup = () => {
        // Mock backup download
        const data = JSON.stringify({ date: new Date(), app: 'Hanouti', version: '1.0' }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hanouti_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    return (
        <Box sx={{ p: 3 }} dir="rtl">
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" sx={{ mb: 4 }}>
                الإعدادات
            </Typography>

            <Paper sx={{ width: '100%', borderRadius: 4, overflow: 'hidden', boxShadow: 3 }}>
                <Tabs
                    value={value}
                    onChange={handleChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        bgcolor: 'background.default',
                        '& .MuiTab-root': {
                            minHeight: 64,
                            fontSize: '1rem',
                            fontWeight: 600
                        }
                    }}
                >
                    <Tab icon={<PersonIcon sx={{ mb: 0.5 }} />} label="عام" />
                    <Tab icon={<PaletteIcon sx={{ mb: 0.5 }} />} label="المظهر" />
                    <Tab icon={<StorageIcon sx={{ mb: 0.5 }} />} label="البيانات" />
                    <Tab icon={<SecurityIcon sx={{ mb: 0.5 }} />} label="الأمان" />
                    <Tab icon={<InfoIcon sx={{ mb: 0.5 }} />} label="حول" />
                </Tabs>

                <Divider />

                {/* General Settings (Profile) */}
                <TabPanel value={value} index={0}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">الملف الشخصي</Typography>
                    <Grid container spacing={4} alignItems="center">
                        <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: 'center' }}>
                            <Avatar
                                sx={{
                                    width: 120,
                                    height: 120,
                                    margin: '0 auto',
                                    bgcolor: 'primary.main',
                                    fontSize: '3rem',
                                    boxShadow: 4
                                }}
                            >
                                {username.charAt(0)}
                            </Avatar>
                            <Button variant="outlined" size="small" sx={{ mt: 2, borderRadius: 4 }}>
                                تغيير الصورة
                            </Button>
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <Stack spacing={3}>
                                <TextField
                                    fullWidth
                                    label="اسم المستخدم"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    variant="outlined"
                                />
                                <TextField
                                    fullWidth
                                    label="البريد الإلكتروني"
                                    defaultValue="admin@hanouti.com"
                                    disabled
                                    variant="outlined"
                                />
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button variant="contained" startIcon={<SaveIcon />} size="large" sx={{ borderRadius: 2 }}>
                                        حفظ التغييرات
                                    </Button>
                                </Box>
                            </Stack>
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* Appearance Settings */}
                <TabPanel value={value} index={1}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">تخصيص المظهر</Typography>

                    <Grid container spacing={4}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <CustomCard sx={{ height: '100%', p: 3 }}>
                                <Typography variant="h6" gutterBottom fontWeight="bold">الوضع</Typography>
                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                    <Typography>الوضع الليلي</Typography>
                                    <Switch checked={mode === 'dark'} onChange={toggleMode} />
                                </Stack>
                            </CustomCard>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <CustomCard sx={{ height: '100%', p: 3 }}>
                                <Typography variant="h6" gutterBottom fontWeight="bold">حجم الخط</Typography>
                                <Stack direction="row" spacing={2} justifyContent="center">
                                    <Button
                                        variant={fontSize === 'small' ? 'contained' : 'outlined'}
                                        onClick={() => setFontSize('small')}
                                    >
                                        صغير
                                    </Button>
                                    <Button
                                        variant={fontSize === 'medium' ? 'contained' : 'outlined'}
                                        onClick={() => setFontSize('medium')}
                                    >
                                        متوسط
                                    </Button>
                                    <Button
                                        variant={fontSize === 'large' ? 'contained' : 'outlined'}
                                        onClick={() => setFontSize('large')}
                                    >
                                        كبير
                                    </Button>
                                </Stack>
                            </CustomCard>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <CustomCard sx={{ p: 3 }}>
                                <Typography variant="h6" gutterBottom fontWeight="bold">لون السمة الرئيسي</Typography>
                                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                                    {Object.entries(COLOR_PRESETS).map(([name, color]) => (
                                        <Tooltip key={name} title={name}>
                                            <Box
                                                onClick={() => setPrimaryColor(color)}
                                                sx={{
                                                    width: 60,
                                                    height: 60,
                                                    borderRadius: '50%',
                                                    bgcolor: color,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: primaryColor === color ? '4px solid white' : 'none',
                                                    boxShadow: primaryColor === color ? '0 0 0 2px #000' : 'none',
                                                    transition: 'transform 0.2s',
                                                    '&:hover': { transform: 'scale(1.1)' }
                                                }}
                                            >
                                                {primaryColor === color && <CheckCircleIcon sx={{ color: 'white' }} />}
                                            </Box>
                                        </Tooltip>
                                    ))}
                                </Stack>
                            </CustomCard>
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* Data Settings */}
                <TabPanel value={value} index={2}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">إدارة البيانات</Typography>
                    <Alert severity="info" sx={{ mb: 3 }}>
                        قم بتصدير نسخة احتياطية من بياناتك بانتظام للحفاظ عليها من الضياع.
                    </Alert>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                        <CustomCard sx={{ flex: 1, textAlign: 'center', p: 3 }}>
                            <Typography variant="h6" gutterBottom fontWeight="bold">تصدير البيانات</Typography>
                            <StorageIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                            <Typography color="text.secondary" paragraph>
                                تحميل نسخة كاملة من قاعدة البيانات كملف JSON.
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<DownloadIcon />}
                                fullWidth
                                onClick={handleBackup}
                            >
                                تصدير نسخة احتياطية
                            </Button>
                        </CustomCard>

                        <CustomCard sx={{ flex: 1, textAlign: 'center', p: 3 }}>
                            <Typography variant="h6" gutterBottom fontWeight="bold">استعادة البيانات</Typography>
                            <UploadIcon sx={{ fontSize: 60, color: 'secondary.main', mb: 2 }} />
                            <Typography color="text.secondary" paragraph>
                                استعادة البيانات من ملف نسخة احتياطية سابق.
                            </Typography>
                            <Button variant="outlined" component="label" fullWidth startIcon={<UploadIcon />}>
                                رفع ملف النسخة الاحتياطية
                                <input type="file" hidden accept=".json" />
                            </Button>
                        </CustomCard>
                    </Stack>
                </TabPanel>

                {/* Security Settings */}
                <TabPanel value={value} index={3}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">أمان الحساب</Typography>
                    <Box sx={{ mt: 2 }}>
                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={() => setOpenPasswordDialog(true)}
                            size="large"
                        >
                            تغيير كلمة المرور
                        </Button>
                    </Box>

                    <Divider sx={{ my: 4 }} />

                    <Typography variant="h6" gutterBottom color="error" fontWeight="bold">منطقة الخطر</Typography>
                    <Paper sx={{ p: 2, border: '1px solid red', bgcolor: 'error.lighter' }}>
                        <Typography paragraph>
                            حذف جميع البيانات وإعادة ضبط المصنع. هذا الإجراء لا يمكن التراجع عنه.
                        </Typography>
                        <Button variant="contained" color="error">
                            حذف جميع البيانات
                        </Button>
                    </Paper>
                </TabPanel>

                {/* About */}
                <TabPanel value={value} index={4}>
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Avatar
                            src="/logo.png"
                            sx={{ width: 100, height: 100, margin: '0 auto 20px', bgcolor: 'primary.main' }}
                        >
                            H
                        </Avatar>
                        <Typography variant="h4" fontWeight="bold" gutterBottom>
                            برنامج حانوتي
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                            نظام إدارة المبيعات والمخزون المتكامل
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                            الإصدار 1.0.0
                        </Typography>

                        <Divider sx={{ my: 4, maxWidth: 400, mx: 'auto' }} />

                        <Typography variant="h6" gutterBottom>
                            تم التطوير بواسطة
                        </Typography>
                        <Typography variant="h5" color="primary" fontWeight="bold" gutterBottom>
                            خليل قريشي
                        </Typography>

                        <Box sx={{ mt: 3 }}>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<WhatsAppIcon />}
                                href="https://wa.me/213663730533"
                                target="_blank"
                                size="large"
                                sx={{ borderRadius: 50, px: 4 }}
                            >
                                تواصل عبر واتساب
                            </Button>
                        </Box>
                    </Box>
                </TabPanel>
            </Paper>

            <ChangePasswordDialog
                open={openPasswordDialog}
                onClose={() => setOpenPasswordDialog(false)}
            />
        </Box>
    );
}
