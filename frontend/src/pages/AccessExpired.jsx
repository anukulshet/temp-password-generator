const messageMap = {
  TOKEN_NOT_FOUND: { title: 'Link Not Found', body: 'This access link is invalid or does not exist.' },
  TOKEN_EXPIRED:   { title: 'Link Expired',   body: 'This access link has expired and can no longer be used.' },
  TOKEN_REVOKED:   { title: 'Access Revoked', body: 'This access link has been revoked by the owner.' },
  TOKEN_EXHAUSTED: { title: 'Link Used Up',   body: 'This access link has already been used the maximum number of times.' },
  RATE_LIMITED:    { title: 'Too Many Attempts', body: 'This link has been locked due to too many failed attempts. Try again later.' },
  default:         { title: 'Access Unavailable', body: 'This access link is no longer valid.' },
};

const AccessExpired = ({ code }) => {
  const { title, body } = messageMap[code] || messageMap.default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border border-gray-200 rounded-xl p-10 max-w-md w-full text-center shadow-sm">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-500">{body}</p>
      </div>
    </div>
  );
};

export default AccessExpired;
