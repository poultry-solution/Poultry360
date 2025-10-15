import { useQuery, useMutation } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ========== Types ==========
export type GenerateChatUploadUrlPayload = {
  conversationId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  width?: number;
  height?: number;
  durationMs?: number;
};

export type VerifyChatUploadPayload = {
  attachmentKey: string;
};

// ========== Keys ==========
export const s3Keys = {
  list: (expires?: number) => ["s3", "list", expires ?? 600] as const,
  viewUrl: (attachmentKey: string) => ["s3", "view", attachmentKey] as const,
};

// ========== Queries ==========

// Test listing (admin/debug tool) - includes presigned GET urls per object
export const useListR2Objects = (expires: number = 600) => {
  return useQuery({
    queryKey: s3Keys.list(expires),
    queryFn: async () => {
      const res = await axiosInstance.get(`/s3/test`, { params: { expires } });
      return res.data as {
        bucket: string;
        expires: number;
        objects: Array<{
          key: string;
          lastModified?: string;
          size?: number;
          etag?: string;
          url?: string; // presigned GET
        }>;
      };
    },
  });
};

// Optional: simple presign for test uploads (PUT)
export const useGetPresignedTestUploadUrl = () => {
  return useMutation({
    mutationFn: async (params: {
      key: string;
      contentType: string;
      expires?: number;
    }) => {
      const res = await axiosInstance.get(`/s3/test2`, { params });
      return res.data as { uploadUrl: string; key: string; expires: number };
    },
  });
};

// ========== Chat Attachments ==========

export const useGenerateChatUploadUrl = () => {
  return useMutation({
    mutationFn: async (data: GenerateChatUploadUrlPayload) => {
      const res = await axiosInstance.post(`/s3/chat/upload-url`, data);
      return res.data as {
        uploadUrl: string;
        attachmentKey: string;
        expires: number;
      };
    },
  });
};

export const useVerifyChatUpload = () => {
  return useMutation({
    mutationFn: async (data: VerifyChatUploadPayload) => {
      const res = await axiosInstance.post(`/s3/chat/verify-upload`, data);
      return res.data as {
        success: boolean;
        viewUrl?: string;
        attachmentKey: string;
        attachmentUrl: string;
        fileName: string;
        contentType: string;
        fileSize: number;
        durationMs: number;
        width: number;
        height: number;
        fileType: string;
      };
    },
  });
};

export const useGetAttachmentViewUrl = (attachmentKey?: string) => {
  return useQuery({
    queryKey: attachmentKey
      ? s3Keys.viewUrl(attachmentKey)
      : ["s3", "view", "missing"],
    queryFn: async () => {
      if (!attachmentKey) return null;
      const res = await axiosInstance.get(
        `/s3/chat/view/${encodeURIComponent(attachmentKey)}`
      );
      return res.data as { viewUrl: string };
    },
    enabled: !!attachmentKey,
  });
};

export const useDeleteUploadedFile = () => {
  return useMutation({
    mutationFn: async (attachmentKey: string) => {
      const res = await axiosInstance.delete(
        `/s3/chat/delete/${encodeURIComponent(attachmentKey)}`
      );
      return res.data as { success: boolean };
    },
  });
};
