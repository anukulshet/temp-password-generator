const express    = require('express');
const { authenticate } = require('../middleware/auth');
const { createToken, listTokens, revoke } = require('../controllers/accessController');

const router = express.Router();

// All access token routes require a valid JWT
router.use(authenticate);

router.post('/',                        createToken);   // Share Access
router.get('/resource/:resourceId',     listTokens);    // List tokens for a resource
router.patch('/:tokenId/revoke',        revoke);        // Revoke a token

module.exports = router;
