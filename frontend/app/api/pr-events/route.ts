import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { PREvent } from '@/types/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const { data, error } = await supabase
      .from('pr_events')
      .select('*, workloads(name, kind)')
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch PR events' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const eventData = await request.json()

    const { data, error } = await supabase
      .from('pr_events')
      .insert(eventData)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create PR event' }, { status: 500 })
  }
}