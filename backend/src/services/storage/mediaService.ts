import { PrismaClient, Photo, Document } from '@prisma/client';
import sharp from 'sharp';
import { logger } from '../../utils/logger';
import sharePointService from '../integrations/sharePointService';

const prisma = new PrismaClient();

export interface MediaUploadOptions {
  villaId: string;
  category: string;
  subfolder?: string;
  tags?: string[];
  caption?: string;
  altText?: string;
  generateThumbnail?: boolean;
  thumbnailSize?: { width: number; height: number };
  quality?: number;
}

export interface PhotoUploadResult {
  id: string;
  fileName: string;
  fileUrl: string;
  thumbnailUrl?: string;
  sharePointUrl?: string;
  sharePointFileId?: string;
  tags: string[];
  category: string;
  subfolder?: string;
}

export interface DocumentUploadResult {
  id: string;
  fileName: string;
  fileUrl: string;
  sharePointUrl?: string;
  sharePointFileId?: string;
  documentType: string;
}

class MediaService {
  private readonly THUMBNAIL_DEFAULTS = {
    width: 300,
    height: 200,
    quality: 80
  };

  private readonly SUPPORTED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp'
  ];

  private readonly SUPPORTED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  /**
   * Generate a thumbnail from image buffer
   */
  private async generateThumbnail(
    imageBuffer: Buffer,
    options: { width: number; height: number; quality: number }
  ): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .resize(options.width, options.height, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: options.quality })
        .toBuffer();
    } catch (error) {
      logger.error('Failed to generate thumbnail:', error);
      throw error;
    }
  }

  /**
   * Upload photo with thumbnail generation and SharePoint sync
   */
  async uploadPhoto(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    options: MediaUploadOptions
  ): Promise<PhotoUploadResult> {
    const startTime = Date.now();
    
    try {
      // Validate file type
      if (!this.SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
        throw new Error(`Unsupported image type: ${mimeType}`);
      }

      logger.info(`[MEDIA] Starting photo upload: ${fileName}`, {
        villaId: options.villaId,
        category: options.category,
        size: fileBuffer.length
      });

      // Generate thumbnail
      const thumbnailOptions = {
        width: options.thumbnailSize?.width || this.THUMBNAIL_DEFAULTS.width,
        height: options.thumbnailSize?.height || this.THUMBNAIL_DEFAULTS.height,
        quality: options.quality || this.THUMBNAIL_DEFAULTS.quality
      };

      const thumbnailBuffer = options.generateThumbnail !== false 
        ? await this.generateThumbnail(fileBuffer, thumbnailOptions)
        : null;

      // Get image metadata
      const metadata = await sharp(fileBuffer).metadata();
      
      // Upload to SharePoint (async)
      let sharePointResult = null;
      try {
        const sharePointStatus = sharePointService.getStatus();
        if (sharePointStatus.enabled) {
          const sharePointPath = this.getSharePointPath('photos', options.category, options.subfolder);
          sharePointResult = await sharePointService.uploadFile(
            fileBuffer,
            fileName,
            sharePointPath,
            options.villaId,
            mimeType
          );
          
          logger.info(`[MEDIA] SharePoint upload successful: ${fileName}`, {
            sharePointId: sharePointResult?.fileId,
            sharePointUrl: sharePointResult?.fileUrl
          });
        } else {
          logger.warn('[MEDIA] SharePoint integration disabled, skipping upload');
        }
      } catch (sharePointError) {
        logger.warn(`[MEDIA] SharePoint upload failed for ${fileName}:`, sharePointError);
        // Continue with database storage even if SharePoint fails
      }

      // Create photo record in database
      const photo = await prisma.photo.create({
        data: {
          villaId: options.villaId,
          fileName,
          fileUrl: `database://${options.villaId}/photos/`,
          thumbnailUrl: thumbnailBuffer ? `database://${options.villaId}/photos/thumbnails/` : null,
          fileSize: fileBuffer.length,
          mimeType,
          width: metadata.width || null,
          height: metadata.height || null,
          caption: options.caption || null,
          altText: options.altText || fileName,
          tags: options.tags || [],
          category: options.category as any,
          subfolder: options.subfolder || null,
          sharePointFileId: sharePointResult?.fileId || null,
          sharePointPath: sharePointResult?.filePath || null,
          fileContent: fileBuffer,
          thumbnailContent: thumbnailBuffer,
          isCompressed: !!thumbnailBuffer,
          originalFileSize: fileBuffer.length,
          storageLocation: 'database'
        }
      });

      const duration = Date.now() - startTime;
      logger.info(`[MEDIA] Photo upload completed: ${fileName}`, {
        photoId: photo.id,
        duration,
        hasSharePoint: !!sharePointResult,
        hasThumbnail: !!thumbnailBuffer
      });

      return {
        id: photo.id,
        fileName: photo.fileName,
        fileUrl: `/api/photos/public/${photo.id}`,
        thumbnailUrl: thumbnailBuffer ? `/api/photos/thumbnail/${photo.id}` : undefined,
        sharePointUrl: photo.sharePointPath || undefined,
        sharePointFileId: photo.sharePointFileId || undefined,
        tags: photo.tags,
        category: photo.category,
        subfolder: photo.subfolder || undefined
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`[MEDIA] Photo upload failed: ${fileName}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        villaId: options.villaId
      });
      throw error;
    }
  }

  /**
   * Upload document with SharePoint sync
   */
  async uploadDocument(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    documentType: string,
    villaId: string
  ): Promise<DocumentUploadResult> {
    const startTime = Date.now();
    
    try {
      // Validate file type
      if (!this.SUPPORTED_DOCUMENT_TYPES.includes(mimeType)) {
        throw new Error(`Unsupported document type: ${mimeType}`);
      }

      logger.info(`[MEDIA] Starting document upload: ${fileName}`, {
        villaId,
        documentType,
        size: fileBuffer.length
      });

      // Upload to SharePoint (async)
      let sharePointResult = null;
      try {
        const sharePointStatus = sharePointService.getStatus();
        if (sharePointStatus.enabled) {
          const sharePointPath = this.getSharePointPath('documents', documentType);
          sharePointResult = await sharePointService.uploadFile(
            fileBuffer,
            fileName,
            sharePointPath,
            villaId,
            mimeType
          );
          
          logger.info(`[MEDIA] SharePoint upload successful: ${fileName}`, {
            sharePointId: sharePointResult?.fileId,
            sharePointUrl: sharePointResult?.fileUrl
          });
        } else {
          logger.warn('[MEDIA] SharePoint integration disabled, skipping upload');
        }
      } catch (sharePointError) {
        logger.warn(`[MEDIA] SharePoint upload failed for ${fileName}:`, sharePointError);
        // Continue with database storage even if SharePoint fails
      }

      // Create document record in database
      const document = await prisma.document.create({
        data: {
          villaId,
          fileName,
          fileUrl: `database://${villaId}/documents/`,
          fileSize: fileBuffer.length,
          mimeType,
          documentType: documentType as any,
          sharePointFileId: sharePointResult?.fileId || null,
          sharePointPath: sharePointResult?.filePath || null,
          fileContent: fileBuffer,
          storageLocation: 'database'
        }
      });

      const duration = Date.now() - startTime;
      logger.info(`[MEDIA] Document upload completed: ${fileName}`, {
        documentId: document.id,
        duration,
        hasSharePoint: !!sharePointResult
      });

      return {
        id: document.id,
        fileName: document.fileName,
        fileUrl: `/api/documents/public/${document.id}`,
        sharePointUrl: document.sharePointPath || undefined,
        sharePointFileId: document.sharePointFileId || undefined,
        documentType: document.documentType
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`[MEDIA] Document upload failed: ${fileName}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        villaId
      });
      throw error;
    }
  }

  /**
   * Get photos for a villa with thumbnails and metadata
   */
  async getVillaPhotos(villaId: string, category?: string): Promise<PhotoUploadResult[]> {
    try {
      const photos = await prisma.photo.findMany({
        where: {
          villaId,
          ...(category && { category: category as any })
        },
        orderBy: [
          { category: 'asc' },
          { subfolder: 'asc' },
          { sortOrder: 'asc' },
          { createdAt: 'asc' }
        ]
      });

      return photos.map(photo => ({
        id: photo.id,
        fileName: photo.fileName,
        fileUrl: `/api/photos/public/${photo.id}`,
        thumbnailUrl: photo.thumbnailContent ? `/api/photos/thumbnail/${photo.id}` : undefined,
        sharePointUrl: photo.sharePointPath || undefined,
        sharePointFileId: photo.sharePointFileId || undefined,
        tags: photo.tags,
        category: photo.category,
        subfolder: photo.subfolder || undefined
      }));

    } catch (error) {
      logger.error(`[MEDIA] Failed to get villa photos:`, { villaId, error });
      throw error;
    }
  }

  /**
   * Get documents for a villa
   */
  async getVillaDocuments(villaId: string, documentType?: string): Promise<DocumentUploadResult[]> {
    try {
      const documents = await prisma.document.findMany({
        where: {
          villaId,
          ...(documentType && { documentType: documentType as any })
        },
        orderBy: [
          { documentType: 'asc' },
          { createdAt: 'asc' }
        ]
      });

      return documents.map(document => ({
        id: document.id,
        fileName: document.fileName,
        fileUrl: `/api/documents/public/${document.id}`,
        sharePointUrl: document.sharePointPath || undefined,
        sharePointFileId: document.sharePointFileId || undefined,
        documentType: document.documentType
      }));

    } catch (error) {
      logger.error(`[MEDIA] Failed to get villa documents:`, { villaId, error });
      throw error;
    }
  }

  /**
   * Get photo by ID with content
   */
  async getPhotoById(photoId: string, includeThumbnail: boolean = false): Promise<Photo | null> {
    try {
      return await prisma.photo.findUnique({
        where: { id: photoId },
        ...(includeThumbnail && {
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            fileContent: true,
            thumbnailContent: true,
            width: true,
            height: true,
            tags: true,
            caption: true,
            altText: true,
            sharePointPath: true,
            createdAt: true,
            updatedAt: true
          }
        })
      });
    } catch (error) {
      logger.error(`[MEDIA] Failed to get photo by ID:`, { photoId, error });
      return null;
    }
  }

  /**
   * Get document by ID with content
   */
  async getDocumentById(documentId: string): Promise<Document | null> {
    try {
      return await prisma.document.findUnique({
        where: { id: documentId }
      });
    } catch (error) {
      logger.error(`[MEDIA] Failed to get document by ID:`, { documentId, error });
      return null;
    }
  }

  /**
   * Delete photo
   */
  async deletePhoto(photoId: string): Promise<boolean> {
    try {
      const photo = await prisma.photo.findUnique({ where: { id: photoId } });
      if (!photo) return false;

      // Delete from SharePoint if exists
      if (photo.sharePointFileId) {
        try {
          // Temporarily disabled - deleteFile method needs to be added to SharePointService
          // await sharePointService.deleteFile(photo.sharePointFileId);
        } catch (sharePointError) {
          logger.warn(`[MEDIA] Failed to delete from SharePoint:`, sharePointError);
          // Continue with database deletion
        }
      }

      await prisma.photo.delete({ where: { id: photoId } });
      
      logger.info(`[MEDIA] Photo deleted:`, { photoId, fileName: photo.fileName });
      return true;

    } catch (error) {
      logger.error(`[MEDIA] Failed to delete photo:`, { photoId, error });
      return false;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      const document = await prisma.document.findUnique({ where: { id: documentId } });
      if (!document) return false;

      // Delete from SharePoint if exists
      if (document.sharePointFileId) {
        try {
          // Temporarily disabled - deleteFile method needs to be added to SharePointService
          // await sharePointService.deleteFile(document.sharePointFileId);
        } catch (sharePointError) {
          logger.warn(`[MEDIA] Failed to delete from SharePoint:`, sharePointError);
          // Continue with database deletion
        }
      }

      await prisma.document.delete({ where: { id: documentId } });
      
      logger.info(`[MEDIA] Document deleted:`, { documentId, fileName: document.fileName });
      return true;

    } catch (error) {
      logger.error(`[MEDIA] Failed to delete document:`, { documentId, error });
      return false;
    }
  }

  /**
   * Update photo metadata
   */
  async updatePhotoMetadata(
    photoId: string, 
    updates: {
      tags?: string[];
      caption?: string;
      altText?: string;
      isMain?: boolean;
      sortOrder?: number;
    }
  ): Promise<PhotoUploadResult | null> {
    try {
      const photo = await prisma.photo.update({
        where: { id: photoId },
        data: {
          ...(updates.tags !== undefined && { tags: updates.tags }),
          ...(updates.caption !== undefined && { caption: updates.caption }),
          ...(updates.altText !== undefined && { altText: updates.altText }),
          ...(updates.isMain !== undefined && { isMain: updates.isMain }),
          ...(updates.sortOrder !== undefined && { sortOrder: updates.sortOrder }),
          updatedAt: new Date()
        }
      });

      return {
        id: photo.id,
        fileName: photo.fileName,
        fileUrl: `/api/photos/public/${photo.id}`,
        thumbnailUrl: photo.thumbnailContent ? `/api/photos/thumbnail/${photo.id}` : undefined,
        sharePointUrl: photo.sharePointPath || undefined,
        sharePointFileId: photo.sharePointFileId || undefined,
        tags: photo.tags,
        category: photo.category,
        subfolder: photo.subfolder || undefined
      };

    } catch (error) {
      logger.error(`[MEDIA] Failed to update photo metadata:`, { photoId, error });
      return null;
    }
  }

  /**
   * Generate SharePoint path based on category and subfolder
   */
  private getSharePointPath(type: 'photos' | 'documents', category: string, subfolder?: string): string {
    const basePath = type === 'photos' ? 'Photos' : 'Documents';
    const categoryPath = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    
    if (subfolder) {
      return `${basePath}/${categoryPath}/${subfolder}`;
    }
    
    return `${basePath}/${categoryPath}`;
  }
}

export const mediaService = new MediaService();
