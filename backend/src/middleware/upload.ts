import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { logger } from '../utils/logger';
import databaseFileStorageService from '../services/storage/databaseFileStorageService';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
const photosDir = path.join(uploadsDir, 'photos');
const documentsDir = path.join(uploadsDir, 'documents');

// Ensure directories exist
[uploadsDir, photosDir, documentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
});

// Use memory storage instead of disk storage for database integration
const memoryStorage = multer.memoryStorage();

// File filter for photos
const photoFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type for photo: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`));
  }
};

// File filter for documents
const documentFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type for document: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`));
  }
};

// Photo upload configuration
export const photoUpload = multer({
  storage: memoryStorage,
  fileFilter: photoFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for photos
    files: 20, // Maximum 20 files per request
  },
});

// Document upload configuration
export const documentUpload = multer({
  storage: memoryStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for documents
    files: 10, // Maximum 10 files per request
  },
});

// Error handler for multer
export const handleMulterError = (err: any, req: Request, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          error: 'File too large',
          message: 'The uploaded file exceeds the maximum allowed size',
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: 'Too many files',
          message: 'The number of uploaded files exceeds the maximum allowed',
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: 'Unexpected field',
          message: 'An unexpected field was encountered during upload',
        });
      default:
        return res.status(400).json({
          error: 'Upload error',
          message: err.message || 'An error occurred during file upload',
        });
    }
  } else if (err) {
    return res.status(400).json({
      error: 'Upload error',
      message: err.message || 'An error occurred during file upload',
    });
  }
  
  next();
};

// Helper function to get file URL for database-stored files
export const getFileUrl = (fileId: string, type: 'photo' | 'document'): string => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:4001';
  return type === 'photo' 
    ? `${baseUrl}/api/files/photos/${fileId}` 
    : `${baseUrl}/api/files/documents/${fileId}`;
};

// Helper function to delete file from database
export const deleteFile = async (fileId: string, type: 'photo' | 'document'): Promise<void> => {
  try {
    if (type === 'photo') {
      await databaseFileStorageService.deletePhoto(fileId);
    } else {
      await databaseFileStorageService.deleteDocument(fileId);
    }
    logger.info(`Deleted ${type} from database: ${fileId}`);
  } catch (error) {
    logger.error(`Failed to delete ${type} from database: ${fileId}`, error);
    throw error;
  }
};

// Helper function to get file info for memory storage
export const getFileInfo = (file: Express.Multer.File) => {
  return {
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    buffer: file.buffer, // Available with memory storage
  };
};

// Helper function to store document in database
export const storeDocument = async (
  villaId: string,
  file: Express.Multer.File,
  documentType: string,
  description?: string
) => {
  if (!file.buffer) {
    throw new Error('File buffer is required for database storage');
  }

  return await databaseFileStorageService.storeDocument(
    villaId,
    file.buffer,
    file.originalname,
    file.mimetype,
    documentType,
    description
  );
};

// Helper function to store photo in database  
export const storePhoto = async (
  villaId: string,
  file: Express.Multer.File,
  category: string,
  options: {
    caption?: string;
    altText?: string;
    isMain?: boolean;
    subfolder?: string;
  } = {}
) => {
  if (!file.buffer) {
    throw new Error('File buffer is required for database storage');
  }

  return await databaseFileStorageService.storePhoto(
    villaId,
    file.buffer,
    file.originalname,
    file.mimetype,
    category,
    options
  );
};