import { NextRequest, NextResponse } from 'next/server'
import { MuxService } from '@/lib/mux/mux-service'
import { PrismaClient, VideoStatus } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('mux-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Convert headers to Record<string, string>
    const headersRecord: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headersRecord[key] = value
    })

    // Verify webhook signature
    if (!MuxService.verifyWebhookSignature(body, headersRecord)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    console.log('Mux webhook received:', event.type)

    switch (event.type) {
      case 'video.asset.ready':
        await handleAssetReady(event)
        break
      
      case 'video.asset.errored':
        await handleAssetError(event)
        break
      
      case 'video.upload.asset_created':
        await handleUploadAssetCreated(event)
        break
      
      default:
        console.log('Unhandled webhook event:', event.type)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Mux webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleAssetReady(event: any) {
  const assetId = event.data.id
  console.log('Asset ready:', assetId)

  try {
    // Get asset details from Mux
    const muxAsset = await MuxService.getAsset(assetId)
    if (!muxAsset) {
      console.error('Could not fetch asset details from Mux')
      return
    }

    // Create a playback ID if it doesn't exist
    let playbackId = muxAsset.playbackId
    if (!playbackId) {
      const newPlaybackId = await MuxService.createPlaybackId(assetId, 'signed')
      playbackId = newPlaybackId || undefined
    }

    // Update the database record
    const videoAsset = await prisma.videoAsset.findFirst({
      where: { muxAssetId: assetId }
    })

    if (videoAsset) {
      await prisma.videoAsset.update({
        where: { id: videoAsset.id },
        data: {
          status: VideoStatus.READY,
          muxPlaybackId: playbackId,
          duration: muxAsset.duration || null,
          thumbnailUrl: playbackId 
            ? `https://image.mux.com/${playbackId}/thumbnail.jpg`
            : null,
          updatedAt: new Date(),
        }
      })

      // Update lesson duration if available
      if (muxAsset.duration) {
        await prisma.lesson.update({
          where: { id: videoAsset.lessonId },
          data: {
            duration: Math.round(muxAsset.duration / 60), // Convert to minutes
            updatedAt: new Date(),
          }
        })
      }

      console.log('Video asset updated successfully:', videoAsset.id)
    } else {
      console.error('Video asset not found in database for Mux asset:', assetId)
    }

  } catch (error) {
    console.error('Error handling asset ready:', error)
  }
}

async function handleAssetError(event: any) {
  const assetId = event.data.id
  console.log('Asset errored:', assetId)

  try {
    const videoAsset = await prisma.videoAsset.findFirst({
      where: { muxAssetId: assetId }
    })

    if (videoAsset) {
      await prisma.videoAsset.update({
        where: { id: videoAsset.id },
        data: {
          status: VideoStatus.ERROR,
          updatedAt: new Date(),
        }
      })

      console.log('Video asset marked as errored:', videoAsset.id)
    }

  } catch (error) {
    console.error('Error handling asset error:', error)
  }
}

async function handleUploadAssetCreated(event: any) {
  const assetId = event.data.asset_id
  const uploadId = event.data.id
  console.log('Upload asset created:', { uploadId, assetId })

  try {
    // Find video asset by upload and update with asset ID
    const videoAsset = await prisma.videoAsset.findFirst({
      where: { 
        muxAssetId: null,
        // You might need to store upload ID to match this properly
      }
    })

    if (videoAsset && !videoAsset.muxAssetId) {
      await prisma.videoAsset.update({
        where: { id: videoAsset.id },
        data: {
          muxAssetId: assetId,
          status: VideoStatus.PROCESSING,
          updatedAt: new Date(),
        }
      })

      console.log('Video asset updated with Mux asset ID:', videoAsset.id)
    }

  } catch (error) {
    console.error('Error handling upload asset created:', error)
  }
}