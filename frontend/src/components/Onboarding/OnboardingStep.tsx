import { Box, TextField, Typography } from '@mui/material';
import OnboardingOptionCard from './OnboardingOptionCard';
import type { OnboardingQuestion } from '../../data/onboardingQuestions';

interface OnboardingStepProps {
    question: OnboardingQuestion;
    value: string | string[];
    onChange: (value: string | string[]) => void;
}

export default function OnboardingStep({ question, value, onChange }: OnboardingStepProps) {
    const handleSingleSelect = (val: string) => onChange(val);

    const handleMultiSelect = (val: string) => {
        const current = Array.isArray(value) ? value : [];
        const next = current.includes(val)
            ? current.filter((v) => v !== val)
            : [...current, val];
        onChange(next);
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
                    {question.title}
                </Typography>
                {question.subtitle && (
                    <Typography variant="body2" color="text.secondary">
                        {question.subtitle}
                    </Typography>
                )}
            </Box>

            {question.type === 'text' ? (
                <Box sx={{ maxWidth: 480, mx: 'auto' }}>
                    <TextField
                        autoFocus
                        fullWidth
                        size="medium"
                        value={typeof value === 'string' ? value : ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={question.placeholder}
                        slotProps={{
                            input: {
                                sx: {
                                    fontSize: '1.1rem',
                                    fontWeight: 600,
                                    borderRadius: 2.5,
                                    py: 0.5,
                                },
                            },
                        }}
                    />
                </Box>
            ) : (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: 'repeat(2, 1fr)',
                            sm: 'repeat(3, 1fr)',
                        },
                        gap: 2,
                        maxWidth: 720,
                        mx: 'auto',
                    }}
                >
                    {question.options?.map((opt) => {
                        const selected =
                            question.type === 'multiple'
                                ? Array.isArray(value) && value.includes(opt.value)
                                : value === opt.value;
                        return (
                            <OnboardingOptionCard
                                key={opt.value}
                                icon={opt.icon}
                                label={opt.label}
                                selected={selected}
                                onClick={() =>
                                    question.type === 'multiple'
                                        ? handleMultiSelect(opt.value)
                                        : handleSingleSelect(opt.value)
                                }
                            />
                        );
                    })}
                </Box>
            )}
        </Box>
    );
}
