import { useState } from 'react'
import type { SituacionLaboral } from './constantes'

/**
 * §8.2 / §8.3 — todo opcional. Vive en la página y no en el paso 2: así, al
 * volver desde el paso 3, lo que el prospecto escribió sigue ahí.
 */
export function useSobreUsted() {
  const [situacion, setSituacion] = useState<SituacionLaboral | null>(null)
  // Política Anexo A.3/A.4: solo se pregunta al independiente.
  const [tieneRut, setTieneRut] = useState<boolean | null>(null)
  const [dondeLabora, setDondeLabora] = useState('')
  const [ingreso, setIngreso] = useState('')
  const [presentacion, setPresentacion] = useState<'solo' | 'acompanado' | null>(null)
  const [coaNombre, setCoaNombre] = useState('')
  const [coaApellido, setCoaApellido] = useState('')
  const [coaEmail, setCoaEmail] = useState('')
  const [coaTelefono, setCoaTelefono] = useState('')
  // Se enciende al intentar continuar, no al teclear: nadie quiere ver
  // "revisa el correo" cuando lleva escrita una sola letra.
  const [coaEmailError, setCoaEmailError] = useState(false)
  // M9: qué le falta al coarrendatario para poder guardarlo. Antes, con datos
  // a medias, se descartaban en silencio y el prospecto creía haberlos dejado.
  const [coaFaltan, setCoaFaltan] = useState<string[]>([])
  // UX #4: escribió su propio correo o WhatsApp como el del coarrendatario (lo dice la API).
  const [coaContactoError, setCoaContactoError] = useState<{ campo: 'email' | 'telefono'; mensaje: string } | null>(null)

  return {
    situacion,
    setSituacion,
    tieneRut,
    setTieneRut,
    dondeLabora,
    setDondeLabora,
    ingreso,
    setIngreso,
    presentacion,
    setPresentacion,
    coaNombre,
    setCoaNombre,
    coaApellido,
    setCoaApellido,
    coaEmail,
    setCoaEmail,
    coaTelefono,
    setCoaTelefono,
    coaEmailError,
    setCoaEmailError,
    coaFaltan,
    setCoaFaltan,
    coaContactoError,
    setCoaContactoError,
  }
}

export type EstadoSobreUsted = ReturnType<typeof useSobreUsted>
