import { DocumentUploadForm } from "@/components/document-upload-form";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gray-50">
      <div className="w-full max-w-4xl">
        <DocumentUploadForm />
      </div>
    </main>
  );
}