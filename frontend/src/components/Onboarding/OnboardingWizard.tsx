import { useMemo, useRef, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    LinearProgress,
    Slide,
    Typography,
    useTheme,
    alpha,
    CircularProgress,
} from '@mui/material';
import {
    ArrowForwardRounded,
    ArrowBackRounded,
    RocketLaunchRounded,
    CheckCircleRounded,
    CelebrationRounded,
} from '@mui/icons-material';
import OnboardingStep from './OnboardingStep';
import { onboardingQuestions } from '../../data/onboardingQuestions';
import { updateStoreProfile, type StoreProfile } from '../../services/storeProfileService';
import { useSettingsStore } from '../../store/settingsStore';

interface OnboardingWizardProps {
    open: boolean;
    onComplete: (profile: StoreProfile) => void;
}

type AnswerMap = Record<string, string | string[]>;

const TOTAL_STEPS = onboardingQuestions.length + 2; // welcome + questions + completion

export default function OnboardingWizard({ open, onComplete }: OnboardingWizardProps) {
    const theme = useTheme();
    const isLight = theme.palette.mode === 'light';
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState<'left' | 'right'>('left');
    const [answers, setAnswers] = useState<AnswerMap>({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const applyStoreProfile = useSettingsStore((s) => s.applyStoreProfile);

    const isWelcome = step === 0;
    const isCompletion = step === TOTAL_STEPS - 1;
    const questionIndex = step - 1;
    const currentQuestion =
        questionIndex >= 0 && questionIndex < onboardingQuestions.length
            ? onboardingQuestions[questionIndex]
            : null;

    const progress = useMemo(() => {
        if (isWelcome) return 0;
        if (isCompletion) return 100;
        return Math.round(((step) / (TOTAL_STEPS - 1)) * 100);
    }, [step, isWelcome, isCompletion]);

    const canProceed = useMemo(() => {
        if (!currentQuestion) return true;
        const v = answers[currentQuestion.key];
        if (currentQuestion.type === 'multiple') {
            return Array.isArray(v) && v.length > 0;
        }
        if (currentQuestion.type === 'text') {
            return typeof v === 'string' && v.trim().length > 0;
        }
        return typeof v === 'string' && v.length > 0;
    }, [answers, currentQuestion]);

    const goNext = async () => {
        // MUI Slide `direction` = side the child enters FROM.
        // RTL forward motion reads right→left, so new content should enter
        // from the LEFT and the outgoing content moves toward the right.
        setDirection('left');
        if (currentQuestion && step < TOTAL_STEPS - 2) {
            setStep((s) => s + 1);
            return;
        }
        // Final question → submit then show completion
        if (step === TOTAL_STEPS - 2) {
            await submit();
            return;
        }
        setStep((s) => s + 1);
    };

    const goBack = () => {
        if (step === 0) return;
        // Going back in RTL: incoming content enters from the right.
        setDirection('right');
        setStep((s) => s - 1);
    };

    const submit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const storeName = (answers.store_name as string | undefined)?.trim() || null;
            const businessType = (answers.business_type as string | undefined) || null;
            const staffCount = (answers.staff_count as string | undefined) || null;
            const featuresRaw = answers.features_needed;
            const features = Array.isArray(featuresRaw) ? featuresRaw : [];

            const profile = await updateStoreProfile({
                store_name: storeName,
                business_type: businessType,
                staff_count: staffCount,
                features_needed: features,
                onboarding_completed: true,
            });
            applyStoreProfile(profile);
            setStep(TOTAL_STEPS - 1);
            // Auto-close after celebration so the user lands in their app
            window.setTimeout(() => onComplete(profile), 2600);
        } catch (e) {
            setError('تعذّر حفظ بيانات المتجر. حاول مجدداً.');
            // eslint-disable-next-line no-console
            console.error('[Onboarding] submit error:', e);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAnswer = (val: string | string[]) => {
        if (!currentQuestion) return;
        setAnswers((prev) => ({ ...prev, [currentQuestion.key]: val }));
    };

    return (
        <Dialog
            open={open}
            fullScreen
            disableEscapeKeyDown
            slotProps={{
                paper: {
                    sx: {
                        background: isLight
                            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${alpha(theme.palette.secondary.main, 0.04)} 100%)`
                            : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.background.default, 1)} 100%)`,
                    },
                },
            }}
        >
            <Box
                dir="rtl"
                sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: "'Cairo','Tajawal',sans-serif",
                }}
            >
                {/* Progress bar */}
                <Box sx={{ flexShrink: 0 }}>
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                            height: 6,
                            '& .MuiLinearProgress-bar': {
                                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)',
                            },
                        }}
                    />
                </Box>

                {/* Body */}
                <Box
                    ref={containerRef}
                    sx={{
                        flex: 1,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: { xs: 2, sm: 4 },
                        py: { xs: 3, sm: 4 },
                    }}
                >
                    <Slide
                        key={step}
                        in
                        direction={direction}
                        container={containerRef.current}
                        timeout={350}
                        mountOnEnter
                        unmountOnExit
                    >
                        <Box sx={{ width: '100%', maxWidth: 820, mx: 'auto' }}>
                            {isWelcome && <WelcomeScreen />}

                            {currentQuestion && (
                                <OnboardingStep
                                    question={currentQuestion}
                                    value={answers[currentQuestion.key] ?? (currentQuestion.type === 'multiple' ? [] : '')}
                                    onChange={handleAnswer}
                                />
                            )}

                            {isCompletion && <CompletionScreen storeName={(answers.store_name as string) || 'متجرك'} />}
                        </Box>
                    </Slide>
                </Box>

                {/* Footer */}
                <Box
                    sx={{
                        flexShrink: 0,
                        px: { xs: 2, sm: 4 },
                        py: 2.5,
                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                        background: isLight ? alpha('#FFFFFF', 0.7) : alpha(theme.palette.background.paper, 0.6),
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                    }}
                >
                    <Box sx={{ minWidth: 100 }}>
                        {!isWelcome && !isCompletion && (
                            <Button
                                onClick={goBack}
                                disabled={submitting}
                                startIcon={<ArrowForwardRounded />}
                                sx={{ borderRadius: 2, fontWeight: 600 }}
                            >
                                السابق
                            </Button>
                        )}
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {!isWelcome && !isCompletion && `الخطوة ${step} من ${onboardingQuestions.length}`}
                        {error && (
                            <Box component="span" sx={{ color: 'error.main', mr: 2 }}>
                                {error}
                            </Box>
                        )}
                    </Typography>

                    <Box sx={{ minWidth: 100, display: 'flex', justifyContent: 'flex-end' }}>
                        {isWelcome && (
                            <Button
                                variant="contained"
                                size="large"
                                onClick={() => {
                                    setDirection('left');
                                    setStep(1);
                                }}
                                endIcon={<RocketLaunchRounded />}
                                sx={{
                                    borderRadius: 2.5,
                                    fontWeight: 700,
                                    px: 3,
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                }}
                            >
                                لنبدأ
                            </Button>
                        )}
                        {currentQuestion && !isCompletion && (
                            <Button
                                variant="contained"
                                size="large"
                                disabled={!canProceed || submitting}
                                onClick={goNext}
                                endIcon={
                                    submitting ? (
                                        <CircularProgress size={18} sx={{ color: 'inherit' }} />
                                    ) : step === TOTAL_STEPS - 2 ? (
                                        <CheckCircleRounded />
                                    ) : (
                                        <ArrowBackRounded />
                                    )
                                }
                                sx={{
                                    borderRadius: 2.5,
                                    fontWeight: 700,
                                    px: 3,
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                }}
                            >
                                {step === TOTAL_STEPS - 2 ? 'إنهاء الإعداد' : 'التالي'}
                            </Button>
                        )}
                    </Box>
                </Box>
            </Box>
        </Dialog>
    );
}

