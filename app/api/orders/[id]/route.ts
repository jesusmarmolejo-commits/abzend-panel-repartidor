import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

/**
 * GET /api/orders/[id]
 *
 * Obtener detalles de una orden
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Obtener orden desde Supabase directamente (más rápido que backend)
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, tracking_code, qr_code, recipient_name, dest_address, status, dest_lat, dest_lng')
      .eq('id', orderId)
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error in GET /api/orders/[id]:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error obteniendo orden'
      },
      { status: 500 }
    )
  }
}
