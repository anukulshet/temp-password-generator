/**
 * resourceController.js — Save, list, get, update, delete encrypted resources
 *
 * Credentials stored as AES-256 encrypted JSON:
 * { username, password, tempUsername, tempPassword }
 */

const { query }            = require('../config/database');
const { encrypt, decrypt, generateTempCredentials } = require('../services/encryption');

// ── Create ────────────────────────────────────────────────────────────────────

const createResource = async (req, res) => {
  try {
    const { resourceName, resourceUrl, username, password, loginUrl, usernameField, passwordField } = req.body;

    if (!resourceName || !resourceUrl || !username || !password) {
      return res.status(400).json({ error: 'resourceName, resourceUrl, username and password are required' });
    }

    // Auto-generate temporary credentials
    const { tempUsername, tempPassword } = await generateTempCredentials();

    const encryptedData = await encrypt(
      JSON.stringify({ username, password, tempUsername, tempPassword }),
      req.encKey,
    );

    const { rows } = await query(
      `INSERT INTO resources (owner_id, resource_name, resource_url, encrypted_data, login_url, username_field, password_field)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, resource_name, resource_url, created_at`,
      [req.userId, resourceName, resourceUrl, encryptedData, loginUrl || null, usernameField || 'email', passwordField || 'password'],
    );

    return res.status(201).json({
      resource: rows[0],
      tempUsername,
      tempPassword,
    });
  } catch (err) {
    console.error('createResource error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── List ──────────────────────────────────────────────────────────────────────

const listResources = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, resource_name, resource_url, created_at
       FROM resources
       WHERE owner_id = $1
       ORDER BY created_at DESC`,
      [req.userId],
    );

    return res.json({ resources: rows });
  } catch (err) {
    console.error('listResources error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Get single (with decrypted credentials) ──────────────────────────────────

const getResource = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, resource_name, resource_url, encrypted_data, login_url, username_field, password_field, created_at
       FROM resources
       WHERE id = $1 AND owner_id = $2`,
      [req.params.id, req.userId],
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const resource = rows[0];
    const decrypted = JSON.parse(await decrypt(resource.encrypted_data, req.encKey));

    // Backfill temp credentials for resources created before this feature
    if (!decrypted.tempUsername || !decrypted.tempPassword) {
      const { tempUsername, tempPassword } = await generateTempCredentials();
      decrypted.tempUsername = tempUsername;
      decrypted.tempPassword = tempPassword;

      const reEncrypted = await encrypt(JSON.stringify(decrypted), req.encKey);
      await query('UPDATE resources SET encrypted_data = $1 WHERE id = $2', [reEncrypted, resource.id]);
    }

    return res.json({
      resource: {
        id:            resource.id,
        resourceName:  resource.resource_name,
        resourceUrl:   resource.resource_url,
        loginUrl:      resource.login_url,
        usernameField: resource.username_field,
        passwordField: resource.password_field,
        username:      decrypted.username,
        password:      decrypted.password,
        tempUsername:   decrypted.tempUsername,
        tempPassword:  decrypted.tempPassword,
        createdAt:     resource.created_at,
      },
    });
  } catch (err) {
    console.error('getResource error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Update ────────────────────────────────────────────────────────────────────

const updateResource = async (req, res) => {
  try {
    const { resourceName, resourceUrl, username, password, loginUrl, usernameField, passwordField } = req.body;

    if (!resourceName || !resourceUrl || !username || !password) {
      return res.status(400).json({ error: 'resourceName, resourceUrl, username and password are required' });
    }

    // Fetch existing to preserve temp credentials
    const { rows: existing } = await query(
      'SELECT encrypted_data FROM resources WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.userId],
    );

    if (!existing.length) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    let tempUsername, tempPassword;
    try {
      const old = JSON.parse(await decrypt(existing[0].encrypted_data, req.encKey));
      tempUsername = old.tempUsername;
      tempPassword = old.tempPassword;
    } catch {
      // Can't decrypt old — generate fresh
    }

    if (!tempUsername || !tempPassword) {
      const fresh = await generateTempCredentials();
      tempUsername = fresh.tempUsername;
      tempPassword = fresh.tempPassword;
    }

    const encryptedData = await encrypt(
      JSON.stringify({ username, password, tempUsername, tempPassword }),
      req.encKey,
    );

    const { rows } = await query(
      `UPDATE resources
       SET resource_name = $1, resource_url = $2, encrypted_data = $3,
           login_url = $4, username_field = $5, password_field = $6
       WHERE id = $7 AND owner_id = $8
       RETURNING id, resource_name, resource_url, created_at`,
      [resourceName, resourceUrl, encryptedData, loginUrl || null, usernameField || 'email', passwordField || 'password', req.params.id, req.userId],
    );

    return res.json({ resource: rows[0] });
  } catch (err) {
    console.error('updateResource error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Regenerate temp credentials ───────────────────────────────────────────────

const regenerateTemp = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT encrypted_data FROM resources WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.userId],
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const decrypted = JSON.parse(await decrypt(rows[0].encrypted_data, req.encKey));
    const { tempUsername, tempPassword } = await generateTempCredentials();

    decrypted.tempUsername = tempUsername;
    decrypted.tempPassword = tempPassword;

    const reEncrypted = await encrypt(JSON.stringify(decrypted), req.encKey);
    await query('UPDATE resources SET encrypted_data = $1 WHERE id = $2', [reEncrypted, req.params.id]);

    return res.json({ tempUsername, tempPassword });
  } catch (err) {
    console.error('regenerateTemp error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Delete ────────────────────────────────────────────────────────────────────

const deleteResource = async (req, res) => {
  try {
    const { rows } = await query(
      `DELETE FROM resources
       WHERE id = $1 AND owner_id = $2
       RETURNING id`,
      [req.params.id, req.userId],
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    return res.json({ message: 'Resource deleted' });
  } catch (err) {
    console.error('deleteResource error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { createResource, listResources, getResource, updateResource, regenerateTemp, deleteResource };
