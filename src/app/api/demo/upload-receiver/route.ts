import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const assetId = searchParams.get('assetId')
    const key = searchParams.get('key')

    // Get the uploaded file
    const file = await request.blob()
    
    console.log(`Demo upload receiver: ${type} file received`, {
      size: file.size,
      type: file.type,
      assetId,
      key
    })

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (type === 'video') {
      console.log(`Demo: Video upload completed for asset ${assetId}`)
      return new Response('Video upload successful', { status: 200 })
    } else if (type === 'document') {
      console.log(`Demo: Document upload completed for key ${key}`)
      return new Response('Document upload successful', { status: 200 })
    }

    return new Response('Upload successful', { status: 200 })

  } catch (error) {
    console.error('Demo upload receiver error:', error)
    return new Response('Upload failed', { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Handle multipart form uploads if needed
  return PUT(request)
}