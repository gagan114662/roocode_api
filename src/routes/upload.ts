import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const { projectId } = req.params;
    const destDir = path.join(process.cwd(), 'workspaces', projectId, 'uploads');
    await fs.mkdir(destDir, { recursive: true });
    cb(null, destDir);
  },
  filename: (_req, file, cb) => {
    // Create unique filename with timestamp
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  }
});

/**
 * Upload image for a project
 */
router.post('/projects/:projectId/upload-image',
  upload.array('images', 5), // Allow up to 5 images
  async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files?.length) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      // Process uploaded files
      const uploads = files.map(file => ({
        projectId,
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      }));

      // Create metadata file
      const metadataPath = path.join(
        process.cwd(),
        'workspaces',
        projectId,
        'uploads',
        'metadata.json'
      );

      const existingMetadata = await fs.readFile(metadataPath, 'utf-8')
        .then(data => JSON.parse(data))
        .catch(() => ({ uploads: [] }));

      await fs.writeFile(
        metadataPath,
        JSON.stringify({
          ...existingMetadata,
          uploads: [
            ...existingMetadata.uploads,
            ...uploads.map(u => ({
              ...u,
              timestamp: new Date().toISOString()
            }))
          ]
        }, null, 2)
      );

      res.json({
        projectId,
        uploads,
        metadata: {
          timestamp: new Date().toISOString(),
          totalFiles: uploads.length,
          totalSize: uploads.reduce((sum, file) => sum + file.size, 0)
        }
      });
    } catch (err) {
      // Clean up uploaded files on error
      if (req.files) {
        const files = Array.isArray(req.files) ? req.files : [req.files];
        await Promise.all(
          files.map(file =>
            fs.unlink(file.path).catch(() => {})
          )
        );
      }
      next(err);
    }
  }
);

/**
 * Get project image metadata
 */
router.get('/projects/:projectId/images', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const metadataPath = path.join(
      process.cwd(),
      'workspaces',
      projectId,
      'uploads',
      'metadata.json'
    );

    const metadata = await fs.readFile(metadataPath, 'utf-8')
      .then(data => JSON.parse(data))
      .catch(() => ({ uploads: [] }));

    res.json({
      projectId,
      images: metadata.uploads,
      metadata: {
        totalFiles: metadata.uploads.length,
        totalSize: metadata.uploads.reduce((sum, file) => sum + file.size, 0)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Delete project image
 */
router.delete('/projects/:projectId/images/:filename', async (req, res, next) => {
  try {
    const { projectId, filename } = req.params;
    const filePath = path.join(
      process.cwd(),
      'workspaces',
      projectId,
      'uploads',
      filename
    );

    await fs.unlink(filePath);

    // Update metadata
    const metadataPath = path.join(
      process.cwd(),
      'workspaces',
      projectId,
      'uploads',
      'metadata.json'
    );

    const metadata = await fs.readFile(metadataPath, 'utf-8')
      .then(data => JSON.parse(data))
      .catch(() => ({ uploads: [] }));

    metadata.uploads = metadata.uploads.filter(u => u.filename !== filename);

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    res.json({
      projectId,
      filename,
      deleted: true,
      metadata: {
        timestamp: new Date().toISOString(),
        remainingFiles: metadata.uploads.length
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
