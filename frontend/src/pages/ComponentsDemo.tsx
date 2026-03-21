import { useState } from 'react';
import { Box, Typography, CardContent, Divider, Stack } from '@mui/material';
import {
    UnifiedModal,
    CustomIconButton,
    CustomInput,
    CustomSelect,
    CustomButton,
    CustomCard
} from '../components/Common';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Favorite as FavoriteIcon,
    Star as StarIcon
} from '@mui/icons-material';

/**
 * صفحة عرض توضيحية لجميع مكونات UI الأساسية
 * Demo page for all Common UI Components
 */
export default function ComponentsDemo() {
    const [modalOpen, setModalOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [selectValue, setSelectValue] = useState('');
    const [loading, setLoading] = useState(false);

    const selectOptions = [
        { value: '1', label: 'الخيار الأول' },
        { value: '2', label: 'الخيار الثاني' },
        { value: '3', label: 'الخيار الثالث', icon: <StarIcon fontSize="small" /> },
    ];

    const handleLoadingDemo = () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 2000);
    };

    return (
        <Box>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
                عرض مكونات UI الأساسية
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
                صفحة عرض توضيحية لجميع المكونات الأساسية في النظام
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Row 1 - Buttons and Icons */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
                    {/* CustomButton Demo */}
                    <CustomCard borderColor="#0052CC" borderPosition="top">
                        <CardContent>
                            <Typography variant="h6" fontWeight="bold" gutterBottom>
                                CustomButton - الأزرار المخصصة
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Stack spacing={2}>
                                <CustomButton variant="contained">
                                    زر أساسي
                                </CustomButton>
                                <CustomButton variant="outlined" icon={<AddIcon />}>
                                    زر مع أيقونة
                                </CustomButton>
                                <CustomButton variant="contained" gradient>
                                    زر بتدرج لوني
                                </CustomButton>
                                <CustomButton
                                    variant="contained"
                                    loading={loading}
                                    onClick={handleLoadingDemo}
                                >
                                    زر بحالة تحميل
                                </CustomButton>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <CustomButton size="small">صغير</CustomButton>
                                    <CustomButton size="medium">متوسط</CustomButton>
                                    <CustomButton size="large">كبير</CustomButton>
                                </Box>
                            </Stack>
                        </CardContent>
                    </CustomCard>

                    {/* CustomIconButton Demo */}
                    <CustomCard borderColor="#00B8D9" borderPosition="top">
                        <CardContent>
                            <Typography variant="h6" fontWeight="bold" gutterBottom>
                                CustomIconButton - أزرار الأيقونات
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Stack spacing={2}>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <CustomIconButton tooltip="افتراضي" variant="default">
                                        <SearchIcon />
                                    </CustomIconButton>
                                    <CustomIconButton tooltip="أساسي" variant="primary">
                                        <EditIcon />
                                    </CustomIconButton>
                                    <CustomIconButton tooltip="ثانوي" variant="secondary">
                                        <AddIcon />
                                    </CustomIconButton>
                                    <CustomIconButton tooltip="نجاح" variant="success">
                                        <FavoriteIcon />
                                    </CustomIconButton>
                                    <CustomIconButton tooltip="تحذير" variant="warning">
                                        <StarIcon />
                                    </CustomIconButton>
                                    <CustomIconButton tooltip="خطر" variant="error">
                                        <DeleteIcon />
                                    </CustomIconButton>
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                    مرر الماوس فوق الأزرار لرؤية التلميحات
                                </Typography>
                            </Stack>
                        </CardContent>
                    </CustomCard>
                </Box>

                {/* Row 2 - Inputs and Selects */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
                    {/* CustomInput Demo */}
                    <CustomCard borderColor="#36B37E" borderPosition="top">
                        <CardContent>
                            <Typography variant="h6" fontWeight="bold" gutterBottom>
                                CustomInput - حقول الإدخال
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Stack spacing={2}>
                                <CustomInput
                                    label="حقل إدخال عادي"
                                    placeholder="أدخل النص هنا"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                />
                                <CustomInput
                                    label="حقل بحث"
                                    placeholder="ابحث..."
                                    startIcon={<SearchIcon />}
                                />
                                <CustomInput
                                    label="حقل مطلوب"
                                    placeholder="هذا الحقل مطلوب"
                                    required
                                    error
                                    helperText="هذا الحقل مطلوب"
                                />
                                <CustomInput
                                    label="حقل معطل"
                                    value="نص معطل"
                                    disabled
                                />
                                <CustomInput
                                    variant="filled"
                                    label="نمط ممتلئ"
                                    placeholder="نمط filled"
                                />
                            </Stack>
                        </CardContent>
                    </CustomCard>

                    {/* CustomSelect Demo */}
                    <CustomCard borderColor="#FFAB00" borderPosition="top">
                        <CardContent>
                            <Typography variant="h6" fontWeight="bold" gutterBottom>
                                CustomSelect - قوائم الاختيار
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Stack spacing={2}>
                                <CustomSelect
                                    label="اختر خيار"
                                    options={selectOptions}
                                    value={selectValue}
                                    onChange={(e) => setSelectValue(e.target.value as string)}
                                />
                                <CustomSelect
                                    label="قائمة مطلوبة"
                                    options={selectOptions}
                                    required
                                    placeholder="اختر..."
                                />
                                <CustomSelect
                                    label="قائمة معطلة"
                                    options={selectOptions}
                                    disabled
                                    value="1"
                                />
                            </Stack>
                        </CardContent>
                    </CustomCard>
                </Box>

                {/* UnifiedModal Demo */}
                <CustomCard borderColor="#FF5630" borderPosition="top">
                    <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            UnifiedModal - النافذة المنبثقة الموحدة
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <CustomButton
                            variant="contained"
                            onClick={() => setModalOpen(true)}
                        >
                            افتح النافذة المنبثقة
                        </CustomButton>
                    </CardContent>
                </CustomCard>

                {/* CustomCard Variants Demo */}
                <Box>
                    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                        CustomCard - أنواع البطاقات
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                        <CustomCard hoverEffect>
                            <CardContent>
                                <Typography variant="h6">بطاقة عادية</Typography>
                                <Typography color="text.secondary">
                                    مع تأثير hover
                                </Typography>
                            </CardContent>
                        </CustomCard>
                        <CustomCard
                            borderColor="#0052CC"
                            borderPosition="left"
                            interactive
                        >
                            <CardContent>
                                <Typography variant="h6">بطاقة تفاعلية</Typography>
                                <Typography color="text.secondary">
                                    مع حد ملون
                                </Typography>
                            </CardContent>
                        </CustomCard>
                        <CustomCard gradient>
                            <CardContent>
                                <Typography variant="h6">بطاقة مع تدرج</Typography>
                                <Typography color="text.secondary">
                                    خلفية متدرجة
                                </Typography>
                            </CardContent>
                        </CustomCard>
                        <CustomCard glassEffect>
                            <CardContent>
                                <Typography variant="h6">تأثير زجاجي</Typography>
                                <Typography color="text.secondary">
                                    Glassmorphism
                                </Typography>
                            </CardContent>
                        </CustomCard>
                    </Box>
                </Box>
            </Box>

            {/* UnifiedModal */}
            <UnifiedModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title="نافذة منبثقة توضيحية"
                maxWidth="sm"
                actions={
                    <>
                        <CustomButton onClick={() => setModalOpen(false)}>
                            إلغاء
                        </CustomButton>
                        <CustomButton
                            variant="contained"
                            onClick={() => {
                                alert('تم الحفظ بنجاح!');
                                setModalOpen(false);
                            }}
                        >
                            حفظ
                        </CustomButton>
                    </>
                }
            >
                <Box sx={{ py: 2 }}>
                    <Typography gutterBottom>
                        هذه نافذة منبثقة توضيحية تعرض كيفية استخدام المكون UnifiedModal.
                    </Typography>
                    <CustomInput
                        label="مثال على حقل إدخال"
                        placeholder="أدخل قيمة"
                        fullWidth
                        sx={{ mt: 2 }}
                    />
                </Box>
            </UnifiedModal>
        </Box>
    );
}
