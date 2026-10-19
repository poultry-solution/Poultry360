import { makeEnquiryFollowUpHooks } from "./enquiryFollowUp";

export interface AdminDemoEnquiry {
  id: string;
  companyName: string;
  phoneNumber: string;
  businessTypes: string[];
  message?: string | null;
}

export const demoEnquiryFollowUp = makeEnquiryFollowUpHooks<AdminDemoEnquiry>(
  "/admin/demo-enquiries",
  "admin-demo-enquiries",
);
