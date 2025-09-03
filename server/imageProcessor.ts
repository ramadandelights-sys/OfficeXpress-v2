import sharp from 'sharp';

export interface ProcessedImage {
  data: Buffer;
  mimeType: string;
  size: number;
}

export class ImageProcessor {
  private static readonly MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
  private static readonly MAX_WIDTH = 1920;
  private static readonly MAX_HEIGHT = 1080;

  /**
   * Process and resize image to ensure it's under 5MB
   * Converts to JPEG or PNG format as appropriate
   */
  static async processImage(buffer: Buffer, originalMimeType?: string): Promise<ProcessedImage> {
    try {
      // Start with Sharp instance
      let image = sharp(buffer);
      
      // Get metadata
      const metadata = await image.metadata();
      const { width, height, format } = metadata;

      console.log(`Processing image: ${width}x${height}, format: ${format}, size: ${buffer.length} bytes`);

      // Resize if necessary
      if (width && height && (width > this.MAX_WIDTH || height > this.MAX_HEIGHT)) {
        image = image.resize(this.MAX_WIDTH, this.MAX_HEIGHT, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Try different quality levels to get under 5MB
      const targetFormats = ['jpeg', 'png'] as const;
      
      for (const targetFormat of targetFormats) {
        for (const quality of [90, 80, 70, 60, 50, 40]) {
          let processedImage = image.clone();
          
          if (targetFormat === 'jpeg') {
            processedImage = processedImage.jpeg({ quality, mozjpeg: true });
          } else {
            processedImage = processedImage.png({ 
              quality: quality,
              compressionLevel: 9
            });
          }
          
          const processedBuffer = await processedImage.toBuffer();
          
          if (processedBuffer.length <= this.MAX_SIZE_BYTES) {
            console.log(`Successfully processed image: ${targetFormat}, quality: ${quality}, final size: ${processedBuffer.length} bytes`);
            return {
              data: processedBuffer,
              mimeType: `image/${targetFormat}`,
              size: processedBuffer.length
            };
          }
        }
      }

      // If still too large, try WebP format
      const webpImage = await image.clone().webp({ quality: 30 }).toBuffer();
      if (webpImage.length <= this.MAX_SIZE_BYTES) {
        console.log(`Successfully processed image: webp, final size: ${webpImage.length} bytes`);
        return {
          data: webpImage,
          mimeType: 'image/webp',
          size: webpImage.length
        };
      }

      // As last resort, return the smallest version we can make
      const finalImage = await image.clone().jpeg({ quality: 20 }).toBuffer();
      console.log(`Final fallback image size: ${finalImage.length} bytes`);
      
      return {
        data: finalImage,
        mimeType: 'image/jpeg',
        size: finalImage.length
      };

    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error('Failed to process image');
    }
  }

  /**
   * Convert base64 image to buffer for processing
   */
  static base64ToBuffer(base64String: string): { buffer: Buffer; mimeType: string } {
    // Remove data URL prefix if present
    const base64Data = base64String.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    
    // Extract MIME type
    const mimeTypeMatch = base64String.match(/^data:(image\/[a-zA-Z]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';
    
    const buffer = Buffer.from(base64Data, 'base64');
    return { buffer, mimeType };
  }

  /**
   * Convert processed image back to base64 for storage
   */
  static bufferToBase64(buffer: Buffer, mimeType: string): string {
    const base64Data = buffer.toString('base64');
    return `data:${mimeType};base64,${base64Data}`;
  }

  /**
   * Process base64 image and return optimized base64
   */
  static async processBase64Image(base64String: string): Promise<string> {
    const { buffer, mimeType } = this.base64ToBuffer(base64String);
    const processed = await this.processImage(buffer, mimeType);
    return this.bufferToBase64(processed.data, processed.mimeType);
  }
}