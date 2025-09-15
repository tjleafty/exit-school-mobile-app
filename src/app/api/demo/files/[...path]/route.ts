import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join('/')
    
    console.log(`Demo file server: Serving file ${filePath}`)

    // In demo mode, we don't actually store files, so we return a placeholder response
    const fileName = filePath.split('/').pop() || 'document'
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'txt'
    
    // Generate appropriate content type
    const contentTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'zip': 'application/zip'
    }
    
    const contentType = contentTypes[fileExtension] || 'application/octet-stream'
    
    // Return a demo response
    const demoContent = `Demo file: ${fileName}\nThis is a placeholder for the uploaded file.\nIn production, this would be served from Cloudflare R2.`
    
    return new Response(demoContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'X-Demo-Mode': 'true'
      }
    })

  } catch (error) {
    console.error('Demo file server error:', error)
    return new Response('File not found', { status: 404 })
  }
}