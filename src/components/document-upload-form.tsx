"use client";

import { useState } from "react";
import { useForm, ControllerRenderProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { DocumentUploadFormValues, documentUploadSchema } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Image from "next/image";

// Sample document URLs - replace these with your actual sample document URLs
const SAMPLE_DOCUMENTS = {
  companyRegistration: "https://dushtbccivxstisfalhr.supabase.co/storage/v1/object/public/sample-documents/sample-company-registration.pdf",
  companyDeclaration: "https://dushtbccivxstisfalhr.supabase.co/storage/v1/object/public/sample-documents/sample-company-declaration.pdf",
  importPermit: "https://dushtbccivxstisfalhr.supabase.co/storage/v1/object/public/sample-documents/sample-import-permit.pdf",
  tk10: "https://dushtbccivxstisfalhr.supabase.co/storage/v1/object/public/sample-documents/sample-tk10.pdf",
  tk11: "https://dushtbccivxstisfalhr.supabase.co/storage/v1/object/public/sample-documents/sample-tk11.pdf",
  tk31: "https://dushtbccivxstisfalhr.supabase.co/storage/v1/object/public/sample-documents/sample-tk31.pdf",
  tk32: "https://dushtbccivxstisfalhr.supabase.co/storage/v1/object/public/sample-documents/sample-tk32.pdf",
  purchaseOrder: "https://dushtbccivxstisfalhr.supabase.co/storage/v1/object/public/sample-documents/sample-purchase-order.pdf",
  idCardCopy: "https://dushtbccivxstisfalhr.supabase.co/storage/v1/object/public/sample-documents/sample-id-card.pdf",
  msds: "https://dushtbccivxstisfalhr.supabase.co/storage/v1/object/public/sample-documents/sample-msds.pdf",
  commercialInvoice: "https://dushtbccivxstisfalhr.supabase.co/storage/v1/object/public/sample-documents/sample-commercial-invoice.pdf",
  packingList: "https://dushtbccivxstisfalhr.supabase.co/storage/v1/object/public/sample-documents/sample-packing-list.pdf",
};

export function DocumentUploadForm() {
  const [isUploading, setIsUploading] = useState(false);
  
  const form = useForm<DocumentUploadFormValues>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      companyName: "",
    },
  });

  const uploadFile = async (file: File, folder: string, companyName: string) => {
    if (!file) return null;
    
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      formData.append('companyName', companyName);
      
      // Send to API route
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        console.error('Upload failed with status:', response.status);
        return null;
      }
      
      const result = await response.json();
      return result.path;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  // Function to open sample document in a new tab
  const openSampleDocument = (documentType: keyof typeof SAMPLE_DOCUMENTS) => {
    const url = SAMPLE_DOCUMENTS[documentType];
    if (url) {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const urlWithTimestamp = `${url}?t=${timestamp}`;
      window.open(urlWithTimestamp, '_blank');
    }
  };

  const onSubmit = async (data: DocumentUploadFormValues) => {
    setIsUploading(true);
    let anyUploadsSucceeded = false;
    
    try {
      // Explicitly type documentPaths
      const documentPaths: Record<string, string[]> = {};
      
      // Define document types
      const documentTypes = [
        { key: "companyRegistration", label: "Company Registration" },
        { key: "companyDeclaration", label: "Company Declaration" },
        { key: "importPermit", label: "Import Permit" },
        { key: "tk10", label: "TK 10" },
        { key: "tk11", label: "TK 11" },
        { key: "tk32", label: "TK 32" },
        { key: "tk31", label: "TK 31" },
        { key: "purchaseOrder", label: "Purchase Order" },
        { key: "idCardCopy", label: "ID Card Copy" },
        { key: "msds", label: "MSDS" },
        { key: "commercialInvoice", label: "Commercial Invoice" },
        { key: "packingList", label: "Packing List" },
      ];
      
      // Initialize paths
      documentTypes.forEach(doc => {
        documentPaths[doc.key] = [];
      });
      
      // Process files
      for (const doc of documentTypes) {
        // Assert that doc.key is a key of DocumentUploadFormValues
        const files = data[doc.key as keyof DocumentUploadFormValues] as unknown as FileList;
        
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            try {
              const path = await uploadFile(files[i], doc.key, data.companyName);
              if (path) {
                documentPaths[doc.key].push(path);
                anyUploadsSucceeded = true;
              }
            } catch (error) {
              console.error(`Error uploading ${doc.label} file:`, error);
            }
          }
        }
      }
      
      // Save to database if any uploads succeeded
      if (anyUploadsSucceeded) {
        const { error } = await supabase.from("customer_documents_multi").insert({
          company_name: data.companyName,
          document_paths: documentPaths,
          uploaded_at: new Date().toISOString(),
        });
        
        if (error) {
          toast.error("Database Error", {
            description: "Could not save document information."
          });
        } else {
          toast.success("Documents Uploaded", {
            description: "Your documents have been processed."
          });
          form.reset();
        }
      } else {
        toast.error("Upload Failed", {
          description: "Could not upload any documents."
        });
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Something went wrong", {
        description: "Please try again later."
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto border shadow-sm">
      <CardHeader className="p-0">
        <div className="flex justify-center items-center">
          <CardTitle className="text-2xl font-bold">
          </CardTitle>
          <Image 
            src="/cantrak-logo.png" // Assuming the logo is saved in public/cantrak-logo.png
            alt="Cantrak Logo" 
            width={300} // Increased width
            height={100} // Increased height
            priority // Add priority if it's Above The Fold (ATF)
          />
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }: { field: ControllerRenderProps<DocumentUploadFormValues, 'companyName'> }) => (
                <FormItem>
                  <FormLabel>Company Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Accordion type="multiple" defaultValue={['item-1']} className="w-full">
              {/* Accordion Item 1: Company Information */}
              <AccordionItem value="item-1">
                <AccordionTrigger className="hover:no-underline py-4 text-base font-medium border-b">
                  Company Information
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    {/* Company Registration */}
                    <FormField
                      control={form.control}
                      name="companyRegistration"
                      render={({ field: { onChange, onBlur, name, ref } }: { field: ControllerRenderProps<DocumentUploadFormValues, 'companyRegistration'> }) => {
                        const fileList = form.watch("companyRegistration");
                        const hasFiles = fileList && fileList.length > 0;
                        const filesArray: File[] = hasFiles ? Array.from(fileList) : [];
                        return (
                          <FormItem className={`p-3 rounded-md transition-colors ${hasFiles ? 'border border-green-200' : ''}`}>
                            <div className="flex justify-between items-center">
                              <FormLabel>
                                Company Registration*
                              </FormLabel>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => openSampleDocument('companyRegistration')}
                              >
                                Preview
                              </Button>
                            </div>
                            <FormControl>
                              <Input
                                type="file"
                                multiple
                                name={name}
                                ref={ref}
                                onBlur={onBlur}
                                onChange={(e) => onChange(e.target.files)}
                              />
                            </FormControl>
                            {hasFiles && (
                              <div className="mt-1.5 text-xs text-gray-500 space-y-1">
                                {filesArray.slice(0, 3).map((file) => (
                                  <div key={file.name} className="truncate">{file.name}</div>
                                ))}
                                {filesArray.length > 3 && <div className="text-gray-400">...and {filesArray.length - 3} more</div>}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    {/* Company Declaration */}
                    <FormField
                      control={form.control}
                      name="companyDeclaration"
                      render={({ field: { onChange, onBlur, name, ref } }: { field: ControllerRenderProps<DocumentUploadFormValues, 'companyDeclaration'> }) => {
                        const fileList = form.watch("companyDeclaration");
                        const hasFiles = fileList && fileList.length > 0;
                        const filesArray: File[] = hasFiles ? Array.from(fileList) : [];
                        return (
                          <FormItem className={`p-3 rounded-md transition-colors ${hasFiles ? 'border border-green-200' : ''}`}>
                            <div className="flex justify-between items-center">
                              <FormLabel>
                                Company Declaration*
                              </FormLabel>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => openSampleDocument('companyDeclaration')}
                              >
                                Preview
                              </Button>
                            </div>
                            <FormControl>
                              <Input
                                type="file"
                                multiple
                                name={name}
                                ref={ref}
                                onBlur={onBlur}
                                onChange={(e) => onChange(e.target.files)}
                              />
                            </FormControl>
                            {hasFiles && (
                              <div className="mt-1.5 text-xs text-gray-500 space-y-1">
                                {filesArray.slice(0, 3).map((file) => (
                                  <div key={file.name} className="truncate">{file.name}</div>
                                ))}
                                {filesArray.length > 3 && <div className="text-gray-400">...and {filesArray.length - 3} more</div>}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    {/* ID Card Copy */}
                    <FormField
                      control={form.control}
                      name="idCardCopy"
                      render={({ field: { onChange, onBlur, name, ref } }: { field: ControllerRenderProps<DocumentUploadFormValues, 'idCardCopy'> }) => {
                        const fileList = form.watch("idCardCopy");
                        const hasFiles = fileList && fileList.length > 0;
                        const filesArray: File[] = hasFiles ? Array.from(fileList) : [];
                        return (
                          <FormItem className={`p-3 rounded-md transition-colors ${hasFiles ? 'border border-green-200' : ''}`}>
                            <div className="flex justify-between items-center">
                              <FormLabel>
                                ID Card Copy*
                              </FormLabel>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => openSampleDocument('idCardCopy')}
                              >
                                Preview
                              </Button>
                            </div>
                            <FormControl>
                              <Input
                                type="file"
                                multiple
                                name={name}
                                ref={ref}
                                onBlur={onBlur}
                                onChange={(e) => onChange(e.target.files)}
                              />
                            </FormControl>
                            {hasFiles && (
                              <div className="mt-1.5 text-xs text-gray-500 space-y-1">
                                {filesArray.slice(0, 3).map((file) => (
                                  <div key={file.name} className="truncate">{file.name}</div>
                                ))}
                                {filesArray.length > 3 && <div className="text-gray-400">...and {filesArray.length - 3} more</div>}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Accordion Item 2: Permits & TK Forms */}
              <AccordionItem value="item-2">
                <AccordionTrigger className="hover:no-underline py-4 text-base font-medium border-b">
                  Permits & TK Forms
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    {/* Import Permit */}
                    <FormField
                      control={form.control}
                      name="importPermit"
                      render={({ field: { onChange, onBlur, name, ref } }: { field: ControllerRenderProps<DocumentUploadFormValues, 'importPermit'> }) => {
                        const fileList = form.watch("importPermit");
                        const hasFiles = fileList && fileList.length > 0;
                        const filesArray: File[] = hasFiles ? Array.from(fileList) : [];
                        return (
                          <FormItem className={`p-3 rounded-md transition-colors ${hasFiles ? 'border border-green-200' : ''}`}>
                            <div className="flex justify-between items-center">
                              <FormLabel>
                                Import Permit*
                              </FormLabel>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => openSampleDocument('importPermit')}
                              >
                                Preview
                              </Button>
                            </div>
                            <FormControl>
                              <Input
                                type="file"
                                multiple
                                name={name}
                                ref={ref}
                                onBlur={onBlur}
                                onChange={(e) => onChange(e.target.files)}
                              />
                            </FormControl>
                            {hasFiles && (
                              <div className="mt-1.5 text-xs text-gray-500 space-y-1">
                                {filesArray.slice(0, 3).map((file) => (
                                  <div key={file.name} className="truncate">{file.name}</div>
                                ))}
                                {filesArray.length > 3 && <div className="text-gray-400">...and {filesArray.length - 3} more</div>}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    {/* TK 10 */}
                    <FormField
                      control={form.control}
                      name="tk10"
                      render={({ field: { onChange, onBlur, name, ref } }: { field: ControllerRenderProps<DocumentUploadFormValues, 'tk10'> }) => {
                        const fileList = form.watch("tk10");
                        const hasFiles = fileList && fileList.length > 0;
                        const filesArray: File[] = hasFiles ? Array.from(fileList) : [];
                        return (
                          <FormItem className={`p-3 rounded-md transition-colors ${hasFiles ? 'border border-green-200' : ''}`}>
                            <div className="flex justify-between items-center">
                              <FormLabel>
                                TK 10*
                              </FormLabel>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => openSampleDocument('tk10')}
                              >
                                Preview
                              </Button>
                            </div>
                            <FormControl>
                              <Input
                                type="file"
                                multiple
                                name={name}
                                ref={ref}
                                onBlur={onBlur}
                                onChange={(e) => onChange(e.target.files)}
                              />
                            </FormControl>
                            {hasFiles && (
                              <div className="mt-1.5 text-xs text-gray-500 space-y-1">
                                {filesArray.slice(0, 3).map((file) => (
                                  <div key={file.name} className="truncate">{file.name}</div>
                                ))}
                                {filesArray.length > 3 && <div className="text-gray-400">...and {filesArray.length - 3} more</div>}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    {/* TK 11 */}
                    <FormField
                      control={form.control}
                      name="tk11"
                      render={({ field: { onChange, onBlur, name, ref } }: { field: ControllerRenderProps<DocumentUploadFormValues, 'tk11'> }) => {
                        const fileList = form.watch("tk11");
                        const hasFiles = fileList && fileList.length > 0;
                        const filesArray: File[] = hasFiles ? Array.from(fileList) : [];
                        return (
                          <FormItem className={`p-3 rounded-md transition-colors ${hasFiles ? 'border border-green-200' : ''}`}>
                            <div className="flex justify-between items-center">
                              <FormLabel>
                                TK 11*
                              </FormLabel>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => openSampleDocument('tk11')}
                              >
                                Preview
                              </Button>
                            </div>
                            <FormControl>
                              <Input
                                type="file"
                                multiple
                                name={name}
                                ref={ref}
                                onBlur={onBlur}
                                onChange={(e) => onChange(e.target.files)}
                              />
                            </FormControl>
                            {hasFiles && (
                              <div className="mt-1.5 text-xs text-gray-500 space-y-1">
                                {filesArray.slice(0, 3).map((file) => (
                                  <div key={file.name} className="truncate">{file.name}</div>
                                ))}
                                {filesArray.length > 3 && <div className="text-gray-400">...and {filesArray.length - 3} more</div>}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    
                    {/* TK 31 */}
                    <FormField
                      control={form.control}
                      name="tk31"
                      render={({ field: { onChange, onBlur, name, ref } }: { field: ControllerRenderProps<DocumentUploadFormValues, 'tk31'> }) => {
                        const fileList = form.watch("tk31");
                        const hasFiles = fileList && fileList.length > 0;
                        const filesArray: File[] = hasFiles ? Array.from(fileList) : [];
                        return (
                          <FormItem className={`p-3 rounded-md transition-colors ${hasFiles ? 'border border-green-200' : ''}`}>
                            <div className="flex justify-between items-center">
                              <FormLabel>
                                TK 31*
                              </FormLabel>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => openSampleDocument('tk31')}
                              >
                                Preview
                              </Button>
                            </div>
                            <FormControl>
                              <Input
                                type="file"
                                multiple
                                name={name}
                                ref={ref}
                                onBlur={onBlur}
                                onChange={(e) => onChange(e.target.files)}
                              />
                            </FormControl>
                            {hasFiles && (
                              <div className="mt-1.5 text-xs text-gray-500 space-y-1">
                                {filesArray.slice(0, 3).map((file) => (
                                  <div key={file.name} className="truncate">{file.name}</div>
                                ))}
                                {filesArray.length > 3 && <div className="text-gray-400">...and {filesArray.length - 3} more</div>}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    
                    {/* TK 32 */}
                    <FormField
                      control={form.control}
                      name="tk32"
                      render={({ field: { onChange, onBlur, name, ref } }: { field: ControllerRenderProps<DocumentUploadFormValues, 'tk32'> }) => {
                        const fileList = form.watch("tk32");
                        const hasFiles = fileList && fileList.length > 0;
                        const filesArray: File[] = hasFiles ? Array.from(fileList) : [];
                        return (
                          <FormItem className={`p-3 rounded-md transition-colors ${hasFiles ? 'border border-green-200' : ''}`}>
                            <div className="flex justify-between items-center">
                              <FormLabel>
                                TK 32*
                              </FormLabel>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => openSampleDocument('tk32')}
                              >
                                Preview
                              </Button>
                            </div>
                            <FormControl>
                              <Input
                                type="file"
                                multiple
                                name={name}
                                ref={ref}
                                onBlur={onBlur}
                                onChange={(e) => onChange(e.target.files)}
                              />
                            </FormControl>
                            {hasFiles && (
                              <div className="mt-1.5 text-xs text-gray-500 space-y-1">
                                {filesArray.slice(0, 3).map((file) => (
                                  <div key={file.name} className="truncate">{file.name}</div>
                                ))}
                                {filesArray.length > 3 && <div className="text-gray-400">...and {filesArray.length - 3} more</div>}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Accordion Item 3: Shipping Documents */}
              <AccordionItem value="item-3">
                <AccordionTrigger className="hover:no-underline py-4 text-base font-medium border-b">
                  Shipping Documents
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    {/* Purchase Order */}
                    <FormField
                      control={form.control}
                      name="purchaseOrder"
                      render={({ field: { onChange, onBlur, name, ref } }: { field: ControllerRenderProps<DocumentUploadFormValues, 'purchaseOrder'> }) => {
                        const fileList = form.watch("purchaseOrder");
                        const hasFiles = fileList && fileList.length > 0;
                        const filesArray: File[] = hasFiles ? Array.from(fileList) : [];
                        return (
                          <FormItem className={`p-3 rounded-md transition-colors ${hasFiles ? 'border border-green-200' : ''}`}>
                            <div className="flex justify-between items-center">
                              <FormLabel>
                                Purchase Order*
                              </FormLabel>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => openSampleDocument('purchaseOrder')}
                              >
                                Preview
                              </Button>
                            </div>
                            <FormControl>
                              <Input
                                type="file"
                                multiple
                                name={name}
                                ref={ref}
                                onBlur={onBlur}
                                onChange={(e) => onChange(e.target.files)}
                              />
                            </FormControl>
                            {hasFiles && (
                              <div className="mt-1.5 text-xs text-gray-500 space-y-1">
                                {filesArray.slice(0, 3).map((file) => (
                                  <div key={file.name} className="truncate">{file.name}</div>
                                ))}
                                {filesArray.length > 3 && <div className="text-gray-400">...and {filesArray.length - 3} more</div>}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    {/* MSDS */}
                    <FormField
                      control={form.control}
                      name="msds"
                      render={({ field: { onChange, onBlur, name, ref } }: { field: ControllerRenderProps<DocumentUploadFormValues, 'msds'> }) => {
                        const fileList = form.watch("msds");
                        const hasFiles = fileList && fileList.length > 0;
                        const filesArray: File[] = hasFiles ? Array.from(fileList) : [];
                        return (
                          <FormItem className={`p-3 rounded-md transition-colors ${hasFiles ? 'border border-green-200' : ''}`}>
                            <div className="flex justify-between items-center">
                              <FormLabel>
                                MSDS*
                              </FormLabel>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => openSampleDocument('msds')}
                              >
                                Preview
                              </Button>
                            </div>
                            <FormControl>
                              <Input
                                type="file"
                                multiple
                                name={name}
                                ref={ref}
                                onBlur={onBlur}
                                onChange={(e) => onChange(e.target.files)}
                              />
                            </FormControl>
                            {hasFiles && (
                              <div className="mt-1.5 text-xs text-gray-500 space-y-1">
                                {filesArray.slice(0, 3).map((file) => (
                                  <div key={file.name} className="truncate">{file.name}</div>
                                ))}
                                {filesArray.length > 3 && <div className="text-gray-400">...and {filesArray.length - 3} more</div>}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    {/* Commercial Invoice */}
                    <FormField
                      control={form.control}
                      name="commercialInvoice"
                      render={({ field: { onChange, onBlur, name, ref } }: { field: ControllerRenderProps<DocumentUploadFormValues, 'commercialInvoice'> }) => {
                        const fileList = form.watch("commercialInvoice");
                        const hasFiles = fileList && fileList.length > 0;
                        const filesArray: File[] = hasFiles ? Array.from(fileList) : [];
                        return (
                          <FormItem className={`p-3 rounded-md transition-colors ${hasFiles ? 'border border-green-200' : ''}`}>
                            <div className="flex justify-between items-center">
                              <FormLabel>
                                Commercial Invoice*
                              </FormLabel>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => openSampleDocument('commercialInvoice')}
                              >
                                Preview
                              </Button>
                            </div>
                            <FormControl>
                              <Input
                                type="file"
                                multiple
                                name={name}
                                ref={ref}
                                onBlur={onBlur}
                                onChange={(e) => onChange(e.target.files)}
                              />
                            </FormControl>
                            {hasFiles && (
                              <div className="mt-1.5 text-xs text-gray-500 space-y-1">
                                {filesArray.slice(0, 3).map((file) => (
                                  <div key={file.name} className="truncate">{file.name}</div>
                                ))}
                                {filesArray.length > 3 && <div className="text-gray-400">...and {filesArray.length - 3} more</div>}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    {/* Packing List */}
                    <FormField
                      control={form.control}
                      name="packingList"
                      render={({ field: { onChange, onBlur, name, ref } }: { field: ControllerRenderProps<DocumentUploadFormValues, 'packingList'> }) => {
                        const fileList = form.watch("packingList");
                        const hasFiles = fileList && fileList.length > 0;
                        const filesArray: File[] = hasFiles ? Array.from(fileList) : [];
                        return (
                          <FormItem className={`p-3 rounded-md transition-colors ${hasFiles ? 'border border-green-200' : ''}`}>
                            <div className="flex justify-between items-center">
                              <FormLabel>
                                Packing List*
                              </FormLabel>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => openSampleDocument('packingList')}
                              >
                                Preview
                              </Button>
                            </div>
                            <FormControl>
                              <Input
                                type="file"
                                multiple
                                name={name}
                                ref={ref}
                                onBlur={onBlur}
                                onChange={(e) => onChange(e.target.files)}
                              />
                            </FormControl>
                            {hasFiles && (
                              <div className="mt-1.5 text-xs text-gray-500 space-y-1">
                                {filesArray.slice(0, 3).map((file) => (
                                  <div key={file.name} className="truncate">{file.name}</div>
                                ))}
                                {filesArray.length > 3 && <div className="text-gray-400">...and {filesArray.length - 3} more</div>}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Button type="submit" className="w-full mt-8" disabled={isUploading}>
               {isUploading ? (
                 "Uploading..."
               ) : (
                 "Submit Documents"
               )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}