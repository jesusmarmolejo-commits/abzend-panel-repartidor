'use client'
import { useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('google') // 'google' | 'email'
  const router = useRouter()

  const loginGoogle = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  const loginEmail = async () => {
    if (!email.trim() || !password.trim()) { setError('Email y contrasena requeridos'); return }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (authError) throw authError
      const { data: userData } = await supabase.from('users').select('role').eq('auth_id', data.user.id).single()
      if (!userData || userData.role !== 'driver') {
        await supabase.auth.signOut()
        throw new Error('Acceso denegado. Solo repartidores pueden ingresar aqui.')
      }
      router.push('/driver')
    } catch(e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h1 style={styles.logo}>ABZEND</h1>
        <p style={styles.sub}>Panel Repartidor</p>
        {error && <p style={styles.error}>{error}</p>}

        {mode === 'google' ? (
          <>
            <button style={styles.btn} onClick={loginGoogle} disabled={loading}>
              <img src="https://www.google.com/favicon.ico" width="18" alt="Google" style={{marginRight:8}} />
              {loading ? 'Conectando...' : 'Continuar con Google'}
            </button>
            <div style={{display:'flex',alignItems:'center',gap:10,margin:'1rem 0'}}>
              <div style={{flex:1,height:1,background:'#eee'}}/>
              <span style={{fontSize:12,color:'#aaa'}}>o</span>
              <div style={{flex:1,height:1,background:'#eee'}}/>
            </div>
            <button onClick={()=>setMode('email')}
              style={{...styles.btn,background:'#0F6E56',color:'#fff',border:'none'}}>
              Ingresar con email y contrasena
            </button>
          </>
        ) : (
          <>
            <div style={{marginBottom:12}}>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="correo@empresa.com"
                style={styles.input} />
            </div>
            <div style={{marginBottom:16}}>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="Contrasena"
                style={styles.input}
                onKeyDown={e=>e.key==='Enter'&&loginEmail()} />
            </div>
            <button style={{...styles.btn,background:'#0F6E56',color:'#fff',border:'none'}}
              onClick={loginEmail} disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
            <button onClick={()=>{setMode('google');setError('')}}
              style={{background:'none',border:'none',color:'#0F6E56',fontSize:13,cursor:'pointer',marginTop:12}}>
              Volver
            </button>
          </>
        )}
        <p style={styles.terms}>Al ingresar aceptas los terminos de uso de ABZEND</p>
      </div>
    </div>
  )
}

const styles = {
  container: { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#0F6E56' },
  box: { background:'#fff', borderRadius:16, padding:'2rem', width:'100%', maxWidth:380, textAlign:'center' },
  logo: { fontSize:28, fontWeight:700, color:'#0F6E56', letterSpacing:2, marginBottom:4 },
  sub: { fontSize:13, color:'#888', marginBottom:'1.5rem' },
  error: { background:'#FCEBEB', color:'#A32D2D', borderRadius:8, padding:'10px 12px', fontSize:13, marginBottom:'1rem' },
  btn: { display:'flex', alignItems:'center', justifyContent:'center', width:'100%', padding:12, background:'#fff', color:'#333', border:'1px solid #ddd', borderRadius:8, fontSize:15, fontWeight:500, cursor:'pointer', marginBottom:4 },
  input: { width:'100%', padding:'10px 12px', border:'1px solid #ddd', borderRadius:8, fontSize:14, boxSizing:'border-box' },
  terms: { fontSize:12, color:'#aaa', marginTop:'1rem' }
}