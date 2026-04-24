'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const STATUS_LABEL = { pending:'Pendiente', assigned:'Asignado', picked_up:'Recogido', in_transit:'En tránsito', delivered:'Entregado' }
const STATUS_COLOR = { pending:'#FAEEDA', assigned:'#E1F5EE', picked_up:'#E1F5EE', in_transit:'#E6F1FB', delivered:'#EAF3DE' }
const STATUS_TEXT  = { pending:'#854F0B', assigned:'#0F6E56', picked_up:'#0F6E56', in_transit:'#185FA5', delivered:'#3B6D11' }

const TRANSPORT_STATUS_LABEL = { pending:'Pendiente', confirmed:'Confirmado', in_transit:'En tránsito', delivered:'Entregado', cancelled:'Cancelado' }
const TRANSPORT_STATUS_COLOR = { pending:'#FAEEDA', confirmed:'#E1F5EE', in_transit:'#E6F1FB', delivered:'#EAF3DE', cancelled:'#FEE2E2' }
const TRANSPORT_STATUS_TEXT  = { pending:'#854F0B', confirmed:'#0F6E56', in_transit:'#185FA5', delivered:'#3B6D11', cancelled:'#991B1B' }
const UNIDAD_LABEL = { '1.5ton':'1.5 Ton', '3.5ton':'3.5 Ton', 'rabon':'Rabón', 'torton':'Tórton' }

const ALLOWED_TRANSITIONS = {
  assigned:   [{ value:'picked_up',  label:'Confirmar recolección', code:'PUP' },
               { value:'in_transit', label:'En tránsito',           code:'INT' }],
  picked_up:  [{ value:'in_transit', label:'En tránsito',           code:'INT' },
               { value:'delivered',  label:'Entregado',             code:'DLV' }],
  in_transit: [{ value:'delivered',  label:'Entregado',             code:'DLV' }],
}

const TRANSPORT_TRANSITIONS = {
  confirmed:  [{ value:'in_transit', label:'Iniciar viaje' }],
  in_transit: [{ value:'delivered',  label:'Marcar entregado' }],
}

const RECEIVER_TYPES = [
  { value:'titular',   label:'Titular' },
  { value:'amigo',     label:'Amigo' },
  { value:'familiar',  label:'Familiar' },
  { value:'conocido',  label:'Conocido' },
  { value:'guardia',   label:'Guardia' },
  { value:'recepcion', label:'Recepción' },
  { value:'otro',      label:'Otro' },
]

const fmtDate = (d) => d ? new Date(d).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' }) : ''
const fmtMoney = (n) => `$${Number(n||0).toLocaleString('es-MX',{minimumFractionDigits:2})}`

