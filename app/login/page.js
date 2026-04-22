'use client'
import { createClient } from '../../lib/supabase'

export default function Login() {
  const handleGoogleLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://abzend-panel-repartidor.vercel.app/auth/callback'
      }
    })
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0F6E56'}}>
      <div style={{background:'#fff',borderRadius:16,padding:'3rem 2rem',textAlign:'center',maxWidth:400,width:'100%',margin:'1rem'}}>
        <h1 style={{fontSize:32,fontWeight:700,color:'#0F6E56',marginBottom:8,letterSpacing:2}}>ABZEND</h1>
        <p style={{color:'#888',fontSize:14,marginBottom:'2rem'}}>Panel Repartidor</p>
        <button onClick={handleGoogleLogin} style={{width:'100%',padding:'12px',background:'#fff',border:'1px solid #ddd',borderRadius:8,cursor:'pointer',fontSize:15}}>
          Continuar con Google
        </button>
        <p style={{marginTop:'1.5rem',fontSize:12,color:'#aaa'}}>Acceso exclusivo para personal ABZEND</p>
      </div>
    </div>
  )
}
