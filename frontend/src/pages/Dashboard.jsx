import { useEffect, useState } from 'react';
import { getResources, getResource, createResource, updateResource, deleteResource, createAccessToken, regenerateTempCredentials } from '../services/api';
import appCatalog, { searchApps } from '../data/appCatalog';

const emptyForm = { resourceName: '', resourceUrl: '', username: '', password: '', loginUrl: '', usernameField: 'email', passwordField: 'password' };

const Dashboard = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Resource form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // App catalog search
  const [appSearch, setAppSearch] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);

  // Expanded resource detail
  const [expanded, setExpanded] = useState(null); // full resource with credentials

  // Share modal
  const [shareTarget, setShareTarget] = useState(null);
  const [shareForm, setShareForm] = useState({ recipientEmail: '', expiresInMinutes: 60, maxUses: 1 });
  const [shareLink, setShareLink] = useState('');
  const [sharing, setSharing] = useState(false);

  useEffect(() => { fetchResources(); }, []);

  const fetchResources = async () => {
    try {
      const { data } = await getResources();
      setResources(data.resources);
    } catch { setError('Failed to load resources'); }
    finally { setLoading(false); }
  };

  const selectApp = (app) => {
    setForm({
      ...form,
      resourceName:  app.name,
      resourceUrl:   app.resourceUrl,
      loginUrl:      app.loginUrl,
      usernameField: app.usernameField,
      passwordField: app.passwordField,
    });
    setShowCatalog(false);
    setAppSearch('');
  };

  const openNewForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = async (id) => {
    try {
      const { data } = await getResource(id);
      const r = data.resource;
      setForm({
        resourceName:  r.resourceName,
        resourceUrl:   r.resourceUrl,
        username:      r.username,
        password:      r.password,
        loginUrl:      r.loginUrl || '',
        usernameField: r.usernameField || 'email',
        passwordField: r.passwordField || 'password',
      });
      setEditingId(id);
      setShowForm(true);
    } catch { setError('Failed to load resource for editing'); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingId) {
        await updateResource(editingId, form);
      } else {
        await createResource(form);
      }
      setForm({ ...emptyForm });
      setEditingId(null);
      setShowForm(false);
      setExpanded(null);
      fetchResources();
    } catch (err) { setError(err.response?.data?.error || 'Failed to save resource'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this resource and all its access tokens?')) return;
    try {
      await deleteResource(id);
      setResources(resources.filter((r) => r.id !== id));
      if (expanded?.id === id) setExpanded(null);
    } catch { setError('Failed to delete resource'); }
  };

  const toggleExpand = async (id) => {
    if (expanded?.id === id) { setExpanded(null); return; }
    try {
      const { data } = await getResource(id);
      setExpanded(data.resource);
    } catch { setError('Failed to load resource details'); }
  };

  const handleRegenerate = async (id) => {
    try {
      const { data } = await regenerateTempCredentials(id);
      setExpanded((prev) => prev ? { ...prev, tempUsername: data.tempUsername, tempPassword: data.tempPassword } : prev);
    } catch { setError('Failed to regenerate'); }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    try {
      setSharing(true);
      const { data } = await createAccessToken({ resourceId: shareTarget.id, ...shareForm });
      setShareLink(data.accessLink);
    } catch (err) { setError(err.response?.data?.error || 'Failed to create access token'); }
    finally { setSharing(false); }
  };

  const copyText = (text) => navigator.clipboard.writeText(text);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  const filteredApps = searchApps(appSearch);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Resources</h1>
        <button onClick={openNewForm}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          + Add Resource
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4 flex justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">x</button>
        </div>
      )}

      {/* ── Resource Form ── */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-800">{editingId ? 'Edit Resource' : 'New Resource'}</h2>

          {/* App catalog selector */}
          {!editingId && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select an app or enter custom</label>
              <input
                type="text"
                placeholder="Search Netflix, GitHub, Spotify..."
                value={appSearch}
                onChange={(e) => { setAppSearch(e.target.value); setShowCatalog(true); }}
                onFocus={() => setShowCatalog(true)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {showCatalog && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredApps.map((app) => (
                    <button key={app.id} type="button" onClick={() => selectApp(app)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 flex items-center gap-3 border-b border-gray-50">
                      <span className="text-lg">{app.icon}</span>
                      <div>
                        <span className="font-medium text-gray-800">{app.name}</span>
                        <span className="text-xs text-gray-400 ml-2">{app.category}</span>
                      </div>
                    </button>
                  ))}
                  <button type="button" onClick={() => setShowCatalog(false)}
                    className="w-full text-left px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 font-medium">
                    Enter custom resource...
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Core fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resource Name</label>
              <input type="text" required value={form.resourceName}
                onChange={(e) => setForm({ ...form, resourceName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resource URL</label>
              <input type="text" required value={form.resourceUrl}
                onChange={(e) => setForm({ ...form, resourceUrl: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Original credentials */}
          <div className="border border-indigo-100 bg-indigo-50/30 rounded-lg p-4">
            <p className="text-xs font-semibold text-indigo-600 mb-3">YOUR ORIGINAL CREDENTIALS</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username / Email</label>
                <input type="text" required value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" required value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">These are encrypted and never shown to recipients.</p>
          </div>

          <p className="text-xs text-gray-400">Temporary credentials are auto-generated after saving.</p>

          {/* Advanced (collapsed) */}
          <details className="text-sm">
            <summary className="text-gray-400 cursor-pointer hover:text-gray-600 text-xs">Advanced: auto-login settings</summary>
            <div className="mt-3 space-y-3">
              {[
                { field: 'loginUrl',      label: 'Login Form URL',     placeholder: 'https://site.com/login' },
                { field: 'usernameField', label: 'Username Field Name', placeholder: 'email' },
                { field: 'passwordField', label: 'Password Field Name', placeholder: 'password' },
              ].map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type="text" placeholder={placeholder} value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
            </div>
          </details>

          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Update Resource' : 'Save Resource'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
              className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </form>
      )}

      {/* ── Resource List ── */}
      {resources.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No resources yet. Add one to get started.</div>
      ) : (
        <div className="space-y-3">
          {resources.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Card header */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="cursor-pointer" onClick={() => toggleExpand(r.id)}>
                  <p className="font-medium text-gray-900">{r.resource_name}</p>
                  <p className="text-sm text-gray-400">{r.resource_url}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShareTarget(r); setShareLink(''); }}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Share Access</button>
                  <button onClick={() => toggleExpand(r.id)}
                    className="text-sm text-gray-500 hover:text-gray-700">
                    {expanded?.id === r.id ? 'Collapse' : 'View'}
                  </button>
                  <button onClick={() => openEditForm(r.id)}
                    className="text-sm text-amber-500 hover:text-amber-700">Edit</button>
                  <button onClick={() => handleDelete(r.id)}
                    className="text-sm text-red-400 hover:text-red-600">Delete</button>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded?.id === r.id && (
                <div className="border-t border-gray-100 px-6 py-5 bg-gray-50/50 space-y-4">
                  {/* Original credentials */}
                  <div>
                    <p className="text-xs font-semibold text-indigo-600 mb-2">ORIGINAL CREDENTIALS</p>
                    <div className="grid grid-cols-2 gap-3">
                      <CredField label="Username" value={expanded.username} />
                      <CredField label="Password" value={expanded.password} />
                    </div>
                  </div>

                  {/* Temp credentials */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-emerald-600">TEMPORARY CREDENTIALS</p>
                      <button onClick={() => handleRegenerate(r.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Regenerate</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <CredField label="Temp Username" value={expanded.tempUsername} />
                      <CredField label="Temp Password" value={expanded.tempPassword} />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">These are shared with recipients. Your real credentials are never exposed.</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Share Modal ── */}
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
                <a href={shareLink} target="_blank" rel="noopener noreferrer"
                  className="block w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 mb-2 text-center">
                  Open Link
                </a>
                <button onClick={() => { setShareTarget(null); setShareLink(''); }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 py-1">Close</button>
              </div>
            ) : (
              <form onSubmit={handleShare} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email</label>
                  <input type="email" required value={shareForm.recipientEmail}
                    onChange={(e) => setShareForm({ ...shareForm, recipientEmail: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expires in (minutes)</label>
                  <input type="number" required min={1} value={shareForm.expiresInMinutes}
                    onChange={(e) => setShareForm({ ...shareForm, expiresInMinutes: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
                  <input type="number" required min={1} value={shareForm.maxUses}
                    onChange={(e) => setShareForm({ ...shareForm, maxUses: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={sharing}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                    {sharing ? 'Creating...' : 'Generate Link'}
                  </button>
                  <button type="button" onClick={() => setShareTarget(null)}
                    className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Small helper component for credential display
const CredField = ({ label, value }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm font-mono text-gray-800 truncate">{value}</p>
      </div>
      <button onClick={copy} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium ml-3 shrink-0">
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
};

export default Dashboard;
