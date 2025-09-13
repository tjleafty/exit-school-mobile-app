// Test script to verify API configurations
// Run with: node scripts/test-apis.js

require('dotenv').config({ path: '.env' })

async function testMuxConnection() {
  try {
    console.log('🎥 Testing Mux connection...')
    
    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
      console.error('❌ Mux credentials not found in environment variables')
      return false
    }

    const response = await fetch('https://api.mux.com/video/v1/assets?limit=1', {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      console.log('✅ Mux connection successful')
      return true
    } else {
      console.error('❌ Mux connection failed:', response.status, response.statusText)
      return false
    }
  } catch (error) {
    console.error('❌ Mux connection error:', error.message)
    return false
  }
}

async function testCloudflareR2Connection() {
  try {
    console.log('☁️ Testing Cloudflare R2 connection...')
    
    const requiredVars = [
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_R2_ACCESS_KEY_ID', 
      'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
      'CLOUDFLARE_R2_BUCKET_NAME'
    ]

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        console.error(`❌ Missing environment variable: ${varName}`)
        return false
      }
    }

    // Test by trying to list bucket (simplified test)
    console.log('✅ Cloudflare R2 credentials found (actual connection test requires AWS SDK setup)')
    return true
  } catch (error) {
    console.error('❌ Cloudflare R2 test error:', error.message)
    return false
  }
}

async function testZoomConnection() {
  try {
    console.log('🔗 Testing Zoom configuration...')
    
    if (!process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_CLIENT_SECRET) {
      console.error('❌ Zoom credentials not found in environment variables')
      return false
    }

    console.log('✅ Zoom credentials found (OAuth flow test requires full setup)')
    return true
  } catch (error) {
    console.error('❌ Zoom test error:', error.message)
    return false
  }
}

async function runTests() {
  console.log('🧪 Running API Configuration Tests...\n')
  
  const muxOk = await testMuxConnection()
  console.log('')
  
  const r2Ok = await testCloudflareR2Connection()
  console.log('')
  
  const zoomOk = await testZoomConnection()
  console.log('')
  
  console.log('📊 Test Results:')
  console.log(`Mux: ${muxOk ? '✅' : '❌'}`)
  console.log(`Cloudflare R2: ${r2Ok ? '✅' : '❌'}`)
  console.log(`Zoom: ${zoomOk ? '✅' : '❌'}`)
  
  if (muxOk && r2Ok && zoomOk) {
    console.log('\n🎉 All API configurations look good!')
  } else {
    console.log('\n⚠️ Some configurations need attention. Check the errors above.')
  }
}

runTests().catch(console.error)