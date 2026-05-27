const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// ── Local storage engine ──────────────────────────────────────
const localStorage = (destDir) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.resolve(destDir);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  });

// ── S3 client (Cloudflare R2) ─────────────────────────────────
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
});

// ── Upload a buffer / stream to S3 ───────────────────────────
async function uploadToS3(key, body, contentType) {
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return `https://${process.env.S3_BUCKET}.${process.env.R2_ENDPOINT.replace(/^https?:\/\//, '')}/${key}`;
}

// ── Delete from S3 ────────────────────────────────────────────
async function deleteFromS3(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
}

// ── Presigned URL (for direct browser download) ───────────────
async function getPresignedUrl(key, expiresInSeconds = 3600) {
  const command = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

// ── Multer middleware factories ───────────────────────────────
const uploadImage = multer({
  storage: localStorage(process.env.LOCAL_UPLOAD_DIR || './uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

const uploadRecording = multer({
  storage: localStorage(process.env.LOCAL_RECORDING_DIR || './recordings'),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (req, file, cb) => {
    const mimetype = file.mimetype?.split(';')[0].trim();
    if (mimetype?.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files are allowed'), false);
  },
});

module.exports = { uploadImage, uploadRecording, uploadToS3, deleteFromS3, getPresignedUrl };
