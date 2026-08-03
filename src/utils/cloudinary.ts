/**
 * Legacy compatibility wrapper for Cloudinary uploads.
 * Delegates directly to the resilient dual-tier Cloudinary service in src/lib/cloudinaryService.ts.
 */
import { 
  uploadToCloudinary as serviceUploadToCloudinary, 
  deleteFromCloudinary as serviceDeleteFromCloudinary,
  compressImage as serviceCompressImage,
  rejectSubmissionMedia as serviceRejectSubmissionMedia
} from '../lib/cloudinaryService';

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
  const res = await serviceUploadToCloudinary(file, {
    folder,
    projectId,
    studentId
  });

  return {
    url: res.url,
    public_id: res.public_id || `id-${Date.now()}`,
    folder: res.folder || folder,
    tags: res.tags || []
  };
};

export const deleteFromCloudinary = serviceDeleteFromCloudinary;
export const compressImage = serviceCompressImage;
export const rejectSubmissionMedia = serviceRejectSubmissionMedia;
