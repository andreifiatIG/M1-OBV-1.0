import { prisma } from '../../server';
import { logger } from '../../utils/logger';
import sharp from 'sharp';
import * as zlib from 'zlib';
import { promisify } from 'util';

const compress = promisify(zlib.gzip);
const decompress = promisify(zlib.gunzip);

export interface FileStorageResult {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  originalSize?: number;
  isCompressed: boolean;
  storageLocation: 'database';
}

export interface FileRetrievalResult {
  content: Buffer;
  fileName: string;
  mimeType: string;
  size: number;
}

class DatabaseFileStorageService {
  
  /**
   * Store a document in the database with optional compression
   */
  async storeDocument(
    villaId: string, 
    fileBuffer: Buffer, 
    fileName: string, 
    mimeType: string,
    documentType: string,
    description?: string
  ): Promise<FileStorageResult> {
    try {
      const originalSize = fileBuffer.length;
      let fileContent = fileBuffer;
      let isCompressed = false;

      // Compress if file is larger than 1MB
      if (originalSize > 1024 * 1024) {
        fileContent = await compress(fileBuffer);
        isCompressed = true;
        logger.info(`[DB-STORAGE] Compressed document ${fileName}: ${originalSize} → ${fileContent.length} bytes`);
      }

      const document = await prisma.document.create({
        data: {
          villaId,
          documentType: documentType as any,
          fileName,
          fileUrl: `database://${villaId}/documents/`, // Placeholder URL
          fileSize: fileContent.length,
          mimeType,
          description,
          fileContent,
          isCompressed,
          originalFileSize: originalSize,
          storageLocation: 'database'
        }
      });

      logger.info(`[DB-STORAGE] Document stored: ${fileName} (${document.id})`);

      return {
        id: document.id,
        fileName,
        mimeType,
        size: fileContent.length,
        originalSize,
        isCompressed,
        storageLocation: 'database'
      };

    } catch (error) {
      logger.error('[DB-STORAGE] Failed to store document:', error);
      throw new Error(`Failed to store document: ${error}`);
    }
  }

  /**
   * Store a photo in the database with compression and thumbnail generation
   */
  async storePhoto(
    villaId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    category: string,
    options: {
      caption?: string;
      altText?: string;
      isMain?: boolean;
      subfolder?: string;
    } = {}
  ): Promise<FileStorageResult> {
    try {
      const originalSize = fileBuffer.length;
      let processedImage = fileBuffer;
      let thumbnailBuffer: Buffer | null = null;

      // Process image with Sharp for optimization
      if (mimeType.startsWith('image/')) {
        const image = sharp(fileBuffer);
        const metadata = await image.metadata();

        // Optimize main image (max 1920px width, 85% quality)
        processedImage = await image
          .resize(1920, null, { 
            withoutEnlargement: true,
            fit: 'inside'
          })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();

        // Generate thumbnail (300x300, 80% quality)
        thumbnailBuffer = await image
          .resize(300, 300, { 
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 80 })
          .toBuffer();

        logger.info(`[DB-STORAGE] Image processed: ${fileName} ${originalSize} → ${processedImage.length} bytes + ${thumbnailBuffer.length} thumbnail`);
      }

      const photo = await prisma.photo.create({
        data: {
          villaId,
          category: category as any,
          fileName,
          fileUrl: `database://${villaId}/photos/`, // Placeholder URL
          fileSize: processedImage.length,
          mimeType: 'image/jpeg', // Always JPEG after processing
          caption: options.caption,
          altText: options.altText,
          isMain: options.isMain || false,
          subfolder: options.subfolder,
          fileContent: processedImage,
          thumbnailContent: thumbnailBuffer,
          isCompressed: processedImage.length < originalSize,
          originalFileSize: originalSize,
          storageLocation: 'database'
        }
      });

      logger.info(`[DB-STORAGE] Photo stored: ${fileName} (${photo.id})`);

      return {
        id: photo.id,
        fileName,
        mimeType: 'image/jpeg',
        size: processedImage.length,
        originalSize,
        isCompressed: processedImage.length < originalSize,
        storageLocation: 'database'
      };

    } catch (error) {
      logger.error('[DB-STORAGE] Failed to store photo:', error);
      throw new Error(`Failed to store photo: ${error}`);
    }
  }

