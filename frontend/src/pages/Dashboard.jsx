import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getResources, createResource, deleteResource, createAccessToken } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New resource form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ resourceName: '', resourceUrl: '', username: '', password: '', loginUrl: '', usernameField: 'email', passwordField: 'password' });
  const [saving, setSaving] = useState(false);

  // Share modal
  const [shareTarget, setShareTarget] = useState(null);
  const [shareForm, setShareForm] = useState({ recipientEmail: '', expiresInMinutes: 60, maxUses: 1 });
  const [shareLink, setShareLink] = useState('');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const { data } = await getResources();
      setResources(data.resources);
    } catch {
      setError('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await createResource(form);
      setForm({ resourceName: '', resourceUrl: '', username: '', password: '', loginUrl: '', usernameField: 'email', passwordField: 'password' });
      setShowForm(false);
      fetchResources();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save resource');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this resource?')) return;
    try {
      await deleteResource(id);
      setResources(resources.filter((r) => r.id !== id));
    } catch {
      setError('Failed to delete resource');
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    try {
      setSharing(true);
      const { data } = await createAccessToken({ resourceId: shareTarget.id, ...shareForm });
      setShareLink(data.accessLink);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create access token');
    } finally {
      setSharing(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Resources</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + Add Resource
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      {/* Add Resource Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-800">New Resource</h2>
          {[
            { field: 'resourceName',  label: 'Resource Name',  required: true },
            { field: 'resourceUrl',   label: 'Resource URL',   required: true },
            { field: 'username',      label: 'Username',       required: true },
            { field: 'password',      label: 'Password',       required: true },
          ].map(({ field, label, required }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={field === 'password' ? 'password' : 'text'}
                required={required}
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400 mb-3">Auto-login settings (optional — for seamless redirect)</p>
            {[
              { field: 'loginUrl',      label: 'Login Form URL',      placeholder: 'https://site.com/login' },
              { field: 'usernameField', label: 'Username Field Name',  placeholder: 'email' },
              { field: 'passwordField', label: 'Password Field Name',  placeholder: 'password' },
            ].map(({ field, label, placeholder }) => (
              <div key={field} className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Resource'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Resource List */}
      {resources.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No resources yet. Add one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{r.resource_name}</p>
                <p className="text-sm text-gray-400">{r.resource_url}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShareTarget(r); setShareLink(''); }}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Share Access
                </button>
                <button
                  onClick={() => navigate(`/resources/${r.id}`)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  View
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="text-sm text-red-400 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Modal */}
      {shareTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h2 className="font-semibold text-gray-900 mb-4">
              Share access to <span className="text-indigo-600">{shareTarget.resource_name}</span>
            </h2>

            {shareLink ? (
              <div>
                <p className="text-sm text-gray-600 mb-2">Access link generated:</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 break-all mb-4">
                  {shareLink}
                </div>
                <a
                  href={shareLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 mb-2 text-center"
                >
                  Open Link
                </a>
                <button onClick={() => { setShareTarget(null); setShareLink(''); }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 py-1">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleShare} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email</label>
                  <input type="email" required
                    value={shareForm.recipientEmail}
                    onChange={(e) => setShareForm({ ...shareForm, recipientEmail: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expires in (minutes)</label>
                  <input type="number" required min={1}
                    value={shareForm.expiresInMinutes}
                    onChange={(e) => setShareForm({ ...shareForm, expiresInMinutes: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
                  <input type="number" required min={1}
                    value={shareForm.maxUses}
                    onChange={(e) => setShareForm({ ...shareForm, maxUses: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={sharing}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                    {sharing ? 'Creating...' : 'Generate Link'}
                  </button>
                  <button type="button" onClick={() => setShareTarget(null)}
                    className="text-sm text-gray-500 hover:text-gray-700">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