function WelcomeScreen() {
    const theme = useTheme();
    return (
        <Box sx={{ textAlign: 'center', maxWidth: 600, mx: 'auto' }}>
            <Box
                sx={{
                    width: 110,
                    height: 110,
                    mx: 'auto',
                    mb: 3,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    boxShadow: `0 16px 40px ${alpha(theme.palette.primary.main, 0.4)}`,
                    animation: 'welcomeFloat 2.6s ease-in-out infinite',
                    '@keyframes welcomeFloat': {
                        '0%, 100%': { transform: 'translateY(0)' },
                        '50%': { transform: 'translateY(-8px)' },
                    },
                }}
            >
                <RocketLaunchRounded sx={{ fontSize: 56, color: '#fff' }} />
            </Box>
            <Typography variant="h3" fontWeight={900} sx={{ mb: 2 }}>
                أهلاً بك في حانوتي
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                لنُجهّز لك المتجر في أقل من دقيقة
            </Typography>
            <Typography variant="body1" color="text.secondary">
                سنطرح عليك ٤ أسئلة سريعة لنخصص لوحة التحكم لطبيعة نشاطك.
            </Typography>
        </Box>
    );
}

function CompletionScreen({ storeName }: { storeName: string }) {
    const theme = useTheme();
    const sparkles = Array.from({ length: 18 });

    return (
        <Box sx={{ textAlign: 'center', position: 'relative', py: 2 }}>
            {/* CSS confetti */}
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    overflow: 'hidden',
                }}
            >
                {sparkles.map((_, i) => {
                    const left = (i * 53) % 100;
                    const delay = (i % 6) * 0.12;
                    const duration = 2 + ((i % 5) * 0.3);
                    const colors = [
                        theme.palette.primary.main,
                        theme.palette.secondary.main,
                        theme.palette.success.main,
                        theme.palette.warning.main,
                        theme.palette.info.main,
                    ];
                    const color = colors[i % colors.length];
                    return (
                        <Box
                            key={i}
                            sx={{
                                position: 'absolute',
                                top: -20,
                                left: `${left}%`,
                                width: 10,
                                height: 14,
                                background: color,
                                borderRadius: 1,
                                opacity: 0,
                                animation: `confettiFall ${duration}s cubic-bezier(0.4,0,0.2,1) ${delay}s forwards`,
                                '@keyframes confettiFall': {
                                    '0%': { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
                                    '100%': { transform: 'translateY(420px) rotate(540deg)', opacity: 0 },
                                },
                            }}
                        />
                    );
                })}
            </Box>

            <Box
                sx={{
                    width: 130,
                    height: 130,
                    mx: 'auto',
                    mb: 3,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.primary.main})`,
                    boxShadow: `0 20px 50px ${alpha(theme.palette.success.main, 0.45)}`,
                    animation: 'checkPop 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
                    '@keyframes checkPop': {
                        '0%': { transform: 'scale(0)' },
                        '60%': { transform: 'scale(1.15)' },
                        '100%': { transform: 'scale(1)' },
                    },
                }}
            >
                <CheckCircleRounded
                    sx={{
                        fontSize: 76,
                        color: '#fff',
                        animation: 'checkDraw 0.7s 0.3s ease-out backwards',
                        '@keyframes checkDraw': {
                            '0%': { opacity: 0, transform: 'scale(0.4)' },
                            '100%': { opacity: 1, transform: 'scale(1)' },
                        },
                    }}
                />
            </Box>

            <Typography variant="h3" fontWeight={900} sx={{ mb: 2 }}>
                <CelebrationRounded
                    sx={{ fontSize: 36, color: 'warning.main', verticalAlign: 'middle', mx: 1 }}
                />
                {storeName} جاهز!
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
                تم إعداد متجرك بنجاح. لنبدأ العمل.
            </Typography>
        </Box>
    );
}
