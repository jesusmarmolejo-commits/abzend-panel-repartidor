'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface EvidenceCaptureProps {
  orderId: string
  orderQrCode?: string
  onSuccess: () => void
  onError?: (error: string) => void
}

type CaptureStep = 'qr' | 'photo' | 'signature' | 'note' | 'review' | 'submitting'

interface CapturedEvidence {
  qrCode: string
  photo: string | null
  signature: string | null
  note: string
}

export default function EvidenceCapture({
  orderId,
  orderQrCode,
  onSuccess,
  onError
}: EvidenceCaptureProps) {
  const [step, setStep] = useState<CaptureStep>(orderQrCode ? 'photo' : 'qr')
  const [evidence, setEvidence] = useState<CapturedEvidence>({
    qrCode: orderQrCode || '',
    photo: null,
    signature: null,
    note: ''
  })
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Refs para captura
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null)
  const signatureContextRef = useRef<CanvasRenderingContext2D | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estado para canvas de firma
  const [isDrawing, setIsDrawing] = useState(false)

  // ═══════════════════════════════════════════════════════
  // QR SCANNING
  // ═══════════════════════════════════════════════════════

  const startCameraForQR = async () => {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo acceder a la cámara'
      setError(message)
      onError?.(message)
    }
  }

  const manualQRInput = () => {
    const qr = prompt('Ingresa el código QR manualmente:')
    if (qr && qr.trim()) {
      setEvidence(prev => ({ ...prev, qrCode: qr.trim() }))
      setStep('photo')
      stopCamera()
    }
  }

  // ═══════════════════════════════════════════════════════
  // PHOTO CAPTURE
  // ═══════════════════════════════════════════════════════

  const startCameraForPhoto = async () => {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo acceder a la cámara'
      setError(message)
      onError?.(message)
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const context = canvasRef.current.getContext('2d')
    if (!context) return

    canvasRef.current.width = videoRef.current.videoWidth
    canvasRef.current.height = videoRef.current.videoHeight
    context.drawImage(videoRef.current, 0, 0)

    const photoData = canvasRef.current.toDataURL('image/jpeg', 0.8)
    setEvidence(prev => ({ ...prev, photo: photoData }))
    stopCamera()
    setStep('signature')
  }

  const useGalleryPhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handlePhotoFromGallery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const photoData = event.target?.result as string
      setEvidence(prev => ({ ...prev, photo: photoData }))
      stopCamera()
      setStep('signature')
    }
    reader.readAsDataURL(file)
  }

  // ═══════════════════════════════════════════════════════
  // SIGNATURE CAPTURE (Canvas Drawing)
  // ═══════════════════════════════════════════════════════

  useEffect(() => {
    if (step === 'signature' && signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight

      const context = canvas.getContext('2d')
      if (context) {
        context.lineCap = 'round'
        context.lineJoin = 'round'
        context.lineWidth = 3
        context.strokeStyle = '#000'
        signatureContextRef.current = context
      }
    }
  }, [step])

  const handleSignatureMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDrawing(true)
    signatureContextRef.current?.beginPath()
    signatureContextRef.current?.moveTo(x, y)
  }

  const handleSignatureMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !signatureCanvasRef.current) return

    const canvas = signatureCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    signatureContextRef.current?.lineTo(x, y)
    signatureContextRef.current?.stroke()
  }

  const handleSignatureMouseUp = () => {
    setIsDrawing(false)
    signatureContextRef.current?.closePath()
  }

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current
    if (!canvas || !signatureContextRef.current) return
    signatureContextRef.current.clearRect(0, 0, canvas.width, canvas.height)
  }

  const confirmSignature = () => {
    if (!signatureCanvasRef.current) return
    const sigData = signatureCanvasRef.current.toDataURL('image/png')

    // Verificar que no esté vacía (simple check)
    if (sigData === 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==') {
      setError('Por favor dibuja tu firma')
      return
    }

    setEvidence(prev => ({ ...prev, signature: sigData }))
    setStep('note')
  }

  // ═══════════════════════════════════════════════════════
  // NOTE INPUT
  // ═══════════════════════════════════════════════════════

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEvidence(prev => ({ ...prev, note: e.target.value }))
  }

  // ═══════════════════════════════════════════════════════
  // SUBMISSION
  // ═══════════════════════════════════════════════════════

  const handleSubmit = async () => {
    if (!evidence.qrCode || !evidence.photo || !evidence.signature) {
      setError('Se requieren: QR, foto y firma')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('No autenticado. Inicia sesión nuevamente.')
      }

      // Obtener ubicación actual
      let lat = 0, lng = 0
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationCoordinates>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos.coords),
            (err) => {
              console.warn('Geolocation error:', err)
              resolve({ latitude: 0, longitude: 0 } as any)
            },
            { timeout: 5000 }
          )
        })
        lat = position.latitude
        lng = position.longitude
      }

      // Llamar al endpoint del backend
      const response = await fetch(`/api/orders/${orderId}/confirm-with-proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoBase64: evidence.photo,
          signatureBase64: evidence.signature,
          deliveryNote: evidence.note || '',
          qrCode: evidence.qrCode,
          lat,
          lng
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al confirmar entrega')
      }

      // Éxito
      onSuccess()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      onError?.(message)
    } finally {
      setIsProcessing(false)
    }
  }

  // ═══════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const resetCapture = () => {
    stopCamera()
    setEvidence({ qrCode: orderQrCode || '', photo: null, signature: null, note: '' })
    setStep(orderQrCode ? 'photo' : 'qr')
    setError('')
  }

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>📦 Registrar Evidencia de Entrega</h1>

        {error && <div style={styles.error}>{error}</div>}

        {/* QR STEP */}
        {step === 'qr' && (
          <div style={styles.step}>
            <h2 style={styles.stepTitle}>1️⃣ Escanear Código QR</h2>
            <p style={styles.subtitle}>Apunta la cámara al código QR de la orden</p>

            <video
              ref={videoRef}
              style={styles.video}
              playsInline
              onLoadedMetadata={startCameraForQR}
            />

            <div style={styles.buttonGroup}>
              <button
                onClick={startCameraForQR}
                style={styles.primaryButton}
              >
                🎥 Iniciar Cámara
              </button>
              <button
                onClick={manualQRInput}
                style={styles.secondaryButton}
              >
                ✏️ Ingresar Manualmente
              </button>
            </div>

            {evidence.qrCode && (
              <div style={styles.infoBox}>
                ✅ QR escaneado: <strong>{evidence.qrCode}</strong>
                <button onClick={() => setStep('photo')} style={styles.continueButton}>
                  Continuar →
                </button>
              </div>
            )}
          </div>
        )}

        {/* PHOTO STEP */}
        {step === 'photo' && (
          <div style={styles.step}>
            <h2 style={styles.stepTitle}>2️⃣ Foto de Entrega</h2>
            <p style={styles.subtitle}>Captura una foto clara del paquete entregado</p>

            {!evidence.photo ? (
              <>
                <video
                  ref={videoRef}
                  style={styles.video}
                  playsInline
                  onLoadedMetadata={startCameraForPhoto}
                />

                <div style={styles.buttonGroup}>
                  <button
                    onClick={startCameraForPhoto}
                    style={styles.primaryButton}
                  >
                    🎥 Iniciar Cámara
                  </button>
                  <button
                    onClick={useGalleryPhoto}
                    style={styles.secondaryButton}
                  >
                    🖼️ De Galería
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFromGallery}
                  style={{ display: 'none' }}
                />
              </>
            ) : (
              <>
                <img src={evidence.photo} style={styles.previewImage} alt="Foto capturada" />
                <div style={styles.buttonGroup}>
                  <button
                    onClick={() => setEvidence(prev => ({ ...prev, photo: null }))}
                    style={styles.secondaryButton}
                  >
                    🔄 Recapturar
                  </button>
                  <button
                    onClick={() => setStep('signature')}
                    style={styles.primaryButton}
                  >
                    Continuar →
                  </button>
                </div>
              </>
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}

        {/* SIGNATURE STEP */}
        {step === 'signature' && (
          <div style={styles.step}>
            <h2 style={styles.stepTitle}>3️⃣ Firma del Cliente</h2>
            <p style={styles.subtitle}>El cliente debe firmar en el área de abajo</p>

            <canvas
              ref={signatureCanvasRef}
              style={styles.signatureCanvas}
              onMouseDown={handleSignatureMouseDown}
              onMouseMove={handleSignatureMouseMove}
              onMouseUp={handleSignatureMouseUp}
              onMouseLeave={handleSignatureMouseUp}
            />

            <div style={styles.buttonGroup}>
              <button onClick={clearSignature} style={styles.dangerButton}>
                🗑️ Limpiar
              </button>
              <button onClick={confirmSignature} style={styles.primaryButton}>
                ✅ Confirmar Firma
              </button>
            </div>

            {evidence.signature && (
              <div style={styles.infoBox}>
                ✅ Firma capturada
                <button
                  onClick={() => setEvidence(prev => ({ ...prev, signature: null }))}
                  style={styles.smallLink}
                >
                  (Cambiar)
                </button>
              </div>
            )}
          </div>
        )}

        {/* NOTE STEP */}
        {step === 'note' && (
          <div style={styles.step}>
            <h2 style={styles.stepTitle}>4️⃣ Nota de Repartidor</h2>
            <p style={styles.subtitle}>Notas adicionales (opcional)</p>

            <textarea
              value={evidence.note}
              onChange={handleNoteChange}
              placeholder="Ej: Cliente pidió dejar en puerta trasera, alguien más recibió el paquete, etc."
              style={styles.textarea}
            />

            <div style={styles.buttonGroup}>
              <button
                onClick={() => setStep('review')}
                style={styles.primaryButton}
              >
                Revisar Evidencia →
              </button>
            </div>
          </div>
        )}

        {/* REVIEW STEP */}
        {step === 'review' && (
          <div style={styles.step}>
            <h2 style={styles.stepTitle}>5️⃣ Revisar Evidencia</h2>

            <div style={styles.reviewBox}>
              <div style={styles.reviewItem}>
                <strong>📋 Código QR:</strong> {evidence.qrCode}
              </div>

              {evidence.photo && (
                <div style={styles.reviewItem}>
                  <strong>📷 Foto:</strong>
                  <img src={evidence.photo} style={styles.reviewImage} alt="Foto" />
                </div>
              )}

              {evidence.signature && (
                <div style={styles.reviewItem}>
                  <strong>✍️ Firma:</strong>
                  <img src={evidence.signature} style={styles.reviewImage} alt="Firma" />
                </div>
              )}

              <div style={styles.reviewItem}>
                <strong>📝 Nota:</strong> {evidence.note || '(sin nota)'}
              </div>
            </div>

            <div style={styles.buttonGroup}>
              <button
                onClick={() => setStep('note')}
                style={styles.secondaryButton}
              >
                ← Volver
              </button>
              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                style={{
                  ...styles.primaryButton,
                  opacity: isProcessing ? 0.6 : 1,
                  cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}
              >
                {isProcessing ? '⏳ Enviando...' : '✅ Confirmar Entrega'}
              </button>
            </div>
          </div>
        )}

        {/* SUBMITTING STEP */}
        {step === 'submitting' && (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <p>Guardando evidencia...</p>
          </div>
        )}

        {/* RESET BUTTON */}
        <button onClick={resetCapture} style={styles.resetButton}>
          🔄 Empezar de Nuevo
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '24px',
    maxWidth: 600,
    width: '100%',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 24,
    color: '#222',
    textAlign: 'center'
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#333'
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    margin: 0
  },
  video: {
    width: '100%',
    borderRadius: 8,
    background: '#000',
    aspectRatio: '4/3',
    objectFit: 'cover'
  },
  signatureCanvas: {
    width: '100%',
    height: 250,
    border: '2px solid #ddd',
    borderRadius: 8,
    background: '#fff',
    cursor: 'crosshair',
    touchAction: 'none'
  },
  previewImage: {
    width: '100%',
    borderRadius: 8,
    maxHeight: 300,
    objectFit: 'cover'
  },
  reviewImage: {
    width: '100%',
    maxHeight: 200,
    marginTop: 8,
    borderRadius: 6
  },
  textarea: {
    padding: 12,
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'inherit',
    minHeight: 100,
    resize: 'vertical'
  },
  buttonGroup: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap'
  },
  primaryButton: {
    flex: 1,
    minWidth: 120,
    padding: '12px 16px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  secondaryButton: {
    flex: 1,
    minWidth: 120,
    padding: '12px 16px',
    background: '#f0f0f0',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer'
  },
  dangerButton: {
    flex: 1,
    minWidth: 120,
    padding: '12px 16px',
    background: '#EF4444',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer'
  },
  continueButton: {
    marginTop: 12,
    padding: '8px 12px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
    width: '100%'
  },
  resetButton: {
    marginTop: 24,
    padding: '10px',
    background: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: 12,
    color: '#666',
    cursor: 'pointer',
    width: '100%'
  },
  smallLink: {
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    cursor: 'pointer',
    fontSize: 12,
    marginLeft: 4,
    textDecoration: 'underline'
  },
  error: {
    background: '#FCEBEB',
    color: '#A32D2D',
    padding: '12px',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 13,
    borderLeft: '4px solid #A32D2D'
  },
  infoBox: {
    background: '#ECFDF5',
    border: '1px solid #86EFAC',
    color: '#166534',
    padding: '12px',
    borderRadius: 8,
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  reviewBox: {
    background: '#f9f9f9',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  reviewItem: {
    fontSize: 13,
    lineHeight: 1.6,
    color: '#333'
  },
  loadingBox: {
    textAlign: 'center',
    padding: 32,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16
  },
  spinner: {
    width: 40,
    height: 40,
    border: '4px solid #f0f0f0',
    borderTop: '4px solid #4f46e5',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
}
