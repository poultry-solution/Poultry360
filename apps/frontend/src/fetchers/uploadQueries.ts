import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// Query keys
export const uploadKeys = {
    signature: (folder: string) => ["upload-signature", folder] as const,
};

// Types
export interface UploadSignatureResponse {
    success: boolean;
    data: {
        signature: string;
        timestamp: number;
        apiKey: string;
        cloudName: string;
        folder: string;
    };
}

// Get upload signature
export const useGetUploadSignature = (folder: string = "products") => {
    return useQuery({
        queryKey: uploadKeys.signature(folder),
        queryFn: async () => {
            const { data } = await axiosInstance.get<UploadSignatureResponse>(
                `/upload/signature?folder=${folder}`
            );
            return data.data;
        },
        // Refresh signature every 50 minutes (signatures expire after 1 hour)
        staleTime: 50 * 60 * 1000,
    });
};

// Service function for direct use (not as a hook)
export const getUploadSignature = async (folder: string = "products") => {
    const { data } = await axiosInstance.get<UploadSignatureResponse>(
        `/upload/signature?folder=${folder}`
    );
    return data.data;
};
