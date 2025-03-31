import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { randomBytes } from 'crypto';

// Make sure upload directory exists
const uploadDir = path.resolve('./uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename with the original extension
    const uniqueSuffix = `${Date.now()}-${randomBytes(8).toString('hex')}`;
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${extension}`);
  }
});

// Configure file filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'));
  }
};

// Export the upload middleware with size limits
export const uploadConfig = {
  profilePhoto: multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    }
  }),
  organizationLogo: multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    }
  })
};

// Function to get the URL for an uploaded file
export function getFileUrl(filename: string): string {
  return `/uploads/${filename}`;
}