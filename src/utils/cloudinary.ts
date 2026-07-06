/**
 * Utility to upload files to Cloudinary via the server-side Express proxy.
 * This secures the Cloudinary API Key and Secret on the server.
 */
export const uploadToCloudinary = async (file: File, folder: string = 'ciya'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const response = await fetch('/api/cloudinary/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file: base64String,
            folder: folder
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to upload to Cloudinary');
        }

        const data = await response.json();
        if (!data.url) {
          throw new Error('Cloudinary response did not return a valid URL');
        }
        resolve(data.url);
      } catch (err: any) {
        console.error("Cloudinary upload utility error:", err);
        reject(err);
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file for upload'));
    };
    reader.readAsDataURL(file);
  });
};
