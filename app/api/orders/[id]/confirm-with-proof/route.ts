import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

/**
 * POST /api/orders/[id]/confirm-with-proof
 *
 * Proxy al backend para confirmar entrega con evidencia
 * Requiere autenticación JWT
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    const body = await request.json()

    // Validar datos requeridos
    if (!body.photoBase64 || !body.signatureBase64) {
      return NextResponse.json(
        { error: 'Se requieren foto y firma' },
        { status: 400 }
      )
    }

    // Obtener sesión/token
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Llamar al backend en Render
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
    const response = await fetch(
      `${backendUrl}/v1/orders/${orderId}/confirm-with-proof`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          photoBase64: body.photoBase64,
          signatureBase64: body.signatureBase64,
          deliveryNote: body.deliveryNote || '',
          qrCode: body.qrCode || '',
          lat: body.lat || 0,
          lng: body.lng || 0
        })
      }
    )

    const data = await response.json()

    // Propagar status code y respuesta
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error in confirm-with-proof:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error procesando solicitud'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/orders/[id]/confirm-with-proof
 *
 * Obtener estado de evidencia para una orden
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

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
    const response = await fetch(
      `${backendUrl}/v1/orders/${orderId}/evidence`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      }
    )

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error getting evidence:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error obteniendo evidencia'
      },
      { status: 500 }
    )
  }
}
