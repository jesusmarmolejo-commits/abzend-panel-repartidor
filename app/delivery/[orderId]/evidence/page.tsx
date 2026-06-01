'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import EvidenceCapture from '@/components/EvidenceCapture'

interface Order {
  id: string
  tracking_code: string
  qr_code: string
  recipient_name: string
  dest_address: string
  status: string
}

export default function EvidencePage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true)
        setError('')

        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push('/login')
          return
        }

        // Obtener datos de la orden
        const response = await fetch(`/api/orders/${orderId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (!response.ok) {
          throw new Error('Orden no encontrada')
        }

        const data = await response.json()
        setOrder(data.order)

        // Validar estado
        if (data.order.status === 'delivered') {
          setError('Esta orden ya ha sido entregada')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar la orden'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      fetchOrder()
    }
  }, [orderId, router])

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>
          <div style={styles.spinner} />
          <p>Cargando orden...</p>
        </div>
      </div>
    )
  }

  if (error && error.includes('ya ha sido entregada')) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#A32D2D' }}>
            ⚠️ Orden Entregada
          </h1>
          <p style={{ color: '#666', marginTop: 12 }}>
            {error}
          </p>
          <button
            onClick={() => router.back()}
            style={{
              marginTop: 24,
              padding: '12px 24px',
              background: '#0F6E56',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            ← Volver
          </button>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#A32D2D' }}>
            ❌ Orden no encontrada
          </h1>
          <p style={{ color: '#666', marginTop: 12 }}>
            No pudimos encontrar la orden especificada.
          </p>
          <button
            onClick={() => router.back()}
            style={{
              marginTop: 24,
              padding: '12px 24px',
              background: '#0F6E56',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            ← Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.mainContainer}>
      {/* Header con detalles de orden */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.headerTitle}>Evidencia de Entrega</h1>
          <div style={styles.orderInfo}>
            <div style={styles.infoItem}>
              <span style={styles.label}>Código:</span>
              <span style={styles.value}>{order.tracking_code}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.label}>Cliente:</span>
              <span style={styles.value}>{order.recipient_name}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.label}>Dirección:</span>
              <span style={styles.value}>{order.dest_address}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => router.back()}
          style={styles.backButton}
          title="Volver"
        >
          ← Atrás
        </button>
      </div>

      {/* Componente de captura */}
      {success ? (
        <div style={styles.successContainer}>
          <div style={styles.successBox}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={styles.successTitle}>¡Entrega Registrada!</h2>
            <p style={styles.successMessage}>
              La evidencia de entrega ha sido guardada exitosamente.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              style={styles.successButton}
            >
              Ir al Dashboard
            </button>
          </div>
        </div>
      ) : (
        <EvidenceCapture
          orderId={orderId}
          orderQrCode={order.qr_code}
          onSuccess={() => setSuccess(true)}
          onError={setError}
        />
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  mainContainer: {
    minHeight: '100vh',
    background: '#f5f5f5'
  },
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  header: {
    background: '#fff',
    borderBottom: '1px solid #e0e0e0',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  headerContent: {
    flex: 1
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#222',
    margin: '0 0 16px 0'
  },
  orderInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: 12
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  label: {
    fontSize: 12,
    color: '#999',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: 500
  },
  backButton: {
    padding: '10px 16px',
    background: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
    color: '#666'
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '24px',
    maxWidth: 600,
    width: '100%',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  loadingBox: {
    textAlign: 'center',
    padding: 60,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16
  },
  spinner: {
    width: 50,
    height: 50,
    border: '4px solid #f0f0f0',
    borderTop: '4px solid #0F6E56',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  successContainer: {
    minHeight: 'calc(100vh - 150px)',
    padding: '40px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  successBox: {
    background: '#fff',
    borderRadius: 12,
    padding: '40px',
    maxWidth: 500,
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '2px solid #86EFAC'
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 20
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#166534',
    margin: '0 0 12px 0'
  },
  successMessage: {
    fontSize: 14,
    color: '#666',
    margin: '0 0 24px 0'
  },
  successButton: {
    padding: '12px 24px',
    background: '#0F6E56',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%'
  }
}
