import { ImageResponse } from 'next/og'

// B3: vista previa del enlace en WhatsApp/correo. Sin datos del estudio: el
// enlace es personal y la imagen es la misma para todos.
export const alt = 'Cofianza — Autorización de su estudio de arriendo'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#047857',
          color: 'white',
        }}
      >
        <div style={{ fontSize: 88, fontWeight: 700 }}>Cofianza</div>
        <div style={{ fontSize: 48, marginTop: 24 }}>Autorización de su estudio de arriendo</div>
        <div style={{ fontSize: 32, marginTop: 40, opacity: 0.85 }}>Cofianza S.A.S. · NIT 902.038.122-7</div>
      </div>
    ),
    size,
  )
}
