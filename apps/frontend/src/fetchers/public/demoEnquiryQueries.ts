import { useMutation } from "@tanstack/react-query";
import { publicApi } from "@/common/lib/axios";

export interface CreateDemoEnquiryBody {
  companyName: string;
  phoneNumber: string; // UI sends local part; backend normalizes to +977...
  message?: string;
}

export interface CreateDemoEnquiryResponse {
  success: boolean;
  data: {
    id: string;
    companyName: string;
    phoneNumber: string;
    message?: string | null;
    createdAt: string;
  };
  message?: string;
}

export function useCreateDemoEnquiry() {
  return useMutation({
    mutationFn: async (body: CreateDemoEnquiryBody) => {
      const { data } = await publicApi.post<CreateDemoEnquiryResponse>(
        "/public/demo-enquiries",
        body
      );
      return data;
    },
  });
}

