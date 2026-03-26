const appCatalog = [
  // Streaming
  { id: 'netflix',    name: 'Netflix',        icon: '🎬', category: 'Streaming',    resourceUrl: 'https://www.netflix.com',         loginUrl: 'https://www.netflix.com/login',         usernameField: 'userLoginId', passwordField: 'password' },
  { id: 'disney',     name: 'Disney+',        icon: '🏰', category: 'Streaming',    resourceUrl: 'https://www.disneyplus.com',      loginUrl: 'https://www.disneyplus.com/login',      usernameField: 'email',       passwordField: 'password' },
  { id: 'spotify',    name: 'Spotify',        icon: '🎵', category: 'Streaming',    resourceUrl: 'https://www.spotify.com',         loginUrl: 'https://accounts.spotify.com/login',    usernameField: 'username',    passwordField: 'password' },
  { id: 'youtube',    name: 'YouTube Premium',icon: '▶️', category: 'Streaming',    resourceUrl: 'https://www.youtube.com',         loginUrl: 'https://accounts.google.com',           usernameField: 'identifier',  passwordField: 'Passwd' },
  { id: 'prime',      name: 'Prime Video',    icon: '📦', category: 'Streaming',    resourceUrl: 'https://www.primevideo.com',      loginUrl: 'https://www.amazon.com/ap/signin',      usernameField: 'email',       passwordField: 'password' },
  { id: 'hbo',        name: 'HBO Max',        icon: '🎭', category: 'Streaming',    resourceUrl: 'https://www.max.com',             loginUrl: 'https://www.max.com/login',             usernameField: 'email',       passwordField: 'password' },

  // Social
  { id: 'instagram',  name: 'Instagram',      icon: '📷', category: 'Social',       resourceUrl: 'https://www.instagram.com',       loginUrl: 'https://www.instagram.com/accounts/login/', usernameField: 'username', passwordField: 'password' },
  { id: 'facebook',   name: 'Facebook',       icon: '👤', category: 'Social',       resourceUrl: 'https://www.facebook.com',        loginUrl: 'https://www.facebook.com/login',        usernameField: 'email',       passwordField: 'pass' },
  { id: 'twitter',    name: 'X (Twitter)',     icon: '🐦', category: 'Social',       resourceUrl: 'https://x.com',                  loginUrl: 'https://x.com/i/flow/login',            usernameField: 'text',        passwordField: 'password' },
  { id: 'linkedin',   name: 'LinkedIn',       icon: '💼', category: 'Social',       resourceUrl: 'https://www.linkedin.com',        loginUrl: 'https://www.linkedin.com/login',        usernameField: 'session_key', passwordField: 'session_password' },

  // Productivity
  { id: 'notion',     name: 'Notion',         icon: '📝', category: 'Productivity', resourceUrl: 'https://www.notion.so',           loginUrl: 'https://www.notion.so/login',           usernameField: 'email',       passwordField: 'password' },
  { id: 'slack',      name: 'Slack',          icon: '💬', category: 'Productivity', resourceUrl: 'https://slack.com',               loginUrl: 'https://slack.com/signin',              usernameField: 'email',       passwordField: 'password' },
  { id: 'trello',     name: 'Trello',         icon: '📋', category: 'Productivity', resourceUrl: 'https://trello.com',              loginUrl: 'https://trello.com/login',              usernameField: 'user',        passwordField: 'password' },
  { id: 'canva',      name: 'Canva',          icon: '🎨', category: 'Productivity', resourceUrl: 'https://www.canva.com',           loginUrl: 'https://www.canva.com/login',           usernameField: 'email',       passwordField: 'password' },
  { id: 'zoom',       name: 'Zoom',           icon: '📹', category: 'Productivity', resourceUrl: 'https://zoom.us',                loginUrl: 'https://zoom.us/signin',                usernameField: 'email',       passwordField: 'password' },
  { id: 'dropbox',    name: 'Dropbox',        icon: '📁', category: 'Productivity', resourceUrl: 'https://www.dropbox.com',         loginUrl: 'https://www.dropbox.com/login',         usernameField: 'login_email', passwordField: 'login_password' },

  // Dev Tools
  { id: 'github',     name: 'GitHub',         icon: '🐙', category: 'Dev Tools',    resourceUrl: 'https://github.com',              loginUrl: 'https://github.com/login',              usernameField: 'login',       passwordField: 'password' },
  { id: 'vercel',     name: 'Vercel',         icon: '▲',  category: 'Dev Tools',    resourceUrl: 'https://vercel.com',              loginUrl: 'https://vercel.com/login',              usernameField: 'email',       passwordField: 'password' },
  { id: 'figma',      name: 'Figma',          icon: '🖌️', category: 'Dev Tools',    resourceUrl: 'https://www.figma.com',           loginUrl: 'https://www.figma.com/login',           usernameField: 'email',       passwordField: 'password' },
];

export const searchApps = (query) => {
  if (!query) return appCatalog;
  const q = query.toLowerCase();
  return appCatalog.filter((app) =>
    app.name.toLowerCase().includes(q) || app.category.toLowerCase().includes(q),
  );
};

export default appCatalog;
