import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Alert } from '@mui/material';

interface ChangePasswordDialogProps {
    open: boolean;
    onClose: () => void;
    forceChange?: boolean;
}

export default function ChangePasswordDialog({ open, onClose, forceChange = false }: ChangePasswordDialogProps) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError('كلمة المرور الجديدة غير متطابقة');
            return;
        }

        if (newPassword.length < 4) {
            setError('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'حدث خطأ أثناء تغيير كلمة المرور');
            }

            setSuccess('تم تغيير كلمة المرور بنجاح');
            setTimeout(() => {
                onClose();
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setSuccess('');
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'حدث خطأ ما');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
        >
            <DialogTitle>
                {forceChange ? 'يُنصح بتغيير كلمة المرور' : 'تغيير كلمة المرور'}
            </DialogTitle>
            <DialogContent>
                {forceChange && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        للحفاظ على أمان حسابك، يُنصح بتغيير كلمة المرور الافتراضية.
                        يمكنك تخطي هذه الخطوة الآن وتغييرها لاحقاً من الإعدادات.
                    </Alert>
                )}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                <TextField
                    margin="dense"
                    label="كلمة المرور الحالية"
                    type="password"
                    fullWidth
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <TextField
                    margin="dense"
                    label="كلمة المرور الجديدة"
                    type="password"
                    fullWidth
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                />
                <TextField
                    margin="dense"
                    label="تأكيد كلمة المرور الجديدة"
                    type="password"
                    fullWidth
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">
                    {forceChange ? 'تخطي الآن' : 'إلغاء'}
                </Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
