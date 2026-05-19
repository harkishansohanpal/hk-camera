const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { detectLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { detect } = require('../ml/detect');
const logger = require('../config/logger');

const router = Router();
router.use(authenticate);
router.use(detectLimiter);

router.post(
  '/',
  [
    body('image').isString().withMessage('image must be a base64 string'),
    body('width').optional().isInt({ min: 1 }),
    body('height').optional().isInt({ min: 1 }),
    body('confidenceThreshold').optional().isFloat({ min: 1, max: 100 }),
  ],
  validate,
  async (req, res) => {
    try {
      const {
        image,
        width: imgWidth = 640,
        height: imgHeight = 480,
        confidenceThreshold = 80,
      } = req.body;

      const buffer = Buffer.from(image, 'base64');
      const detections = await detect(buffer, {
        confidenceThreshold,
        imgWidth,
        imgHeight,
      });

      res.json({
        success: true,
        data: {
          detections,
          count: detections.length,
          interestingCount: detections.filter((d) => d.interesting).length,
        },
      });
    } catch (err) {
      logger.error('Detection failed', { error: err.message });
      res.status(500).json({ success: false, message: 'Detection failed' });
    }
  }
);

module.exports = router;
