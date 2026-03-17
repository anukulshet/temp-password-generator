/**
 * resourceController.js — Save, list, and delete encrypted resources
 *
 * All credential data is AES-256 encrypted with the user's derived key
 * before being stored. The server never sees plaintext passwords.
 */

const { query }            = require('../config/database');
const { encrypt, decrypt } = require('../services/encryption');

// ── Create ────────────────────────────────────────────────────────────────────

const createResource = async (req, res) => {
  try {
    const { resourceName, resourceUrl, username, password, loginUrl, usernameField, passwordField } = req.body;

    if (!resourceName || !resourceUrl || !username || !password) {
      return res.status(400).json({ error: 'resourceName, resourceUrl, username and password are required' });
    }

    // Encrypt credentials using the key from the JWT (attached by auth middleware)
    const encryptedData = await encrypt(
      JSON.stringify({ username, password }),
      req.encKey,
    );

    const { rows } = await query(
      `INSERT INTO resources (owner_id, resource_name, resource_url, encrypted_data, login_url, username_field, password_field)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, resource_name, resource_url, created_at`,
      [req.userId, resourceName, resourceUrl, encryptedData, loginUrl || null, usernameField || 'email', passwordField || 'password'],
    );

    return res.status(201).json({ resource: rows[0] });
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

    // Return metadata only — credentials are never sent in list view
    return res.json({ resources: rows });
  } catch (err) {
    console.error('listResources error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Get single (with decrypted credentials for admin preview) ─────────────────

const getResource = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, resource_name, resource_url, encrypted_data, created_at
       FROM resources
       WHERE id = $1 AND owner_id = $2`,
      [req.params.id, req.userId],
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const resource = rows[0];

    // Decrypt only when the owner explicitly requests a single resource
    const { username, password } = JSON.parse(
      await decrypt(resource.encrypted_data, req.encKey),
    );

    return res.json({
      resource: {
        id:           resource.id,
        resourceName: resource.resource_name,
        resourceUrl:  resource.resource_url,
        username,
        password,
        createdAt:    resource.created_at,
      },
    });
  } catch (err) {
    console.error('getResource error:', err);
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

module.exports = { createResource, listResources, getResource, deleteResource };
