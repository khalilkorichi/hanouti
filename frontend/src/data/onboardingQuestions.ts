import type { ReactNode } from 'react';
import { createElement } from 'react';
import {
    StorefrontRounded,
    LocalPharmacyRounded,
    LocalCafeRounded,
    RestaurantRounded,
    CheckroomRounded,
    MoreHorizRounded,
    PersonRounded,
    GroupsRounded,
    Diversity3Rounded,
    BusinessRounded,
    PointOfSaleRounded,
    InventoryRounded,
    CategoryRounded,
    AssessmentRounded,
} from '@mui/icons-material';

export interface OnboardingOption {
    value: string;
    label: string;
    icon: ReactNode;
}

export type SelectionType = 'single' | 'multiple' | 'text';

export interface OnboardingQuestion {
    key: 'store_name' | 'business_type' | 'staff_count' | 'features_needed';
    title: string;
    subtitle?: string;
    type: SelectionType;
    options?: OnboardingOption[];
    placeholder?: string;
    required?: boolean;
}

export const onboardingQuestions: OnboardingQuestion[] = [
    {
        key: 'store_name',
        title: 'ما اسم متجرك؟',
        subtitle: 'سيظهر هذا الاسم في الفواتير والتقارير',
        type: 'text',
        placeholder: 'مثال: متجر النور',
        required: true,
    },
    {
        key: 'business_type',
        title: 'ما نوع نشاطك التجاري؟',
        subtitle: 'اختر القطاع الأقرب لمتجرك',
        type: 'single',
        required: true,
        options: [
            { value: 'grocery', label: 'بقالة', icon: createElement(StorefrontRounded) },
            { value: 'pharmacy', label: 'صيدلية', icon: createElement(LocalPharmacyRounded) },
            { value: 'cafe', label: 'مقهى', icon: createElement(LocalCafeRounded) },
            { value: 'restaurant', label: 'مطعم', icon: createElement(RestaurantRounded) },
            { value: 'clothing', label: 'ملابس', icon: createElement(CheckroomRounded) },
            { value: 'other', label: 'أخرى', icon: createElement(MoreHorizRounded) },
        ],
    },
    {
        key: 'staff_count',
        title: 'كم عدد الموظفين لديك؟',
        subtitle: 'يساعدنا في تخصيص لوحة التحكم',
        type: 'single',
        required: true,
        options: [
            { value: 'solo', label: 'أنا فقط', icon: createElement(PersonRounded) },
            { value: 'small', label: '2 - 5', icon: createElement(GroupsRounded) },
            { value: 'medium', label: '6 - 15', icon: createElement(Diversity3Rounded) },
            { value: 'large', label: 'أكثر من 15', icon: createElement(BusinessRounded) },
        ],
    },
    {
        key: 'features_needed',
        title: 'أي ميزات تحتاج؟',
        subtitle: 'يمكنك اختيار أكثر من ميزة (سنخفي الأقسام غير المختارة)',
        type: 'multiple',
        required: true,
        options: [
            { value: 'pos', label: 'نقطة البيع', icon: createElement(PointOfSaleRounded) },
            { value: 'inventory', label: 'إدارة المخزون', icon: createElement(InventoryRounded) },
            { value: 'categories', label: 'الفئات', icon: createElement(CategoryRounded) },
            { value: 'reports', label: 'التقارير', icon: createElement(AssessmentRounded) },
        ],
    },
];
