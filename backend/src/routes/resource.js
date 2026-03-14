const express    = require('express');
const { authenticate } = require('../middleware/auth');
const { createResource, listResources, getResource, deleteResource } = require('../controllers/resourceController');

const router = express.Router();

// All resource routes require a valid JWT
router.use(authenticate);

router.post('/',        createResource);
router.get('/',         listResources);
router.get('/:id',      getResource);
router.delete('/:id',   deleteResource);

module.exports = router;
