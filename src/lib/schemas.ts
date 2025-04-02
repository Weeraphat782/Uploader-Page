import { z } from 'zod';

export const documentUploadSchema = z.object({
  companyName: z.string().min(2, { message: "Company name is required" }),
  companyRegistration: z.any().optional(),
  companyDeclaration: z.any().optional(),
  importPermit: z.any().optional(),
  tk10: z.any().optional(),
  tk11: z.any().optional(),
  tk32: z.any().optional(),
  tk31: z.any().optional(),
  purchaseOrder: z.any().optional(),
  idCardCopy: z.any().optional(),
  msds: z.any().optional(),
  commercialInvoice: z.any().optional(),
  packingList: z.any().optional(),
});

export type DocumentUploadFormValues = z.infer<typeof documentUploadSchema>;