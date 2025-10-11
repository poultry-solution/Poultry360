import { useQuery, useMutation } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

type CreateBatchSharePayload = {
  batchId: string;
  title?: string;
  description?: string;
  expiresIn?: "never" | "1d" | "7d" | "30d";
  conversationId?: string;
  sharedWithId?: string;
};

export const useCreateBatchShare = () => {
  return useMutation({
    mutationFn: async (data: CreateBatchSharePayload) => {
      const res = await axiosInstance.post("/batch-share", data);
      return res.data as {
        shareId: string;
        shareToken: string;
        shareUrl: string;
        expiresAt?: string | null;
        isPublic: boolean;
      };
    },
  });
};

export const useGetBatchShareByToken = (token?: string) => {
  return useQuery({
    queryKey: ["batch-share", token],
    queryFn: async () => {
      if (!token) return null;
      const res = await axiosInstance.get(`/batch-share/${token}`);
     
      console.log(res.data);
      return res.data as {
        share: {
          id: string;
          title?: string | null;
          description?: string | null;
          createdAt: string;
          expiresAt?: string | null;
          viewCount: number;
          snapshotData: any;
        };
        canAddNotes: boolean;
      };
    },
    enabled: !!token,
  });
};


