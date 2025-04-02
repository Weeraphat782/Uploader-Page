import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Create a Supabase client specific to this route handler
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string;
    const companyName = formData.get('companyName') as string;
    
    if (!file || !folder || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create safe company name for path
    const safeCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

    // Sanitize the original filename for storage path
    const originalName = file.name;
    const fileExtension = originalName.split('.').pop() || '';
    const baseName = originalName.substring(0, originalName.lastIndexOf('.') || originalName.length);

    // Remove non-ASCII chars, replace spaces/multiple special chars with single underscore
    const safeBaseName = baseName
      .normalize('NFD') // Normalize accents/special chars if needed
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (accents)
      .replace(/[^a-zA-Z0-9.\-_]/g, '_') // Replace invalid chars with _
      .replace(/_+/g, '_'); // Collapse multiple underscores

    const timestamp = Date.now();
    const storageFileName = `${safeCompanyName}_${safeBaseName}_${timestamp}.${fileExtension}`;
    
    // Get file data as array buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from('customer-documents')
      .upload(`${folder}/${storageFileName}`, buffer, {
        contentType: file.type,
      });
    
    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ path: data.path });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error occurred' },
      { status: 500 }
    );
  }
}