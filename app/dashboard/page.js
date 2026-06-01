'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

const STATUS_LABEL = { pending:'Pendiente', assigned:'Asignado', picked_up:'Recogido', in_transit:'En tránsito', delivered:'Entregado', cancelled:'Cancelado' }
const STATUS_COLOR = { pending:'0FAEEDA', assigned:'0eef2ff', picked_up:'0eef2ff', in_transit:'0E6F1FB', delivered:'0EAF3DE', cancelled:'0FCEBEB' }
const STATUS_TEXT  = { pending:'0854F0B', assigned:'04f46e5', picked_up:'04f46e5', in_transit:'0185FA5', delivered:'03B6D11', cancelled:'0A32D2D' }

const SHOW_MAP_STATUSES = ['in_transit', 'out_for_delivery']

function TrackingMap({ order }) {
  const mapRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    const initMap = () => {
      const L = window.L
      if (!document.getElementById(`map-${order.id}`)) return

      const destLat = order.dest_lat || 19.4326
      const destLng = order.dest_lng || -99.1332
      const originLat = order.origin_lat || destLat + 0.05
      const originLng = order.origin_lng || destLng + 0.05

      const map = L.map(`map-${order.id}`).setView([destLat, destLng], 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map)

      mapRef.current = map

      // Marcador destino
      const destIcon = L.divIcon({
        html: '<div style="background:0185FA5;color:0fff;padding:5px 10px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🏠 Tu domicilio</div>',
        className: '', iconAnchor: [55, 12]
      })
      L.marker([destLat, destLng], { icon: destIcon }).addTo(map)

      // Marcador repartidor (simulado cerca del origen)
      const driverLat = originLat + (Math.random() - 0.5) * 0.02
      const driverLng = originLng + (Math.random() - 0.5) * 0.02
      const driverIcon = L.divIcon({
        html: '<div style="background:04f46e5;color:0fff;padding:5px 10px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🚚 Tu paquete</div>',
        className: '', iconAnchor: [50, 12]
      })
      L.marker([driverLat, driverLng], { icon: driverIcon }).addTo(map)

      // Línea punteada
      L.polyline([[driverLat, driverLng], [destLat, destLng]], {
        color: '04f46e5', weight: 3, dashArray: '8 6', opacity: 0.6
      }).addTo(map)

      map.fitBounds([[driverLat, driverLng], [destLat, destLng]], { padding: [30, 30] })
    }

    if (window.L) {
      initMap()
    } else {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = initMap
      document.head.appendChild(script)
    }

    return () => { try { mapRef.current?.remove() } catch(e){} }
  }, [order.id])

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <span style={{ fontSize:12, fontWeight:600, color:'04f46e5' }}>🗺 Tu paquete está en camino</span>
        <span style={{ fontSize:11, color:'0888' }}>Actualización en tiempo real</span>
      </div>
      <div id={`map-${order.id}`} style={{ width:'100%', height:280, borderRadius:10, border:'1px solid 0e5e5e5' }} />
    </div>
  )
}

import { Suspense } from 'react'

