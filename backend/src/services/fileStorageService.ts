import * as Minio from 'minio';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { StorageConfig, EnhancedAttachment } from '../types/file.types';

export class FileStorageService {
  private minioClient: Minio.Client | null = null;
  private config: StorageConfig;
  private uploadDir: string;

  constructor(config: StorageConfig) {
    this.config = config;
    this.uploadDir = path.join(process.cwd(), 'uploads');
    
    if (config.provider === 'minio' && config.minio) {
      try {
        this.minioClient = new Minio.Client({
          endPoint: config.minio.endpoint,
          port: config.minio.port,
          useSSL: config.minio.useSSL,
          accessKey: config.minio.accessKey,
          secretKey: config.minio.secretKey,
        });
        console.log('📦 MinIO client initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize MinIO client:', error);
        console.log('🔄 Falling back to local storage');
        this.config.provider = 'local';
      }
    }
    
    // Ensure upload directory exists
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'thumbnails'), { recursive: true });
      console.log(`📁 Created upload directory: ${this.uploadDir}`);
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    chatId: string,
    userId: string
  ): Promise<EnhancedAttachment> {
    const fileId = this.generateFileId();
    const filename = `${fileId}-${file.originalname}`;
    
    let url: string;
    let thumbnailUrl: string | undefined;
    let dimensions: { width: number; height: number } | undefined;

    if (this.config.provider === 'minio' && this.minioClient) {
      url = await this.uploadToMinio(file, filename);
      if (this.isImage(file.mimetype)) {
        thumbnailUrl = await this.generateAndUploadThumbnail(file, filename);
        dimensions = await this.getImageDimensions(file.buffer);
      }
    } else {
      url = await this.uploadToLocal(file, filename);
      if (this.isImage(file.mimetype)) {
        thumbnailUrl = await this.generateLocalThumbnail(file, filename);
        dimensions = await this.getImageDimensions(file.buffer);
      }
    }

    return {
      fileId,
      filename,
      originalName: file.originalname,
      url,
      thumbnailUrl,
      mimetype: file.mimetype,
      size: file.size,
      dimensions,
      metadata: {
        uploadedAt: new Date().toISOString(),
        chatId,
        userId
      }
    };
  }

  private async uploadToMinio(file: Express.Multer.File, filename: string): Promise<string> {
    if (!this.minioClient || !this.config.minio) {
      throw new Error('MinIO client not initialized');
    }

    const bucketName = this.config.minio.bucket;
    
    // Ensure bucket exists
    const bucketExists = await this.minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      await this.minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`📦 Created MinIO bucket: ${bucketName}`);
    }

    // Upload file
    await this.minioClient.putObject(bucketName, filename, file.buffer, file.size, {
      'Content-Type': file.mimetype,
      'Content-Disposition': `attachment; filename="${file.originalname}"`
    });

    return `${this.config.minio.useSSL ? 'https' : 'http'}://${this.config.minio.endpoint}:${this.config.minio.port}/${bucketName}/${filename}`;
  }

  private async uploadToLocal(file: Express.Multer.File, filename: string): Promise<string> {
    const filePath = path.join(this.uploadDir, filename);
    await fs.writeFile(filePath, file.buffer);
    
    // Return relative URL that can be served by Express static middleware
    return `/uploads/${filename}`;
  }

  private async generateAndUploadThumbnail(
    file: Express.Multer.File,
    filename: string
  ): Promise<string> {
    const thumbnailFilename = `thumb-${filename}`;
    const thumbnailBuffer = await this.generateThumbnail(file.buffer);

    if (this.config.provider === 'minio' && this.minioClient && this.config.minio) {
      const bucketName = this.config.minio.bucket;
      await this.minioClient.putObject(bucketName, thumbnailFilename, thumbnailBuffer, thumbnailBuffer.length, {
        'Content-Type': 'image/jpeg'
      });
      return `${this.config.minio.useSSL ? 'https' : 'http'}://${this.config.minio.endpoint}:${this.config.minio.port}/${bucketName}/${thumbnailFilename}`;
    }

    throw new Error('MinIO not available for thumbnail upload');
  }

  private async generateLocalThumbnail(
    file: Express.Multer.File,
    filename: string
  ): Promise<string> {
    const thumbnailFilename = `thumb-${filename}`;
    const thumbnailPath = path.join(this.uploadDir, 'thumbnails', thumbnailFilename);
    const thumbnailBuffer = await this.generateThumbnail(file.buffer);
    
    await fs.writeFile(thumbnailPath, thumbnailBuffer);
    return `/uploads/thumbnails/${thumbnailFilename}`;
  }

  private async generateThumbnail(imageBuffer: Buffer): Promise<Buffer> {
    return sharp(imageBuffer)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  private async getImageDimensions(imageBuffer: Buffer): Promise<{ width: number; height: number }> {
    const metadata = await sharp(imageBuffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0
    };
  }

  async deleteFile(filename: string): Promise<void> {
    if (this.config.provider === 'minio' && this.minioClient && this.config.minio) {
      await this.minioClient.removeObject(this.config.minio.bucket, filename);
      // Also try to delete thumbnail
      try {
        await this.minioClient.removeObject(this.config.minio.bucket, `thumb-${filename}`);
      } catch (error) {
        // Thumbnail might not exist, ignore error
      }
    } else {
      // Delete from local storage
      try {
        await fs.unlink(path.join(this.uploadDir, filename));
        await fs.unlink(path.join(this.uploadDir, 'thumbnails', `thumb-${filename}`));
      } catch (error) {
        // Files might not exist, ignore error
      }
    }
  }

  private generateFileId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private isImage(mimetype: string): boolean {
    return mimetype.startsWith('image/');
  }

  // Serve file method for local storage
  async getFileStream(filename: string): Promise<Buffer | null> {
    if (this.config.provider === 'local') {
      try {
        const filePath = path.join(this.uploadDir, filename);
        return await fs.readFile(filePath);
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  // Get file info
  async getFileInfo(filename: string): Promise<any> {
    if (this.config.provider === 'minio' && this.minioClient && this.config.minio) {
      try {
        return await this.minioClient.statObject(this.config.minio.bucket, filename);
      } catch (error) {
        return null;
      }
    } else {
      try {
        const filePath = path.join(this.uploadDir, filename);
        const stats = await fs.stat(filePath);
        return {
          size: stats.size,
          lastModified: stats.mtime,
          exists: true
        };
      } catch (error) {
        return null;
      }
    }
  }
}

// Create singleton instance
let fileStorageInstance: FileStorageService | null = null;

export function getFileStorageService(): FileStorageService {
  if (!fileStorageInstance) {
    const config: StorageConfig = {
      provider: process.env.STORAGE_PROVIDER as 'minio' | 'local' || 'local',
      minio: {
        endpoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT || '9000'),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
        bucket: process.env.MINIO_BUCKET || 'chat-files'
      },
      local: {
        uploadPath: process.env.UPLOAD_PATH || './uploads',
        publicPath: process.env.PUBLIC_PATH || '/uploads'
      }
    };
    
    fileStorageInstance = new FileStorageService(config);
  }
  
  return fileStorageInstance;
}