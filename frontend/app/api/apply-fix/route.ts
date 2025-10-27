import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { opportunityId, createPr } = body
    
    // Get the backend URL from environment variables
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'
    
    // Fetch the opportunity details from Supabase
    // In a real implementation, you would validate the user and check permissions here
    
    // Call backend to get the YAML patch
    const recommendationResponse = await fetch(`${BACKEND_URL}/recommendations/${opportunityId}`)
    
    if (!recommendationResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch recommendation' }, 
        { status: recommendationResponse.status }
      )
    }
    
    const recommendationData = await recommendationResponse.json()
    
    // Extract the patch from the recommendation data
    const patch = recommendationData.yaml_patch
    
    if (createPr) {
      // In a real implementation, this would call the backend to create a PR
      // For now, we'll return a mock response
      return NextResponse.json({
        success: true,
        pr: {
          url: 'https://github.com/example/repo/pull/1',
          number: 1,
          title: `Optimize resources for ${recommendationData.workload.name}`
        }
      })
    }
    
    // Return the patch for download
    return NextResponse.json({ 
      success: true, 
      patch,
      kubectlCommand: `echo "${patch.replace(/"/g, '\\"')}" | kubectl apply -f -`
    })
    
  } catch (error) {
    console.error('Error applying fix:', error)
    return NextResponse.json(
      { error: 'Failed to apply fix' }, 
      { status: 500 }
    )
  }
}