  /**
   * Retrieve a document from the database
   */
  async retrieveDocument(documentId: string): Promise<FileRetrievalResult> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
          fileContent: true,
          fileName: true,
          mimeType: true,
          fileSize: true,
          isCompressed: true,
          originalFileSize: true
        }
      });

      if (!document || !document.fileContent) {
        throw new Error(`Document not found or no content: ${documentId}`);
      }

      let content = document.fileContent;

      // Decompress if needed
      if (document.isCompressed) {
        content = await decompress(content);
        logger.info(`[DB-STORAGE] Document decompressed: ${document.fileName}`);
      }

      return {
        content: Buffer.from(content),
        fileName: document.fileName,
        mimeType: document.mimeType,
        size: content.length
      };

    } catch (error) {
      logger.error(`[DB-STORAGE] Failed to retrieve document ${documentId}:`, error);
      throw new Error(`Failed to retrieve document: ${error}`);
    }
  }

  /**
   * Retrieve a photo from the database
   */
  async retrievePhoto(photoId: string, thumbnail = false): Promise<FileRetrievalResult> {
    try {
      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        select: {
          fileContent: true,
          thumbnailContent: true,
          fileName: true,
          mimeType: true,
          fileSize: true
        }
      });

      if (!photo) {
        throw new Error(`Photo not found: ${photoId}`);
      }

      const content = thumbnail ? photo.thumbnailContent : photo.fileContent;
      
      if (!content) {
        throw new Error(`Photo content not found: ${photoId} (thumbnail: ${thumbnail})`);
      }

      return {
        content: Buffer.from(content),
        fileName: thumbnail ? `thumb_${photo.fileName}` : photo.fileName,
        mimeType: photo.mimeType,
        size: content.length
      };

    } catch (error) {
      logger.error(`[DB-STORAGE] Failed to retrieve photo ${photoId}:`, error);
      throw new Error(`Failed to retrieve photo: ${error}`);
    }
  }

  /**
   * Delete a document from the database
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      await prisma.document.delete({
        where: { id: documentId }
      });
      logger.info(`[DB-STORAGE] Document deleted: ${documentId}`);
    } catch (error) {
      logger.error(`[DB-STORAGE] Failed to delete document ${documentId}:`, error);
      throw new Error(`Failed to delete document: ${error}`);
    }
  }

  /**
   * Delete a photo from the database
   */
  async deletePhoto(photoId: string): Promise<void> {
    try {
      await prisma.photo.delete({
        where: { id: photoId }
      });
      logger.info(`[DB-STORAGE] Photo deleted: ${photoId}`);
    } catch (error) {
      logger.error(`[DB-STORAGE] Failed to delete photo ${photoId}:`, error);
      throw new Error(`Failed to delete photo: ${error}`);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalDocuments: number;
    totalPhotos: number;
    totalStorageSize: number;
    avgCompressionRatio: number;
  }> {
    try {
      const [documentStats, photoStats] = await Promise.all([
        prisma.document.aggregate({
          _count: true,
          _sum: { fileSize: true, originalFileSize: true }
        }),
        prisma.photo.aggregate({
          _count: true,
          _sum: { fileSize: true, originalFileSize: true }
        })
      ]);

      const totalDocuments = documentStats._count;
      const totalPhotos = photoStats._count;
      const totalStorageSize = (documentStats._sum.fileSize || 0) + (photoStats._sum.fileSize || 0);
      const totalOriginalSize = (documentStats._sum.originalFileSize || 0) + (photoStats._sum.originalFileSize || 0);
      
      const avgCompressionRatio = totalOriginalSize > 0 ? 
        Math.round(((totalOriginalSize - totalStorageSize) / totalOriginalSize) * 100) : 0;

      return {
        totalDocuments,
        totalPhotos,
        totalStorageSize,
        avgCompressionRatio
      };

    } catch (error) {
      logger.error('[DB-STORAGE] Failed to get storage stats:', error);
      throw new Error(`Failed to get storage stats: ${error}`);
    }
  }
}

export default new DatabaseFileStorageService();