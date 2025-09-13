import { NextRequest, NextResponse } from 'next/server'
import { ZoomService } from '@/lib/integrations/zoom-service'
import { createHash, createHmac } from 'crypto'

const ZOOM_WEBHOOK_SECRET = process.env.ZOOM_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('authorization')
    
    // Verify webhook signature if secret is configured
    if (ZOOM_WEBHOOK_SECRET && signature) {
      const hash = createHmac('sha256', ZOOM_WEBHOOK_SECRET)
        .update(body)
        .digest('hex')
      
      const expectedSignature = `v0=${hash}`
      
      if (signature !== expectedSignature) {
        console.error('Invalid Zoom webhook signature')
        return NextResponse.json({ 
          error: 'Invalid signature' 
        }, { status: 401 })
      }
    }

    const payload = JSON.parse(body)
    
    // Handle the webhook
    await ZoomService.handleWebhook(payload)

    return NextResponse.json({ 
      success: true,
      message: 'Webhook processed successfully' 
    })

  } catch (error) {
    console.error('Error processing Zoom webhook:', error)
    return NextResponse.json({ 
      error: 'Failed to process webhook' 
    }, { status: 500 })
  }
}

// Handle Zoom webhook verification challenge
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const challenge = searchParams.get('challenge')

    if (challenge) {
      // This is Zoom's webhook URL verification
      return new Response(challenge, {
        headers: {
          'Content-Type': 'text/plain'
        }
      })
    }

    return NextResponse.json({ 
      error: 'Challenge parameter required for verification' 
    }, { status: 400 })

  } catch (error) {
    console.error('Error handling Zoom webhook verification:', error)
    return NextResponse.json({ 
      error: 'Failed to verify webhook' 
    }, { status: 500 })
  }
}