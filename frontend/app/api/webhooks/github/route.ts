import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Verify GitHub webhook signature (in production, you should implement this)
function verifySignature(payload: string, signature: string, secret: string): boolean {
  // In a real implementation, you would use crypto to verify the signature
  // This is a simplified version for demonstration
  return true
}

export async function POST(request: Request) {
  try {
    // Get the GitHub signature from headers
    const signature = request.headers.get('x-hub-signature-256')
    const eventType = request.headers.get('x-github-event')
    
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }
    
    if (!eventType) {
      return NextResponse.json({ error: 'Missing event type' }, { status: 400 })
    }
    
    // In production, verify the signature with your GitHub webhook secret
    // const secret = process.env.GITHUB_WEBHOOK_SECRET
    // if (!secret || !verifySignature(await request.text(), signature, secret)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }
    
    const payload = await request.json()
    
    // Handle different GitHub events
    if (eventType === 'pull_request') {
      const { action, pull_request, repository } = payload
      
      // Only process opened, reopened, or synchronize events
      if (['opened', 'reopened', 'synchronize'].includes(action)) {
        // Create a PR event record
        const prEvent = {
          pr_number: pull_request.number,
          repo_full_name: repository.full_name,
          pr_url: pull_request.html_url,
          timestamp: new Date().toISOString(),
          delta_cost_usd: 0, // This would be calculated by your analysis
          delta_carbon_gco2e: 0, // This would be calculated by your analysis
          risk_assessment: 'pending', // This would be calculated by your analysis
          workload_id: null // This would be determined by your analysis
        }
        
        // Insert the PR event into the database
        const { data, error } = await supabase
          .from('pr_events')
          .insert(prEvent)
          .select()
        
        if (error) {
          console.error('Error inserting PR event:', error)
          return NextResponse.json({ error: 'Failed to process PR event' }, { status: 500 })
        }
        
        return NextResponse.json({ message: 'PR event processed', data })
      }
    }
    
    // For other events, return success but no action
    return NextResponse.json({ message: 'Event received but not processed' })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
}