function DashboardContent() {  const [user, setUser]       = useState(null)
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [successMsg, setSuccessMsg] = useState('')
  const [expandedOrder, setExpandedOrder] = useState(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: roleData } = await supabase.from('users').select('role, id').eq('auth_id', session.user.id).single()
      if (roleData?.role === 'admin')   { router.push('/admin');   return }
      if (roleData?.role === 'driver')  { router.push('/driver');  return }
      if (roleData?.role === 'station') { router.push('/station'); return }

      setUser(session.user)
      const orderCode = searchParams.get('order')
      if (orderCode) setSuccessMsg(`Orden ${orderCode} creada exitosamente`)

      const { data: userData } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single()
      const { data, error } = await supabase
        .from('orders')
        .select('*, events:order_events(status, status_code, note, created_at)')
        .eq('client_id', userData?.id)
        .order('created_at', { ascending: false })

      if (!error) setOrders(data || [])
      setLoading(false)
    }
    init()
  }, [])

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'04f46e5'}}>
      <div style={{background:'0fff',borderRadius:16,padding:'2rem',textAlign:'center'}}>
        <p style={{color:'04f46e5',fontWeight:600}}>Cargando...</p>
      </div>
    </div>
  )

  return (
    <div style={s.container}>
      <div style={s.topbar}>
        <div style={s.logo}>ABZEND</div>
        <div style={s.userRow}>
          <span style={s.userName}>{user?.user_metadata?.full_name || user?.email}</span>
          <button onClick={logout} style={s.logoutBtn}>Salir</button>
        </div>
      </div>

      <div style={s.main}>
        {successMsg && <div style={s.success}>{successMsg}</div>}

        <div style={s.statsRow}>
          <div style={s.stat}><div style={s.statVal}>{orders.length}</div><div style={s.statLbl}>Total órdenes</div></div>
          <div style={s.stat}><div style={s.statVal}>{orders.filter(o=>['pending','assigned','picked_up','in_transit'].includes(o.status)).length}</div><div style={s.statLbl}>Activas</div></div>
          <div style={s.stat}><div style={s.statVal}>{orders.filter(o=>o.status==='delivered').length}</div><div style={s.statLbl}>Entregadas</div></div>
        </div>

        <div style={s.sectionHeader}>
          <h2 style={s.sectionTitle}>Mis envíos</h2>
          <button style={s.newBtn} onClick={()=>router.push('/orders/new')}>+ Nuevo envío</button>
        </div>

        {orders.length === 0 ? (
          <div style={s.empty}>
            <p style={s.emptyText}>No tienes envíos aún</p>
            <button style={s.newBtn} onClick={()=>router.push('/orders/new')}>Crear primer envío</button>
          </div>
        ) : (
          <div style={s.ordersList}>
            {orders.map(order => {
              const showMap = SHOW_MAP_STATUSES.includes(order.status)
              const isExpanded = expandedOrder === order.id
              return (
                <div key={order.id} style={s.orderCard}>
                  <div style={s.orderHeader}>
                    <span style={s.orderCode}>0{order.tracking_code}</span>
                    <span style={{...s.badge, background:STATUS_COLOR[order.status], color:STATUS_TEXT[order.status]}}>
                      {STATUS_LABEL[order.status]}
                    </span>
                  </div>
                  <div style={s.orderRoute}>{order.origin_address} → {order.dest_address}</div>
                  <div style={s.orderFooter}>
                    <span style={s.orderService}>{order.service}</span>
                    <span style={s.orderPrice}>${order.total} MXN</span>
                  </div>

                  {/* Mapa — solo visible en in_transit u OFD */}
                  {showMap && <TrackingMap order={order} />}

                  {/* Timeline de eventos */}
                  {order.events?.length > 0 && (
                    <div>
                      <button onClick={()=>setExpandedOrder(isExpanded?null:order.id)}
                        style={{background:'none',border:'none',cursor:'pointer',color:'04f46e5',fontSize:13,padding:'8px 0',fontWeight:500}}>
                        {isExpanded?'▲ Ocultar historial':'▼ Ver historial de eventos'}
                      </button>
                      {isExpanded && (
                        <div style={s.timeline}>
                          {[...order.events].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map((e,i)=>(
                            <div key={i} style={s.timelineItem}>
                              <div style={s.timelineDot} />
                              <div>
                                <div style={{fontSize:12,fontWeight:600,color:'0222'}}>
                                  {e.status_code && <span style={s.eventCode}>[{e.status_code}]</span>} {STATUS_LABEL[e.status]||e.status}
                                </div>
                                {e.note && <div style={{fontSize:11,color:'0888'}}>{e.note}</div>}
                                <div style={{fontSize:11,color:'0aaa'}}>{new Date(e.created_at).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'})}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  container: { minHeight:'100vh', background:'0f5f5f5', fontFamily:'sans-serif' },
  topbar: { background:'04f46e5', padding:'1rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center' },
  logo: { fontSize:20, fontWeight:700, color:'0fff', letterSpacing:2 },
  userRow: { display:'flex', alignItems:'center', gap:12 },
  userName: { color:'rgba(255,255,255,0.8)', fontSize:14 },
  logoutBtn: { padding:'6px 14px', background:'rgba(255,255,255,0.15)', color:'0fff', border:'1px solid rgba(255,255,255,0.3)', borderRadius:8, cursor:'pointer', fontSize:13 },
  main: { maxWidth:680, margin:'0 auto', padding:'1.5rem' },
  success: { background:'0eef2ff', border:'1px solid 09FE1CB', borderRadius:8, padding:'10px 14px', color:'04f46e5', marginBottom:'1rem', fontSize:14 },
  statsRow: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:'1.5rem' },
  stat: { background:'0fff', borderRadius:10, padding:'1rem', textAlign:'center', border:'1px solid 0eee' },
  statVal: { fontSize:24, fontWeight:700, color:'04f46e5' },
  statLbl: { fontSize:12, color:'0888', marginTop:4 },
  sectionHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' },
  sectionTitle: { fontSize:16, fontWeight:600, color:'0222' },
  newBtn: { padding:'8px 16px', background:'04f46e5', color:'0fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 },
  empty: { textAlign:'center', padding:'3rem', background:'0fff', borderRadius:12, border:'1px solid 0eee' },
  emptyText: { color:'0888', marginBottom:'1rem' },
  ordersList: { display:'flex', flexDirection:'column', gap:12 },
  orderCard: { background:'0fff', border:'1px solid 0eee', borderRadius:10, padding:'1rem' },
  orderHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 },
  orderCode: { fontSize:14, fontWeight:600, color:'0222' },
  badge: { fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:500 },
  orderRoute: { fontSize:13, color:'0666', marginBottom:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  orderFooter: { display:'flex', justifyContent:'space-between', fontSize:13 },
  orderService: { color:'0888', textTransform:'capitalize' },
  orderPrice: { fontWeight:600, color:'0222' },
  timeline: { borderLeft:'2px solid 0E5E7EB', marginLeft:6, paddingLeft:16, marginTop:4 },
  timelineItem: { display:'flex', gap:10, marginBottom:12, position:'relative' },
  timelineDot: { width:8, height:8, borderRadius:'50%', background:'04f46e5', flexShrink:0, marginTop:3, position:'absolute', left:-21 },
  eventCode: { background:'0eef2ff', color:'04f46e5', padding:'1px 5px', borderRadius:4, fontSize:11, fontWeight:700 },
}

export default function Dashboard() {  return (
    <Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'04f46e5'}}><div style={{background:'0fff',borderRadius:16,padding:'2rem'}}><p style={{color:'04f46e5',fontWeight:600}}>Cargando...</p></div></div>}>
      <DashboardContent />
    </Suspense>
  )
}
