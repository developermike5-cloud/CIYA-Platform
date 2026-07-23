/**
 * Utility to upload files to Cloudinary via the server-side Express proxy.
 * This secures the Cloudinary API Key and Secret on the server.
 */
export interface CloudinaryUploadResponse {
  url: string;
  public_id: string;
  folder: string;
  tags: string[];
}

export const uploadToCloudinary = async (
  file: File, 
  folder: string = 'ciya',
  projectId?: string,
  studentId?: string
): Promise<CloudinaryUploadResponse> => {
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
            folder: folder,
            projectId: projectId,
            studentId: studentId
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
        resolve({
          url: data.url,
          public_id: data.public_id,
          folder: data.folder,
          tags: data.tags
        });
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
