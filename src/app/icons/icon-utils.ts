/** True when icon is a base64/data URL image. */
export function isImageIcon(icon: string | undefined | null): boolean {
  if (!icon) return false;
  return icon.startsWith('data:image/');
}

/** True when there is something to render. */
export function hasIcon(icon: string | undefined | null): boolean {
  return Boolean(icon?.trim());
}

/** Normalize icon from forms: trim; empty string means none. */
export function normalizeIconInput(icon: string | undefined | null): string {
  const t = (icon ?? '').trim();
  return t;
}

/** Read a file as a resized PNG data URL (max edge 64px). */
export function fileToIconDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'));
      return;
    }
    if (file.size > 256 * 1024) {
      reject(new Error('Image must be 256 KB or smaller.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 64;
        let w = img.width;
        let h = img.height;
        if (w > max || h > max) {
          const scale = max / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not process image.'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Could not load image.'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}
