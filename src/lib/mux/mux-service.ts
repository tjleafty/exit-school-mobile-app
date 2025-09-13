import Mux from '@mux/mux-node'

if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
  throw new Error('MUX_TOKEN_ID and MUX_TOKEN_SECRET environment variables are required')
}

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
})

export interface MuxUploadResult {
  uploadId: string
  uploadUrl: string
  assetId?: string
}

export interface MuxAssetInfo {
  id: string
  status: 'preparing' | 'ready' | 'errored'
  playbackId?: string
  duration?: number
  aspectRatio?: string
  maxStoredFrameRate?: number
  maxStoredResolution?: string
}

export class MuxService {
  static async createDirectUpload(options: {
    corsOrigin: string
    test?: boolean
  }): Promise<MuxUploadResult> {
    try {
      const upload = await mux.video.uploads.create({
        cors_origin: options.corsOrigin,
        new_asset_settings: {
          playback_policy: ['signed'], // Secure by default
          test: options.test,
        },
      })

      return {
        uploadId: upload.id,
        uploadUrl: upload.url,
        assetId: upload.asset_id,
      }
    } catch (error) {
      console.error('Mux upload creation failed:', error)
      throw new Error('Failed to create video upload')
    }
  }

  static async getAsset(assetId: string): Promise<MuxAssetInfo | null> {
    try {
      const asset = await mux.video.assets.get(assetId)
      
      return {
        id: asset.id,
        status: asset.status as 'preparing' | 'ready' | 'errored',
        playbackId: asset.playback_ids?.[0]?.id,
        duration: asset.duration,
        aspectRatio: asset.aspect_ratio,
        maxStoredFrameRate: asset.max_stored_frame_rate,
        maxStoredResolution: asset.max_stored_resolution,
      }
    } catch (error) {
      console.error('Failed to get Mux asset:', error)
      return null
    }
  }

  static async createPlaybackId(assetId: string, policy: 'public' | 'signed' = 'signed'): Promise<string | null> {
    try {
      const playbackId = await mux.video.assets.createPlaybackId(assetId, {
        policy,
      })
      
      return playbackId.id
    } catch (error) {
      console.error('Failed to create playback ID:', error)
      return null
    }
  }

  static async deleteAsset(assetId: string): Promise<boolean> {
    try {
      await mux.video.assets.del(assetId)
      return true
    } catch (error) {
      console.error('Failed to delete Mux asset:', error)
      return false
    }
  }

  static generateSignedPlaybackUrl(playbackId: string, options?: {
    expiresIn?: number // seconds, default 1 hour
    type?: 'video' | 'thumbnail' | 'gif'
  }): string {
    const expiresIn = options?.expiresIn || 3600 // 1 hour default
    const type = options?.type || 'video'
    
    try {
      if (type === 'video') {
        return Mux.utils.signPlaybackId(playbackId, {
          type: 'video',
          expiration: Math.floor(Date.now() / 1000) + expiresIn,
        })
      } else if (type === 'thumbnail') {
        return Mux.utils.signPlaybackId(playbackId, {
          type: 'thumbnail',
          expiration: Math.floor(Date.now() / 1000) + expiresIn,
        })
      } else {
        return Mux.utils.signPlaybackId(playbackId, {
          type: 'gif',
          expiration: Math.floor(Date.now() / 1000) + expiresIn,
        })
      }
    } catch (error) {
      console.error('Failed to generate signed URL:', error)
      throw new Error('Failed to generate signed video URL')
    }
  }

  static verifyWebhookSignature(body: string, signature: string): boolean {
    if (!process.env.MUX_WEBHOOK_SECRET) {
      console.error('MUX_WEBHOOK_SECRET not configured')
      return false
    }

    try {
      return Mux.utils.verifyWebhookSignature(body, signature, process.env.MUX_WEBHOOK_SECRET)
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return false
    }
  }
}