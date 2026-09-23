/**
 * Compress an image file to a base64 string optimized for Firestore and fast web loading.
 * Resizes max dimension to 1920px and compresses JPEG to 0.78 quality.
 * Result is typically 100KB - 300KB instead of 3MB - 10MB.
 */
export async function compressImageFileToBase64(file: File, maxDimension: number = 1920, quality: number = 0.80): Promise<string> {
  return new Promise((resolve, reject) => {
    // If SVG, read as text / data URL without compression
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use webp or jpeg for high quality and small size
        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData.startsWith('data:image/webp')) {
            resolve(webpData);
            return;
          }
        } catch {
          // fallback to jpeg
        }
        const jpegData = canvas.toDataURL('image/jpeg', quality);
        resolve(jpegData);
      };
      img.onerror = () => {
        resolve(reader.result as string);
      };
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
