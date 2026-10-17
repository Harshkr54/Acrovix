/**
 * Client-Side Dynamic Brand Color Extractor using HTML5 Canvas
 * Extracts the dominant, vibrant brand color from an image (ignoring transparent, white, and near-black pixels).
 */
export const extractDominantColor = (imageSrc) => {
    return new Promise((resolve) => {
        if (!imageSrc) {
            return resolve('#2563EB');
        }

        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imageSrc;

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve('#2563EB');

                // Limit canvas size for fast sampling
                const maxDim = 200;
                const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
                canvas.width = Math.max(1, Math.floor((img.width || 100) * scale));
                canvas.height = Math.max(1, Math.floor((img.height || 100) * scale));

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

                // Sample pixels, ignore transparent, white (#FFFFFF) and near-black (#000000) pixels
                let r = 0, g = 0, b = 0, count = 0;
                const step = 4; // Check every 4th pixel for speed & accuracy

                for (let i = 0; i < imageData.length; i += step * 4) {
                    const red = imageData[i];
                    const green = imageData[i + 1];
                    const blue = imageData[i + 2];
                    const alpha = imageData[i + 3];

                    const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

                    // Filter out transparent, overly dark/black, and washed out/white pixels
                    if (alpha > 128 && brightness > 30 && brightness < 230) {
                        r += red;
                        g += green;
                        b += blue;
                        count++;
                    }
                }

                if (count === 0) return resolve('#2563EB'); // Default fallback blue

                const toHex = (c) => Math.round(c).toString(16).padStart(2, '0');
                const hex = `#${toHex(r / count)}${toHex(g / count)}${toHex(b / count)}`.toUpperCase();
                resolve(hex);
            } catch (err) {
                console.warn('Canvas color extraction error (e.g. CORS):', err);
                resolve('#2563EB');
            }
        };

        img.onerror = () => {
            resolve('#2563EB');
        };
    });
};
