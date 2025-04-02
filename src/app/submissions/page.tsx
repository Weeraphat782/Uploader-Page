// src/app/submissions/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns'; // For formatting dates
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from 'lucide-react';
import { File as FileIcon } from 'lucide-react'; // Import File icon, aliased to avoid conflict

// Define the structure of a submission based on your table
interface Submission {
  id: string;
  company_name: string;
  document_paths: Record<string, string[]> | null; // Expecting JSONB
  uploaded_at: string;
}

// Function to format document type keys into readable names
const formatDocType = (docType: string): string => {
  return docType
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter
};

// Helper function to get public URL
const getPublicUrl = (path: string): string => {
  const { data } = supabase.storage.from('customer-documents').getPublicUrl(path);
  return data?.publicUrl || '#';
};

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("customer_documents_multi")
          .select("id, company_name, document_paths, uploaded_at")
          .order("uploaded_at", { ascending: false });

        if (error) {
          console.error("Error fetching submissions:", error);
          setError("Failed to load submissions. " + error.message);
          return;
        }

        setSubmissions(data || []);
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold mb-8 text-center">Document Submissions</h1>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && submissions.length === 0 && (
        <p className="text-center text-gray-500">No submissions found.</p>
      )}

      {!loading && !error && submissions.length > 0 && (
        <div className="space-y-6">
          {submissions.map((submission) => (
            <Collapsible
              key={submission.id}
              open={openStates[submission.id] ?? false}
              onOpenChange={(isOpen: boolean) => 
                setOpenStates(prev => ({ ...prev, [submission.id]: isOpen }))
              }
            >
              <Card className="border shadow-sm bg-white">
                <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
                  <div>
                    <CardTitle className="text-xl font-semibold">{submission.company_name}</CardTitle>
                    <CardDescription>
                      Submitted on: {format(new Date(submission.uploaded_at), 'PPPpp')}
                    </CardDescription>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon">
                      {openStates[submission.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <span className="sr-only">Toggle details</span>
                    </Button>
                  </CollapsibleTrigger>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="pt-4 pb-4 px-4">
                    <h4 className="font-semibold mb-3 mt-2">Uploaded Documents:</h4>
                    {!submission.document_paths || Object.keys(submission.document_paths).length === 0 ? (
                      <p className="text-sm text-gray-500">No documents found for this submission.</p>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(submission.document_paths)
                          .filter(([, paths]) => paths && paths.length > 0)
                          .map(([docType, paths]) => (
                          <div key={docType}>
                            <h5 className="font-medium text-sm mb-1">{formatDocType(docType)}:</h5>
                            <div className="flex flex-wrap gap-2">
                              {paths.map((path) => {
                                const fileName = path.substring(path.lastIndexOf('/') + 1);
                                const publicUrl = getPublicUrl(path);
                                return (
                                  <a
                                    key={path}
                                    href={publicUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block"
                                  >
                                    <Badge variant="secondary" className="flex items-center gap-1.5">
                                      <FileIcon className="h-3 w-3" />
                                      <span>{fileName || path}</span>
                                    </Badge>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        ))
                        .concat(
                          Object.values(submission.document_paths).every(paths => !paths || paths.length === 0) ? 
                          [<p key="no-docs-filtered" className="text-sm text-gray-500">No documents found for this submission type.</p>] : 
                          []
                        )}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </main>
  );
}
