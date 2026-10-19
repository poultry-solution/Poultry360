import { makeEnquiryFollowUpHooks } from "./enquiryFollowUp";

export interface AdminLandingContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  farmType: string | null;
  message: string;
}

export const landingContactFollowUp = makeEnquiryFollowUpHooks<AdminLandingContact>(
  "/admin/landing-contacts",
  "admin-landing-contacts",
);
