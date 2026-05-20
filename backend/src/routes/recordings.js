const { Router } = require('express');
const { listAllRecordings, getRecording, deleteRecording, deleteRecordingsBulk } = require('../controllers/recordingController');
const { authenticate, requireNotDemo } = require('../middleware/auth');

const router = Router();
router.use(authenticate);

router.get('/', listAllRecordings);
router.delete('/bulk-delete', requireNotDemo, deleteRecordingsBulk);
router.get('/:recordingId', getRecording);
router.delete('/:recordingId', requireNotDemo, deleteRecording);

module.exports = router;
