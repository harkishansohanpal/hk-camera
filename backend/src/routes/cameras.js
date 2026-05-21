const { Router } = require('express');
const { body } = require('express-validator');
const {
  listCameras, createCamera, getCamera, updateCamera,
  deleteCamera, getStreamKey, rotateStreamKey, heartbeat,
} = require('../controllers/cameraController');
const { listRecordings, createRecording } = require('../controllers/recordingController');
const { authenticate, ownCamera, requireNotDemo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadRecording } = require('../config/storage');

const router = Router();
router.use(authenticate);

router.route('/')
  .get(listCameras)
  .post(
    requireNotDemo,
    [
      body('name').trim().notEmpty(),
      body('sensitivity').optional().isInt({ min: 1, max: 100 }),
    ],
    validate,
    createCamera
  );

router.route('/:cameraId')
  .get(ownCamera, getCamera)
  .patch(ownCamera, requireNotDemo, updateCamera)
  .delete(ownCamera, requireNotDemo, deleteCamera);

router.get('/:cameraId/stream-key', ownCamera, getStreamKey);
router.post('/:cameraId/stream-key/rotate', ownCamera, requireNotDemo, rotateStreamKey);
router.post('/:cameraId/heartbeat', ownCamera, heartbeat);

// Recordings sub-resource
router.get('/:cameraId/recordings', ownCamera, listRecordings);
router.post(
  '/:cameraId/recordings',
  ownCamera,
  uploadRecording.single('video'),
  createRecording
);

module.exports = router;
