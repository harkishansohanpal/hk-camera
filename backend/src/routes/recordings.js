const { Router } = require('express');
const { listAllRecordings, getRecording, deleteRecording, deleteRecordingsBulk } = require('../controllers/recordingController');
const { authenticate } = require('../middleware/auth');

const router = Router();
router.use(authenticate);

router.get('/', listAllRecordings);
router.delete('/bulk-delete', deleteRecordingsBulk);
router.get('/:recordingId', getRecording);
router.delete('/:recordingId', deleteRecording);

module.exports = router;