export default function DriverPanel() {
  const [user, setUser]           = useState(null)
  const [driverId, setDriverId]   = useState(null)
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('entregas')
  const [selectedOrder, setSelectedOrder]         = useState(null)
  const [selectedTransition, setSelectedTransition] = useState('')
  const [processing, setProcessing]               = useState(false)
  const [msg, setMsg]             = useState('')
  const [qrInput, setQrInput]     = useState('')

  // Transporte
  const [transportOrders, setTransportOrders]       = useState([])
  const [selectedTransport, setSelectedTransport]   = useState(null)
  const [transportProcessing, setTransportProcessing] = useState(false)

  // POD
  const [showPOD, setShowPOD]               = useState(false)
  const [podOrder, setPodOrder]             = useState(null)
  const [receiverName, setReceiverName]     = useState('')
  const [receiverType, setReceiverType]     = useState('titular')
  const [photos, setPhotos]                 = useState([null,null,null,null])
  const [photoPreviews, setPhotoPreviews]   = useState([null,null,null,null])
  const [signature, setSignature]           = useState(null)
  const [signaturePreview, setSignaturePreview] = useState(null)
  const [podProcessing, setPodProcessing]   = useState(false)
  const [podSummary, setPodSummary]         = useState(null)
  const canvasRef  = useRef(null)
  const isDrawing  = useRef(false)
  const router     = useRouter()

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      const { data: userData } = await supabase.from('users').select('id,role').eq('auth_id', session.user.id).single()
      if (!userData || userData.role !== 'driver') { router.push('/dashboard'); return }
      const { data: driverData } = await supabase.from('drivers').select('id').eq('user_id', userData.id).single()
      if (!driverData) { router.push('/dashboard'); return }
      setDriverId(driverData.id)
      await loadAll(supabase, driverData.id)
      setLoading(false)
    }
    init()
  }, [])

  const loadAll = async (supabase, dId) => {
    const [{ data: assigned }, { data: tOrders }] = await Promise.all([
      supabase.from('orders').select('*, client:client_id(full_name,phone)')
        .eq('driver_id', dId).in('status',['assigned','picked_up','in_transit'])
        .order('created_at',{ascending:false}),
      supabase.from('transport_orders').select('*, unit:unidad_id(nombre), stops:transport_order_stops(*)')
        .eq('driver_id', dId).in('status',['confirmed','in_transit'])
        .order('created_at',{ascending:false}),
    ])
    setOrders(assigned || [])
    setTransportOrders(tOrders || [])
  }

  const openModal = (order) => {
    setSelectedOrder(order)
    const transitions = ALLOWED_TRANSITIONS[order.status] || []
    setSelectedTransition(transitions[0]?.value || '')
  }

  const updateStatus = async () => {
    if (!selectedTransition) return
    if (selectedTransition === 'delivered') {
      setPodOrder(selectedOrder)
      setSelectedOrder(null)
      setShowPOD(true)
      return
    }
    setProcessing(true)
    try {
      const supabase = createClient()
      const now = new Date().toISOString()
      const transition = ALLOWED_TRANSITIONS[selectedOrder.status]?.find(t => t.value === selectedTransition)
      let lat = null, lng = null
      if (navigator.geolocation && selectedTransition === 'in_transit') {
        try {
          const pos = await new Promise((resolve,reject) => navigator.geolocation.getCurrentPosition(resolve,reject,{timeout:5000}))
          lat = pos.coords.latitude; lng = pos.coords.longitude
          if (selectedOrder.dest_address) window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedOrder.dest_address)}`,'_blank')
        } catch(e){}
      }
      await supabase.from('orders').update({status:selectedTransition,status_updated_at:now}).eq('id',selectedOrder.id)
      await supabase.from('order_events').insert({order_id:selectedOrder.id,status:selectedTransition,status_code:transition?.code||null,note:'Actualizado por repartidor',lat,lng})
      setMsg(`Orden ${selectedOrder.tracking_code}: ${STATUS_LABEL[selectedTransition]}`)
      setSelectedOrder(null)
      await loadAll(supabase, driverId)
    } catch(e) { setMsg('Error: '+e.message) }
    finally { setProcessing(false) }
  }

  const updateTransportStatus = async (order, newStatus) => {
    setTransportProcessing(true)
    try {
      const supabase = createClient()
      await supabase.from('transport_orders').update({
        status: newStatus, status_updated_at: new Date().toISOString()
      }).eq('id', order.id)
      setMsg(`Viaje ${order.tracking_code}: ${TRANSPORT_STATUS_LABEL[newStatus]}`)
      setSelectedTransport(null)
      await loadAll(supabase, driverId)
    } catch(e) { setMsg('Error: '+e.message) }
    finally { setTransportProcessing(false) }
  }

  const handlePhotoChange = (index, file) => {
    if (!file) return
    const newPhotos = [...photos]; newPhotos[index] = file; setPhotos(newPhotos)
    const reader = new FileReader()
    reader.onload = (e) => { const n=[...photoPreviews]; n[index]=e.target.result; setPhotoPreviews(n) }
    reader.readAsDataURL(file)
  }

  const startDraw = (e) => {
    isDrawing.current = true
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath(); ctx.moveTo((e.touches?.[0]?.clientX||e.clientX)-rect.left,(e.touches?.[0]?.clientY||e.clientY)-rect.top)
  }
  const draw = (e) => {
    if (!isDrawing.current) return; e.preventDefault()
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    ctx.lineWidth=2; ctx.lineCap='round'; ctx.strokeStyle='#0F6E56'
    ctx.lineTo((e.touches?.[0]?.clientX||e.clientX)-rect.left,(e.touches?.[0]?.clientY||e.clientY)-rect.top); ctx.stroke()
  }
  const stopDraw = () => {
    isDrawing.current = false
    canvasRef.current.toBlob(blob => { setSignature(blob); setSignaturePreview(canvasRef.current.toDataURL()) })
  }
  const clearCanvas = () => {
    const canvas = canvasRef.current; canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height)
    setSignature(null); setSignaturePreview(null)
  }

  const submitPOD = async () => {
    if (!receiverName.trim()) { setMsg('❌ Ingresa el nombre de quien recibe'); return }
    if (!photos.some(p=>p!==null)) { setMsg('❌ Se requiere al menos 1 foto'); return }
    const canvas = canvasRef.current
    let currentSignatureBlob = signature
    if (!currentSignatureBlob) currentSignatureBlob = await new Promise(r=>canvas.toBlob(r))
    if (!currentSignatureBlob) { setMsg('❌ Se requiere firma del destinatario'); return }
    setPodProcessing(true)
    try {
      const supabase = createClient(); const now = new Date().toISOString(); const orderId = podOrder.id
      let lat=null,lng=null
      try { const pos=await new Promise((r,j)=>navigator.geolocation.getCurrentPosition(r,j,{timeout:5000})); lat=pos.coords.latitude; lng=pos.coords.longitude } catch(e){}
      const photoUrls = [null,null,null,null]
      for (let i=0;i<4;i++) {
        if (photos[i]) {
          const path=`${orderId}/photo_${i+1}_${Date.now()}`
          const { error } = await supabase.storage.from('pod-media').upload(path,photos[i],{contentType:photos[i].type||'image/jpeg'})
          if (!error) { const { data:url } = supabase.storage.from('pod-media').getPublicUrl(path); photoUrls[i]=url.publicUrl }
        }
      }
      let signatureUrl=null
      const sigPath=`${orderId}/signature_${Date.now()}`
      const { error:sigError } = await supabase.storage.from('pod-media').upload(sigPath,currentSignatureBlob,{contentType:'image/png'})
      if (!sigError) { const { data:url } = supabase.storage.from('pod-media').getPublicUrl(sigPath); signatureUrl=url.publicUrl }
      await supabase.from('proof_of_delivery').insert({order_id:orderId,receiver_name:receiverName.trim(),receiver_type:receiverType,photo_1:photoUrls[0],photo_2:photoUrls[1],photo_3:photoUrls[2],photo_4:photoUrls[3],signature:signatureUrl,lat,lng,created_by:driverId})
      await supabase.from('orders').update({status:'delivered',status_updated_at:now,delivered_at:now}).eq('id',orderId)
      await supabase.from('order_events').insert({order_id:orderId,status:'delivered',status_code:'DLV',note:`Entregado a: ${receiverName} (${receiverType})`,lat,lng})
      await loadAll(supabase,driverId)
      setPodSummary({tracking_code:podOrder.tracking_code,receiver_name:receiverName,receiver_type:receiverType,photos:photoPreviews.filter(p=>p!==null),signature:canvas.toDataURL(),timestamp:new Date().toLocaleString('es-MX')})
    } catch(e) { setMsg('❌ Error: '+e.message) }
    finally { setPodProcessing(false) }
  }

  const resetPOD = () => {
    setShowPOD(false); setPodOrder(null); setReceiverName(''); setReceiverType('titular')
    setPhotos([null,null,null,null]); setPhotoPreviews([null,null,null,null])
    setSignature(null); setSignaturePreview(null); setPodSummary(null)
  }

  const scanQR = async () => {
    if (!qrInput.trim()) return
    setProcessing(true)
    try {
      const supabase = createClient(); const input = qrInput.trim()
      let { data } = await supabase.from('orders').select('*, client:client_id(full_name,phone)').eq('tracking_code',input).maybeSingle()
      if (!data) { const r=await supabase.from('orders').select('*, client:client_id(full_name,phone)').eq('qr_code',input).maybeSingle(); data=r.data }
      if (!data) { setMsg('❌ Código no encontrado'); setProcessing(false); return }
      if (data.status !== 'pending') { setMsg('⚠️ Esta orden ya fue asignada'); setProcessing(false); return }
      const now = new Date().toISOString()
      await supabase.from('orders').update({driver_id:driverId,status:'assigned',status_updated_at:now}).eq('id',data.id)
      await supabase.from('order_events').insert({order_id:data.id,status:'assigned',status_code:'ASC',note:'Asignada por escaneo QR'})
      setMsg(`✅ Orden #${data.tracking_code} asignada`)
      setQrInput('')
      await loadAll(supabase, driverId)
    } catch(e) { setMsg('❌ Error: '+e.message) }
    finally { setProcessing(false) }
  }

  const logout = async () => { const supabase=createClient(); await supabase.auth.signOut(); router.push('/login') }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#0F6E56'}}>
      <div style={{background:'#fff',borderRadius:16,padding:'2rem',textAlign:'center'}}>
        <p style={{color:'#0F6E56',fontWeight:600}}>Cargando...</p>
      </div>
    </div>
  )

  return (
    <div style={s.container}>
      <div style={s.topbar}>
        <div style={s.logo}>ABZEND <span style={s.tag}>Repartidor</span></div>
        <div style={s.userRow}>
          <span style={s.userName}>{user?.user_metadata?.full_name || user?.email}</span>
          <button onClick={logout} style={s.logoutBtn}>Salir</button>
        </div>
      </div>

      <div style={s.main}>
        {msg && <div style={s.msgBox} onClick={()=>setMsg('')}>{msg} ✕</div>}

        {/* TABS */}
        <div style={{display:'flex',borderBottom:'1px solid #E5E7EB',marginBottom:'1.5rem',gap:4}}>
          {[
            {id:'entregas', label:'📦 Mis Entregas', count:orders.length},
            {id:'viajes',   label:'🚛 Mis Viajes',   count:transportOrders.length},
          ].map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              style={{padding:'10px 16px',border:'none',background:'none',cursor:'pointer',fontSize:13,
                color:activeTab===tab.id?'#0F6E56':'#666',
                borderBottom:activeTab===tab.id?'2px solid #0F6E56':'2px solid transparent',
                fontWeight:activeTab===tab.id?600:400,display:'flex',alignItems:'center',gap:6}}>
              {tab.label}
              {tab.count > 0 && (
                <span style={{background:'#0F6E56',color:'#fff',fontSize:10,padding:'1px 6px',borderRadius:20,fontWeight:700}}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB ENTREGAS ── */}
        {activeTab === 'entregas' && (
          <div>
            {/* Escáner QR */}
            <div style={s.card}>
              <div style={s.cardTitle}>Escanear código QR de la orden</div>
              <div style={s.qrRow}>
                <input style={s.qrInput} placeholder="Ingresa código de guía o escanea QR..."
                  value={qrInput} onChange={e=>setQrInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&scanQR()} disabled={processing} />
                <button style={{...s.qrBtn,opacity:processing?0.6:1}} onClick={scanQR} disabled={processing}>
                  {processing?'Procesando...':'Escanear'}
                </button>
              </div>
              <p style={{fontSize:12,color:'#888',marginTop:8}}>
                📱 Escanea el código QR del paquete para asignarte la orden automáticamente
              </p>
            </div>

            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>Mis órdenes activas</h2>
              <span style={s.count}>{orders.length}</span>
            </div>
            {orders.length === 0 ? (
              <div style={s.empty}>
                <p style={s.emptyIcon}>📦</p>
                <p style={s.emptyText}>No tienes órdenes asignadas</p>
                <p style={s.emptyHint}>Escanea el código QR de un paquete para comenzar</p>
              </div>
            ) : (
              <div style={s.ordersList}>
                {orders.map(order=>(
                  <div key={order.id} style={s.orderCard}>
                    <div style={s.orderRow}>
                      <div style={s.orderLeft}>
                        <div style={s.orderCode}>#{order.tracking_code}</div>
                        <div style={s.orderRoute}>{order.origin_address} → {order.dest_address}</div>
                        <div style={s.orderMeta}>{fmtDate(order.created_at)}</div>
                      </div>
                      <div style={s.orderRight}>
                        <span style={{...s.badge,background:STATUS_COLOR[order.status],color:STATUS_TEXT[order.status]}}>
                          {STATUS_LABEL[order.status]}
                        </span>
                        {ALLOWED_TRANSITIONS[order.status]?.length > 0 && (
                          <button style={s.actionBtn} onClick={()=>openModal(order)}>Actualizar</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB VIAJES ── */}
        {activeTab === 'viajes' && (
          <div>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>Mis viajes FTL</h2>
              <span style={s.count}>{transportOrders.length}</span>
            </div>

            {transportOrders.length === 0 ? (
              <div style={s.empty}>
                <p style={s.emptyIcon}>🚛</p>
                <p style={s.emptyText}>No tienes viajes asignados</p>
                <p style={s.emptyHint}>El administrador te asignará viajes de transporte</p>
              </div>
            ) : (
              <div style={s.ordersList}>
                {transportOrders.map(order=>(
                  <div key={order.id} style={s.orderCard}>
                    <div style={s.orderRow}>
                      <div style={s.orderLeft}>
                        <div style={s.orderCode}>#{order.tracking_code}</div>
                        <div style={{fontSize:12,color:'#444',marginBottom:2}}>
                          {order.ruta} · {UNIDAD_LABEL[order.unit?.nombre]||order.unit?.nombre}
                        </div>
                        {/* Paradas en línea */}
                        {order.stops?.length > 0 && (
                          <div style={{display:'flex',alignItems:'center',gap:3,flexWrap:'wrap',marginBottom:4}}>
                            {[...order.stops].sort((a,b)=>a.orden-b.orden).map((stop,i)=>(
                              <span key={i} style={{display:'flex',alignItems:'center',gap:3}}>
                                <span style={{fontSize:10,padding:'1px 6px',borderRadius:20,
                                  background:stop.tipo==='carga'?'#E1F5EE':'#EFF6FF',
                                  color:stop.tipo==='carga'?'#0F6E56':'#185FA5'}}>
                                  {stop.tipo==='carga'?'📦':'📍'} {stop.alias||stop.calle?.substring(0,15)||'Parada'}
                                </span>
                                {i < order.stops.length-1 && <span style={{color:'#bbb',fontSize:10}}>→</span>}
                              </span>
                            ))}
                          </div>
                        )}
                        <div style={s.orderMeta}>
                          {order.fecha_requerida && `📅 ${new Date(order.fecha_requerida).toLocaleDateString('es-MX')}`}
                        </div>
                      </div>
                      <div style={s.orderRight}>
                        <span style={{...s.badge,background:TRANSPORT_STATUS_COLOR[order.status],color:TRANSPORT_STATUS_TEXT[order.status]}}>
                          {TRANSPORT_STATUS_LABEL[order.status]}
                        </span>
                        {TRANSPORT_TRANSITIONS[order.status]?.length > 0 && (
                          <button style={s.actionBtn} onClick={()=>setSelectedTransport(order)}>
                            Actualizar
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{borderTop:'1px solid #f0f0f0',paddingTop:8,marginTop:8,display:'flex',justifyContent:'space-between',fontSize:12,color:'#888'}}>
                      <span>{order.incluye_maniobra&&'✓ Maniobra  '}{order.incluye_reparto&&'✓ Reparto'}</span>
                      <span style={{fontWeight:600,color:'#222'}}>{fmtMoney(order.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL CAMBIO STATUS ENTREGA */}
        {selectedOrder && (
          <div style={s.modalOverlay}>
            <div style={s.modal}>
              <h3 style={s.modalTitle}>#{selectedOrder.tracking_code}</h3>
              <p style={s.modalSub}>{selectedOrder.origin_address} → {selectedOrder.dest_address}</p>
              <p style={s.modalSub}>Cliente: {selectedOrder.client?.full_name||'N/A'}</p>
              <div style={s.modalStatus}>
                Estado actual: <span style={{...s.badge,background:STATUS_COLOR[selectedOrder.status],color:STATUS_TEXT[selectedOrder.status]}}>{STATUS_LABEL[selectedOrder.status]}</span>
              </div>
              {ALLOWED_TRANSITIONS[selectedOrder.status]?.length > 0 ? (
                <>
                  <div style={s.field}>
                    <label style={s.label}>Cambiar a</label>
                    <select style={s.input} value={selectedTransition} onChange={e=>setSelectedTransition(e.target.value)}>
                      {ALLOWED_TRANSITIONS[selectedOrder.status].map(t=>(
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  {selectedTransition==='delivered' && (
                    <div style={{background:'#E1F5EE',borderRadius:8,padding:'10px 12px',marginBottom:'1rem',fontSize:13,color:'#0F6E56'}}>
                      📸 Se solicitará Prueba de Entrega (POD)
                    </div>
                  )}
                  <div style={s.modalBtns}>
                    <button style={s.cancelBtn} onClick={()=>setSelectedOrder(null)}>Cancelar</button>
                    <button style={{...s.confirmBtn,opacity:processing?0.6:1}} onClick={updateStatus} disabled={processing}>
                      {processing?'Procesando...':'Confirmar'}
                    </button>
                  </div>
                </>
              ) : (
                <div style={s.noTransitions}>
                  <p>No hay acciones disponibles.</p>
                  <button style={s.cancelBtn} onClick={()=>setSelectedOrder(null)}>Cerrar</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL CAMBIO STATUS TRANSPORTE */}
        {selectedTransport && (
          <div style={s.modalOverlay}>
            <div style={s.modal}>
              <h3 style={s.modalTitle}>🚛 #{selectedTransport.tracking_code}</h3>
              <p style={s.modalSub}>{selectedTransport.ruta} · {UNIDAD_LABEL[selectedTransport.unit?.nombre]||selectedTransport.unit?.nombre}</p>
              <div style={s.modalStatus}>
                Estado: <span style={{...s.badge,background:TRANSPORT_STATUS_COLOR[selectedTransport.status],color:TRANSPORT_STATUS_TEXT[selectedTransport.status]}}>
                  {TRANSPORT_STATUS_LABEL[selectedTransport.status]}
                </span>
              </div>
              {/* Paradas */}
              {selectedTransport.stops?.length > 0 && (
                <div style={{marginBottom:'1rem'}}>
                  <div style={{fontSize:12,color:'#666',fontWeight:600,marginBottom:6}}>📍 Paradas</div>
                  {[...selectedTransport.stops].sort((a,b)=>a.orden-b.orden).map((stop,i)=>(
                    <div key={i} style={{
                      fontSize:12,padding:'6px 10px',borderRadius:6,marginBottom:4,
                      background:stop.tipo==='carga'?'#F0FDF4':'#EFF6FF',
                      color:stop.tipo==='carga'?'#0F6E56':'#185FA5'
                    }}>
                      {stop.orden}. {stop.tipo==='carga'?'📦':'📍'} {stop.alias||'Parada'} — {stop.calle||'Sin dirección'}
                    </div>
                  ))}
                </div>
              )}
              <div style={{marginBottom:'1rem',fontSize:13,color:'#444'}}>
                <b>Total:</b> {fmtMoney(selectedTransport.total)}
                {selectedTransport.fecha_requerida && <span style={{marginLeft:12}}>📅 {new Date(selectedTransport.fecha_requerida).toLocaleDateString('es-MX')}</span>}
              </div>
              {TRANSPORT_TRANSITIONS[selectedTransport.status]?.map(t=>(
                <button key={t.value}
                  onClick={()=>updateTransportStatus(selectedTransport,t.value)}
                  disabled={transportProcessing}
                  style={{...s.confirmBtn,width:'100%',marginBottom:8,opacity:transportProcessing?0.6:1}}>
                  {transportProcessing?'Procesando...':`✅ ${t.label}`}
                </button>
              ))}
              <button style={{...s.cancelBtn,width:'100%'}} onClick={()=>setSelectedTransport(null)}>Cerrar</button>
            </div>
          </div>
        )}

        {/* MODAL POD */}
        {showPOD && (
          <div style={s.modalOverlay}>
            <div style={{...s.modal,maxWidth:500,maxHeight:'90vh',overflowY:'auto'}}>
              {podSummary ? (
                <>
                  <div style={{textAlign:'center',marginBottom:'1rem'}}>
                    <div style={{fontSize:48}}>✅</div>
                    <h3 style={{fontSize:18,fontWeight:700,color:'#0F6E56',margin:'8px 0 4px'}}>Orden finalizada con éxito</h3>
                    <p style={{fontSize:13,color:'#888'}}>#{podSummary.tracking_code}</p>
                  </div>
                  <div style={{background:'#F5F5F5',borderRadius:8,padding:'1rem',marginBottom:'1rem'}}>
                    <div style={{fontSize:13,marginBottom:6}}><b>Recibió:</b> {podSummary.receiver_name}</div>
                    <div style={{fontSize:13,marginBottom:6}}><b>Relación:</b> {RECEIVER_TYPES.find(t=>t.value===podSummary.receiver_type)?.label}</div>
                    <div style={{fontSize:13,color:'#888'}}><b>Fecha:</b> {podSummary.timestamp}</div>
                  </div>
                  {podSummary.photos.length > 0 && (
                    <div style={{marginBottom:'1rem'}}>
                      <div style={{fontSize:13,color:'#666',marginBottom:6}}><b>Fotos ({podSummary.photos.length})</b></div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6}}>
                        {podSummary.photos.map((p,i)=>(
                          <img key={i} src={p} style={{width:'100%',aspectRatio:'1',objectFit:'cover',borderRadius:6}} />
                        ))}
                      </div>
                    </div>
                  )}
                  {podSummary.signature && (
                    <div style={{marginBottom:'1rem'}}>
                      <div style={{fontSize:13,color:'#666',marginBottom:6}}><b>Firma</b></div>
                      <img src={podSummary.signature} style={{width:'100%',border:'1px solid #eee',borderRadius:6}} />
                    </div>
                  )}
                  <button style={{...s.confirmBtn,width:'100%',textAlign:'center'}} onClick={resetPOD}>Continuar →</button>
                </>
              ) : (
                <>
                  <h3 style={s.modalTitle}>📸 Prueba de Entrega</h3>
                  <p style={s.modalSub}>#{podOrder?.tracking_code}</p>
                  <p style={{...s.modalSub,marginBottom:'1rem'}}>{podOrder?.dest_address}</p>
                  <div style={s.field}>
                    <label style={s.label}>Nombre de quien recibe *</label>
                    <input style={s.input} placeholder="Nombre completo" value={receiverName} onChange={e=>setReceiverName(e.target.value)} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Relación con el destinatario *</label>
                    <select style={s.input} value={receiverType} onChange={e=>setReceiverType(e.target.value)}>
                      {RECEIVER_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Fotos del paquete (mín. 1, máx. 4) *</label>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      {[0,1,2,3].map(i=>(
                        <div key={i}>
                          <label style={{display:'block',border:'2px dashed #ddd',borderRadius:8,cursor:'pointer',overflow:'hidden',aspectRatio:'1',background:photoPreviews[i]?'transparent':'#f9f9f9'}}>
                            {photoPreviews[i] ? (
                              <img src={photoPreviews[i]} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                            ) : (
                              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'#aaa',fontSize:12,gap:4,padding:'1rem'}}>
                                <span style={{fontSize:24}}>📷</span><span>Foto {i+1}{i===0?' *':''}</span>
                              </div>
                            )}
                            <input type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={e=>handlePhotoChange(i,e.target.files[0])} />
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Firma del destinatario *</label>
                    <div style={{border:'1px solid #ddd',borderRadius:8,overflow:'hidden',background:'#fff'}}>
                      <canvas ref={canvasRef} width={460} height={150}
                        style={{width:'100%',height:150,cursor:'crosshair',touchAction:'none'}}
                        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6}}>
                      <span style={{fontSize:11,color:'#aaa'}}>Firma con el dedo o mouse</span>
                      <button onClick={clearCanvas} style={{fontSize:12,color:'#EF4444',background:'none',border:'none',cursor:'pointer'}}>Limpiar firma</button>
                    </div>
                  </div>
                  <div style={s.modalBtns}>
                    <button style={s.cancelBtn} onClick={resetPOD} disabled={podProcessing}>Cancelar</button>
                    <button style={{...s.confirmBtn,opacity:podProcessing?0.6:1}} onClick={submitPOD} disabled={podProcessing}>
                      {podProcessing?'Guardando...':'✅ Confirmar Entrega'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  container: { minHeight:'100vh', background:'#f5f5f5', fontFamily:'sans-serif' },
  topbar: { background:'#0F6E56', padding:'1rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center' },
  logo: { fontSize:20, fontWeight:700, color:'#fff', letterSpacing:2, display:'flex', alignItems:'center', gap:10 },
  tag: { background:'rgba(255,255,255,0.2)', fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:400, letterSpacing:0 },
  userRow: { display:'flex', alignItems:'center', gap:12 },
  userName: { color:'rgba(255,255,255,0.8)', fontSize:14 },
  logoutBtn: { padding:'6px 14px', background:'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.3)', borderRadius:8, cursor:'pointer', fontSize:13 },
  main: { maxWidth:700, margin:'0 auto', padding:'1.5rem' },
  msgBox: { background:'#E1F5EE', border:'1px solid #9FE1CB', borderRadius:8, padding:'10px 14px', color:'#0F6E56', marginBottom:'1rem', fontSize:14, cursor:'pointer' },
  card: { background:'#fff', border:'1px solid #eee', borderRadius:10, padding:'1rem', marginBottom:'1rem' },
  cardTitle: { fontSize:14, fontWeight:600, color:'#222', marginBottom:'0.75rem' },
  qrRow: { display:'flex', gap:8 },
  qrInput: { flex:1, padding:'9px 11px', border:'1px solid #ddd', borderRadius:8, fontSize:14, color:'#222' },
  qrBtn: { padding:'9px 18px', background:'#0F6E56', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:500 },
  sectionHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' },
  sectionTitle: { fontSize:15, fontWeight:600, color:'#222' },
  count: { background:'#0F6E56', color:'#fff', fontSize:12, padding:'2px 10px', borderRadius:20 },
  ordersList: { display:'flex', flexDirection:'column', gap:8 },
  orderCard: { background:'#fff', border:'1px solid #eee', borderRadius:10, padding:'1rem' },
  orderRow: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 },
  orderLeft: { flex:1 },
  orderCode: { fontSize:14, fontWeight:600, color:'#222', marginBottom:3 },
  orderRoute: { fontSize:12, color:'#888', marginBottom:2 },
  orderMeta: { fontSize:11, color:'#bbb' },
  orderRight: { display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 },
  badge: { fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:500, whiteSpace:'nowrap' },
  actionBtn: { padding:'5px 12px', background:'#185FA5', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:500 },
  empty: { textAlign:'center', padding:'3rem 2rem', background:'#fff', borderRadius:10, border:'1px solid #eee', marginBottom:'1rem' },
  emptyIcon: { fontSize:48, marginBottom:8 },
  emptyText: { color:'#666', fontSize:14, marginBottom:4, fontWeight:500 },
  emptyHint: { color:'#999', fontSize:12 },
  modalOverlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  modal: { background:'#fff', borderRadius:14, padding:'1.5rem', width:'100%', maxWidth:400, margin:'1rem' },
  modalTitle: { fontSize:16, fontWeight:600, color:'#222', marginBottom:4 },
  modalSub: { fontSize:13, color:'#888', marginBottom:4 },
  modalStatus: { display:'flex', alignItems:'center', gap:8, marginBottom:'1rem', fontSize:13 },
  field: { display:'flex', flexDirection:'column', gap:5, marginBottom:'1rem' },
  label: { fontSize:13, color:'#666' },
  input: { padding:'9px 11px', border:'1px solid #ddd', borderRadius:8, fontSize:14, color:'#222' },
  modalBtns: { display:'flex', gap:10, justifyContent:'flex-end' },
  cancelBtn: { padding:'8px 16px', background:'none', border:'1px solid #ddd', borderRadius:8, cursor:'pointer', fontSize:13 },
  confirmBtn: { padding:'8px 18px', background:'#0F6E56', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 },
  noTransitions: { textAlign:'center', padding:'1rem' },
}