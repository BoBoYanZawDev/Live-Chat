import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { env } from '../config/env.js';
import type { AttachmentInput } from '../repositories/message.repository.js';
import { HttpError } from '../utils/HttpError.js';

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

const IMAGE_MAX_DIMENSION = 1920;
const THUMBNAIL_MAX_DIMENSION = 480;
const VIDEO_EXTENSIONS: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

const publicUrl = (fileName: string) => `/uploads/${fileName}`;

/**
 * Turns multer temp files into stored attachments.
 * Images are auto-rotated, downscaled and re-encoded to WebP with sharp (plus a thumbnail).
 * Videos are stored as uploaded; sharp cannot transcode video.
 */
export class MediaService {
  async init() {
    await fs.mkdir(env.uploadDir, { recursive: true });
  }

  async processUploads(files: Express.Multer.File[]): Promise<AttachmentInput[]> {
    const written: string[] = [];
    try {
      const attachments: AttachmentInput[] = [];
      for (const file of files) {
        attachments.push(
          IMAGE_MIME_TYPES.includes(file.mimetype)
            ? await this.processImage(file, written)
            : await this.processVideo(file, written),
        );
      }
      return attachments;
    } catch (err) {
      await this.remove(written);
      throw err;
    } finally {
      await this.discardTemp(files);
    }
  }

  /** Deletes multer's temporary upload files. */
  discardTemp(files: Express.Multer.File[]) {
    return this.remove(files.map((f) => f.path));
  }

  /** Deletes stored files for attachments that never made it into the database. */
  async discard(attachments: AttachmentInput[]) {
    const names = attachments.flatMap((a) => [a.url, a.thumbnailUrl]).filter((u): u is string => !!u);
    await this.remove(names.map((u) => path.join(env.uploadDir, path.basename(u))));
  }

  private async processImage(file: Express.Multer.File, written: string[]): Promise<AttachmentInput> {
    if (file.size > env.maxImageBytes) {
      throw HttpError.badRequest(`"${file.originalname}" exceeds the ${env.maxImageBytes / 1024 / 1024}MB image limit`);
    }
    const id = randomUUID();
    const animated = file.mimetype === 'image/gif' || file.mimetype === 'image/webp';
    const mainName = `${id}.webp`;
    const thumbName = `${id}_thumb.webp`;

    try {
      const main = await sharp(file.path, { animated })
        .rotate()
        .resize({ width: IMAGE_MAX_DIMENSION, height: IMAGE_MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toFile(path.join(env.uploadDir, mainName));
      written.push(path.join(env.uploadDir, mainName));

      await sharp(file.path)
        .rotate()
        .resize({ width: THUMBNAIL_MAX_DIMENSION, height: THUMBNAIL_MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 70 })
        .toFile(path.join(env.uploadDir, thumbName));
      written.push(path.join(env.uploadDir, thumbName));

      return {
        type: 'IMAGE',
        url: publicUrl(mainName),
        thumbnailUrl: publicUrl(thumbName),
        mimeType: 'image/webp',
        size: main.size,
        width: main.width,
        // For animated images sharp reports the stacked height of all frames.
        height: main.pageHeight ?? main.height,
        originalName: file.originalname,
      };
    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw HttpError.badRequest(`"${file.originalname}" is not a valid image`);
    }
  }

  private async processVideo(file: Express.Multer.File, written: string[]): Promise<AttachmentInput> {
    if (file.size > env.maxVideoBytes) {
      throw HttpError.badRequest(`"${file.originalname}" exceeds the ${env.maxVideoBytes / 1024 / 1024}MB video limit`);
    }
    const name = `${randomUUID()}${VIDEO_EXTENSIONS[file.mimetype] ?? ''}`;
    const dest = path.join(env.uploadDir, name);
    await fs.copyFile(file.path, dest);
    written.push(dest);
    return {
      type: 'VIDEO',
      url: publicUrl(name),
      thumbnailUrl: null,
      mimeType: file.mimetype,
      size: file.size,
      width: null,
      height: null,
      originalName: file.originalname,
    };
  }

  private async remove(paths: string[]) {
    await Promise.all(paths.map((p) => fs.rm(p, { force: true })));
  }
}
