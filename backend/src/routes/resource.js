const express    = require('express');
const { authenticate } = require('../middleware/auth');
const { createResource, listResources, getResource, updateResource, regenerateTemp, deleteResource } = require('../controllers/resourceController');

const router = express.Router();

router.use(authenticate);

router.post('/',                     createResource);
router.get('/',                      listResources);
router.get('/:id',                   getResource);
router.put('/:id',                   updateResource);
router.post('/:id/regenerate-temp',  regenerateTemp);
router.delete('/:id',                deleteResource);

module.exports = router;
