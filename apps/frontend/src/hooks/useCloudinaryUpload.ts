import { useState, useCallback } from "react";
import { getUploadSignature } from "@/fetchers/uploadQueries";

interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

interface UseCloudinaryUploadOptions {
    folder?: string;
    onSuccess?: (url: string) => void;
    onError?: (error: Error) => void;
}

interface UseCloudinaryUploadReturn {
    uploadImage: (file: File) => Promise<string>;
    isUploading: boolean;
    progress: UploadProgress | null;
    error: Error | null;
    reset: () => void;
}

/**
 * Hook for uploading images directly to Cloudinary using signed URLs.
 * This is the optimal approach as it:
 * - Avoids server bandwidth usage (file goes directly to Cloudinary)
 * - Reduces server load (no file processing on backend)
 * - Enables larger file uploads without server timeout issues
 */
export const useCloudinaryUpload = (
    options: UseCloudinaryUploadOptions = {}
): UseCloudinaryUploadReturn => {
    const { folder = "products", onSuccess, onError } = options;

    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const reset = useCallback(() => {
        setIsUploading(false);
        setProgress(null);
        setError(null);
    }, []);

    const uploadImage = useCallback(
        async (file: File): Promise<string> => {
            try {
                setIsUploading(true);
                setError(null);
                setProgress({ loaded: 0, total: file.size, percentage: 0 });

                // Get signed upload params from backend
                const signatureData = await getUploadSignature(folder);

                // Create form data for Cloudinary upload
                const formData = new FormData();
                formData.append("file", file);
                formData.append("api_key", signatureData.apiKey);
                formData.append("timestamp", signatureData.timestamp.toString());
                formData.append("signature", signatureData.signature);
                formData.append("folder", signatureData.folder);

                // Upload directly to Cloudinary
                const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`;

                const xhr = new XMLHttpRequest();

                const uploadPromise = new Promise<string>((resolve, reject) => {
                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            const percentage = Math.round((event.loaded / event.total) * 100);
                            setProgress({
                                loaded: event.loaded,
                                total: event.total,
                                percentage,
                            });
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status === 200) {
                            const response = JSON.parse(xhr.responseText);
                            const imageUrl = response.secure_url;
                            setProgress({ loaded: file.size, total: file.size, percentage: 100 });
                            onSuccess?.(imageUrl);
                            resolve(imageUrl);
                        } else {
                            const errorMessage = `Upload failed with status ${xhr.status}`;
                            const uploadError = new Error(errorMessage);
                            setError(uploadError);
                            onError?.(uploadError);
                            reject(uploadError);
                        }
                    };

                    xhr.onerror = () => {
                        const uploadError = new Error("Network error during upload");
                        setError(uploadError);
                        onError?.(uploadError);
                        reject(uploadError);
                    };

                    xhr.open("POST", cloudinaryUrl);
                    xhr.send(formData);
                });

                const result = await uploadPromise;
                setIsUploading(false);
                return result;
            } catch (err) {
                const uploadError = err instanceof Error ? err : new Error("Upload failed");
                setError(uploadError);
                setIsUploading(false);
                onError?.(uploadError);
                throw uploadError;
            }
        },
        [folder, onSuccess, onError]
    );

    return {
        uploadImage,
        isUploading,
        progress,
        error,
        reset,
    };
};
