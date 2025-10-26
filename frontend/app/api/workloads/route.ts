import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Workload } from '@/types/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')

    const { data, error } = await supabase
      .from('workloads')
      .select('*, namespaces(name, clusters(name))')
      .order('name')
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch workloads' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...updates } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing workload id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('workloads')
      .update(updates)
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update workload' }, { status: 500 })
  }
}