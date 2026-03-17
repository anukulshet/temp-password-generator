import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AccessExpired from './AccessExpired';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const Verify = () => {
  const [searchParams] = useSearchParams();
  const rawToken = searchParams.get('token');

  const [email, setEmail]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [redirecting, setRedirecting] = useState(false);

  if (!rawToken)  return <AccessExpired code="TOKEN_NOT_FOUND" />;
  if (errorCode)  return <AccessExpired code={errorCode} />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await axios.post(`${API}/verify`, { token: rawToken, email });

      // Show "connecting..." then silently redirect — credentials never shown
      setRedirecting(true);
      setTimeout(() => {
        window.location.href = data.redirectUrl;
      }, 800);
    } catch (err) {
      const code = err.response?.data?.code;
      const msg  = err.response?.data?.error || 'Verification failed';
      if (['TOKEN_NOT_FOUND', 'TOKEN_EXPIRED', 'TOKEN_REVOKED', 'TOKEN_EXHAUSTED', 'RATE_LIMITED'].includes(code)) {
        setErrorCode(code);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Connecting screen ─────────────────────────────────────────────────────
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white border border-gray-200 rounded-xl p-10 max-w-md w-full text-center shadow-sm">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6" />
          <h1 className="text-lg font-bold text-gray-900 mb-2">Connecting you in...</h1>
          <p className="text-sm text-gray-500">Logging you in securely. Do not close this tab.</p>
        </div>
      </div>
    );
  }

  // ── Email verification form ───────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-md w-full shadow-sm">
        <div className="text-4xl mb-3 text-center">🔑</div>
        <h1 className="text-xl font-bold text-gray-900 text-center mb-1">Verify Your Identity</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Enter the email address this link was sent to.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify & Get Access'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Verify;
