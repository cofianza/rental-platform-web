/**
 * Asistente de contratos V3 (Entrega 3) — /expedientes/[id]/contrato.
 *
 * El borrador es la fila `contratos` en borrador y vive en el servidor (D1):
 * cada paso se guarda con "Guardar y continuar" y se retoma desde cualquier
 * equipo. Antes de iniciar se muestra una vista sin efectos con los bloqueos;
 * "Iniciar contrato" asigna el número y reserva el inmueble (D2). Los bloqueos
 * y faltantes los decide el API; la página solo los pinta junto a su paso.
 * Entrega 5: enviado a firma, el contrato ya no se edita y la página muestra
 * su estado (EN FIRMA, FIRMA INCOMPLETA o FIANZA ACTIVA) con EstadoFirma.
 */

'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { IconAlertTriangle, IconArrowLeft, IconFileText, IconLoader, IconRefresh } from '@/components/icons'
import { WizardStepIndicator } from '@/components/expedientes/wizard/WizardStepIndicator'
import {
  PerfilPersonalIncompletoBanner,
  miembroDebeCompletarPerfil,
} from '@/components/expedientes/PerfilPersonalIncompletoBanner'
import { AvisosContrato, BloqueosContrato } from '@/components/contratos/v3/BloqueosContrato'
import { Paso1Confirmacion, ResumenContrato } from '@/components/contratos/v3/Paso1Confirmacion'
import { Paso2Inmueble } from '@/components/contratos/v3/Paso2Inmueble'
import { Paso3Condiciones } from '@/components/contratos/v3/Paso3Condiciones'
import { Paso4Clausulas } from '@/components/contratos/v3/Paso4Clausulas'
import { Paso5Notificaciones, VistaPreviaContrato } from '@/components/contratos/v3/Paso5Notificaciones'
import { EstadoFirma } from '@/components/contratos/v3/EstadoFirma'
import { Aviso, EncabezadoPaso, enfocarPrimerError } from '@/components/contratos/v3/campos'
import { useAuthStore } from '@/stores/auth.store'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import { useAccesoInmueble } from '@/hooks/useAccesoInmueble'
import {
  useContratoV3,
  validarPaso1,
  validarPaso2,
  validarPaso3,
  validarPaso4,
  validarPaso5,
  entradaPaso4,
  type Borrador,
  type ErroresPaso,
  type FormPaso4,
} from '@/hooks/useContratoV3'
import type { UserRole } from '@/types/auth'
import type {
  EstadoAsistente,
  GuardarPasoBody,
  NumeroPaso,
  Paso1,
  Paso2,
  Paso3,
  Paso5,
} from '@/types/contratoV3'

// Mismo roleGuard que el GET del API; propietario y solicitante no llegan aquí.
const ROLES_PERMITIDOS: UserRole[] = ['administrador', 'operador_analista', 'gerencia_consulta', 'inmobiliaria']
const PASOS = ['Confirmación', 'Inmueble', 'Condiciones', 'Cláusulas', 'Notificaciones'] as const
const NUMEROS: NumeroPaso[] = [1, 2, 3, 4, 5]

type Contrato = NonNullable<EstadoAsistente['contrato']>
type V3 = ReturnType<typeof useContratoV3>

export default function ContratoV3Page() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const rol = useAuthStore((s) => s.user?.rol)
  const permitido = !!rol && ROLES_PERMITIDOS.includes(rol)

  useEffect(() => {
    if (rol && !permitido) router.replace('/dashboard/403')
  }, [rol, permitido, router])

  // Sin montar el hook para un rol sin acceso: el GET le daría 403.
  if (!permitido) return null
  return <ContratoV3 expedienteId={id} />
}

function ContratoV3({ expedienteId }: { expedienteId: string }) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const puedeEditar = usePuedeEditar()
  // Mismo gate que las tarjetas de acción del estudio: el miembro con perfil
  // personal incompleto no administra (el API también lo bloquea).
  const bloqueadoPorPerfil = miembroDebeCompletarPerfil(user)
  const editable = puedeEditar && !bloqueadoPorPerfil
  const esTitular = user?.rol_miembro === 'owner'
  const v3 = useContratoV3(expedienteId)
  const { estado, isLoading, error, recargar } = v3
  // El asesor restringido trabaja estudios asignados sobre inmuebles de un
  // compañero cuya ficha no abre: ahí no se ofrece «Editar en el inmueble».
  const inmuebleAccesible = useAccesoInmueble(estado?.resumen?.inmueble.id)

  const volver = (
    <Link
      href={`/expedientes/${expedienteId}`}
      className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
    >
      <IconArrowLeft size={16} /> Volver al estudio
    </Link>
  )

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6" aria-busy="true">
        <div className="h-4 w-36 animate-pulse rounded bg-gray-200" />
        <div className="h-8 w-72 animate-pulse rounded bg-gray-200" />
        <div className="h-12 w-full animate-pulse rounded-xl bg-gray-200" />
        <div className="h-96 w-full animate-pulse rounded-2xl bg-gray-200" />
      </div>
    )
  }

  if (error || !estado) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {volver}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <IconAlertTriangle size={48} className="mb-4 text-red-400" />
          <p className="mb-2 text-lg font-medium text-gray-900">No pudimos cargar el contrato</p>
          <p className="mb-4 text-sm text-gray-500">{error}</p>
          <Button onClick={() => recargar()}>
            <IconRefresh size={16} /> Reintentar
          </Button>
        </div>
      </div>
    )
  }

  if (!estado.habilitado) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {volver}
        <EmptyState
          icon={IconFileText}
          title="El asistente de contratos no está disponible para este estudio"
          action={{ label: 'Volver al estudio', onClick: () => router.push(`/expedientes/${expedienteId}`) }}
        />
      </div>
    )
  }

  const banner = bloqueadoPorPerfil ? (
    <PerfilPersonalIncompletoBanner user={user} />
  ) : !puedeEditar ? (
    <Aviso>Tu acceso es de solo lectura.</Aviso>
  ) : null

  const comun = { estado, expedienteId, editable, esTitular, inmuebleAccesible, banner, v3 }
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {volver}
      {estado.enviado ? (
        <EstadoFirma
          key={estado.enviado.id}
          enviado={estado.enviado}
          expedienteId={expedienteId}
          editable={editable}
          banner={banner}
          v3={v3}
        />
      ) : estado.contrato ? (
        // key: si el borrador cambia (cancelado y reiniciado en otra sesión),
        // los formularios se vuelven a armar desde el servidor.
        <Asistente key={estado.contrato.id} contrato={estado.contrato} {...comun} />
      ) : (
        <PreIniciar {...comun} />
      )}
    </div>
  )
}

interface VistaProps {
  estado: EstadoAsistente
  expedienteId: string
  editable: boolean
  esTitular: boolean
  /** Puede abrir la ficha del inmueble (el asesor restringido, solo lo suyo o asignado); null mientras se consulta. */
  inmuebleAccesible: boolean | null
  banner: ReactNode
  v3: V3
}

/** Vista sin efectos: bloqueos, avisos y resumen; "Iniciar contrato" solo sin bloqueos. */
function PreIniciar({ estado, expedienteId, editable, esTitular, inmuebleAccesible, banner, v3 }: VistaProps) {
  const [confirmar, setConfirmar] = useState(false)
  const { bloqueos, avisos, resumen } = estado
  const iniciando = v3.accion === 'iniciar'

  return (
    <>
      <PageHeader
        className="mb-0"
        title="Nuevo contrato de vivienda"
        subtitle={resumen ? `Estudio ${resumen.expedienteNumero}` : undefined}
        actions={
          <Button
            variante="primary"
            disabled={bloqueos.length > 0 || !editable || iniciando}
            onClick={() => setConfirmar(true)}
          >
            {iniciando && <IconLoader size={16} className="animate-spin" />}
            Iniciar contrato
          </Button>
        }
      />
      {banner}
      {bloqueos.length > 0 && (
        <p className="text-sm font-medium text-gray-700">Resuelve estos puntos para iniciar el contrato:</p>
      )}
      <BloqueosContrato
        bloqueos={bloqueos}
        expedienteId={expedienteId}
        inmuebleId={resumen?.inmueble.id}
        inmuebleAccesible={inmuebleAccesible}
        esTitular={esTitular}
      />
      <AvisosContrato avisos={avisos} />
      {resumen && (
        <ResumenContrato
          resumen={resumen}
          expedienteId={expedienteId}
          esTitular={esTitular}
          inmuebleAccesible={inmuebleAccesible}
        />
      )}

      <ConfirmDialog
        isOpen={confirmar}
        onClose={() => setConfirmar(false)}
        onConfirm={async () => {
          if (await v3.iniciar()) toast.success('Contrato iniciado')
        }}
        title="¿Iniciar el contrato?"
        message="Se asignará el número de contrato, el inmueble quedará reservado para este estudio y saldrá de la vitrina, y los demás candidatos con estudios en curso sobre este inmueble recibirán un aviso. Si cancelas el borrador, el número queda anulado y el inmueble se libera."
        confirmLabel="Iniciar contrato"
        isLoading={iniciando}
      />
    </>
  )
}

type Formularios = { 1: Borrador<Paso1>; 2: Borrador<Paso2>; 3: Borrador<Paso3>; 4: FormPaso4; 5: Borrador<Paso5> }

/** Formulario del paso 4 armado desde lo guardado en el servidor (o la lista del contrato cancelado). */
const form4De = (g: Contrato['guardados'][4] | Contrato['prefill'][4]): FormPaso4 => ({
  elegidas:
    g && 'clausulas' in g
      ? g.clausulas.map((c) => ({ clausulaId: c.clausulaId, valores: c.valores ?? {}, origen: c.origen }))
      : [],
  acepto: false,
})

/** Bloqueos del paso 4 que se resuelven volviendo a guardarlo (y aceptando el aviso vigente). */
const REGUARDAR_PASO4 = ['CLAUSULA_MODELO_ALTERADO', 'ACEPTACION_PENDIENTE']

/** Sin estos, la única salida es una evaluación nueva (los del canon también se resuelven bajándolo). */
const SOLO_NUEVA_EVALUACION = ['ESTUDIO_VENCIDO', 'CANON_SIN_EVALUADO']

function Asistente({
  estado,
  contrato,
  expedienteId,
  editable,
  esTitular,
  inmuebleAccesible,
  banner,
  v3,
}: VistaProps & { contrato: Contrato }) {
  const { guardados, prefill, faltantes, adicionales } = contrato
  const { bloqueos, avisos, resumen } = estado
  const { accion, guardarPaso, limpiarErrorPaso } = v3
  const ocupado = accion !== null
  const rol = useAuthStore((s) => s.user?.rol)

  // Se retoma en el primer paso sin guardar (en la Ruta B el 4 no se guarda: no aplica).
  const [paso, setPaso] = useState<NumeroPaso>(
    () => NUMEROS.find((n) => !guardados[n] && !(n === 4 && guardados[1]?.ruta === 'B')) ?? 5,
  )
  const [forms, setForms] = useState<Formularios>(() => ({
    1: guardados[1] ?? { ruta: 'A', ...prefill[1] },
    2: guardados[2] ?? { ...prefill[2] },
    3: guardados[3] ?? { ...prefill[3] },
    4: form4De(guardados[4] ?? prefill[4]),
    5: guardados[5] ?? { ...prefill[5] },
  }))
  const [errores, setErrores] = useState<ErroresPaso>({})
  // Pasos con cambios sin guardar: activan el aviso del navegador al salir.
  const [sucios, setSucios] = useState<NumeroPaso[]>([])
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)
  const [confirmarEnvio, setConfirmarEnvio] = useState(false)
  // Si el aviso de responsabilidad cambia (409 AVISO_CAMBIADO y recarga), hay que leerlo y aceptarlo de nuevo.
  const [avisoLeido, setAvisoLeido] = useState(adicionales.aviso.version)
  if (avisoLeido !== adicionales.aviso.version) {
    setAvisoLeido(adicionales.aviso.version)
    setForms((f) => ({ ...f, 4: { ...f[4], acepto: false } }))
  }
  // Sin cambios propios en el paso 4, la lista en pantalla es la guardada: si una recarga (409,
  // otro paso guardado, otra sesión) trae otra, se rearma desde el servidor. Así el administrador
  // autoriza la huella de la lista que ve, y nadie sigue viendo una lista que ya no está.
  const huella4 = guardados[4] ? ('clausulas' in guardados[4] ? guardados[4].huella : 'omitido') : null
  const [huellaVista, setHuellaVista] = useState(huella4)
  if (huellaVista !== huella4 && !sucios.includes(4)) {
    setHuellaVista(huella4)
    setForms((f) => ({ ...f, 4: form4De(guardados[4]) }))
  }

  useEffect(() => {
    if (sucios.length === 0) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [sucios.length])

  // Navegar DENTRO de la app (menú, migas, «Editar en el inmueble») no dispara
  // beforeunload: con cambios sin guardar se pregunta antes de salir.
  const router = useRouter()
  const [salirA, setSalirA] = useState<string | null>(null)
  useEffect(() => {
    if (sucios.length === 0) return
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return
      e.preventDefault()
      e.stopPropagation()
      setSalirA(url.pathname + url.search + url.hash)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [sucios.length])

  const poner =
    <N extends keyof Formularios>(n: N) =>
    (v: Formularios[N]) => {
      setForms((f) => ({ ...f, [n]: v }))
      setSucios((s) => (s.includes(n) ? s : [...s, n]))
      // Los hallazgos del último 422 apuntan a filas por índice: cualquier cambio los invalida.
      if (n === 4) limpiarErrorPaso()
    }

  const irA = (n: NumeroPaso) => {
    setErrores({})
    setPaso(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const conCoarrendatario = !!resumen?.coarrendatario
  // Ruta guardada (el API decide con ella): en B no hay paso 4 (§4.8) y el paso 5 carga el PDF propio.
  const rutaB = guardados[1]?.ruta === 'B'

  // Paso 4 (Entrega 4): solo la inmobiliaria arma la lista y acepta el aviso; los
  // roles internos solo omiten el paso o ven lo guardado (el API es la puerta).
  const incorpora = editable && rol === 'inmobiliaria'
  const g4 = guardados[4]
  const guardado4 = g4 && 'clausulas' in g4 ? g4 : null
  // Estos bloqueos piden "vuelve a guardar el paso 4" (un modelo ya no coincide, o la aceptación no
  // cubre las propias y los datos de los modelos o es de un aviso anterior): para la inmobiliaria
  // cuentan como cambio, así ve la casilla y "Guardar y continuar".
  const sinCambios4 =
    !sucios.includes(4) && !(incorpora && bloqueos.some((b) => REGUARDAR_PASO4.includes(b.codigo)))
  // Lo guardado sigue valiendo: sin cambios y, si hubo aceptación (solo con propias), del aviso vigente.
  const vigente4 =
    !!g4 && sinCambios4 && (!guardado4?.aceptacion || guardado4.aceptacion.avisoVersion === adicionales.aviso.version)
  const primario4: { etiqueta: string; guarda: boolean } =
    rutaB
      ? { etiqueta: 'Continuar', guarda: false }
      : !incorpora && guardado4
        ? { etiqueta: 'Siguiente', guarda: false }
        : vigente4
          ? { etiqueta: 'Continuar', guarda: false }
          : forms[4].elegidas.length === 0
            ? { etiqueta: 'Omitir y continuar', guarda: true }
            : { etiqueta: 'Guardar y continuar', guarda: true }

  // Cuerpo del PUT del paso actual + validación inmediata (el API es la puerta).
  const armar = (): { body: GuardarPasoBody; errs: ErroresPaso } => {
    switch (paso) {
      case 1:
        return { body: { paso: 1, datos: forms[1] as Paso1 }, errs: validarPaso1(forms[1]) }
      case 2: {
        const f = forms[2]
        const d = { ...f, nombreCopropiedad: f.propiedadHorizontal ? f.nombreCopropiedad : null }
        return { body: { paso: 2, datos: d as Paso2 }, errs: validarPaso2(d) }
      }
      case 3: {
        const ph = forms[2].propiedadHorizontal
        const d = { ...forms[3], administracion: ph ? (forms[3].administracion ?? null) : null }
        return { body: { paso: 3, datos: d as Paso3 }, errs: validarPaso3(d, { propiedadHorizontal: ph }) }
      }
      case 4: {
        const f = forms[4]
        // Las claves de `valores` son los [[campo]] de cada cláusula (se crean al agregarla).
        const campos = Object.fromEntries(f.elegidas.map((e) => [e.clausulaId, Object.keys(e.valores)]))
        return {
          body: { paso: 4, datos: entradaPaso4(f, adicionales.aviso.version) },
          errs: validarPaso4(f, { campos, conCoarrendatario }),
        }
      }
      case 5: {
        const c = forms[5].contactos ?? {}
        const d = {
          ...forms[5],
          contactos: { ...c, coarrendatario: conCoarrendatario ? (c.coarrendatario ?? {}) : null },
        }
        return { body: { paso: 5, datos: d as Paso5 }, errs: validarPaso5(d, { conCoarrendatario }) }
      }
    }
  }

  const guardarYContinuar = async () => {
    // Solo lectura, o paso 4 sin nada que guardar: se navega sin guardar.
    if (!editable || (paso === 4 && !primario4.guarda)) {
      if (paso < 5) irA((paso + 1) as NumeroPaso)
      return
    }
    const { body, errs } = armar()
    setErrores(errs)
    if (Object.keys(errs).length > 0) {
      toast.error('Revisa los campos marcados.')
      enfocarPrimerError()
      return
    }
    const nuevo = await guardarPaso(body)
    if (!nuevo) return
    const pendientesOtros = sucios.filter((n) => n !== body.paso)
    setSucios(pendientesOtros)
    // Guardado, pero bloqueado en este mismo paso (p. ej. el canon): se queda aquí, con el bloqueo a la vista.
    if (nuevo.bloqueos.some((b) => b.paso === body.paso)) {
      toast.warning('Se guardó, pero este paso tiene un bloqueo: resuélvelo antes de seguir.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (body.paso < 5) {
      irA((body.paso + 1) as NumeroPaso)
      return
    }
    // Paso 5 con todo listo: se genera el documento de una vez (un clic menos antes de enviar).
    const c = nuevo.contrato
    const listo = !!c && nuevo.bloqueos.length === 0 && c.faltantes.length === 0 && pendientesOtros.length === 0
    if (!listo) {
      toast.success('Datos guardados')
      return
    }
    if (await v3.generar()) {
      toast.success(rutaB ? 'Datos guardados y Anexo generado: revísalo abajo.' : 'Datos guardados y vista previa generada: revísala abajo.')
      document.getElementById('vista-previa')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const cancelarBorrador = async () => {
    // La transición a cancelado exige motivo (precondición MOTIVO_REQUERIDO del API).
    if (!(await v3.cancelar(contrato.id, 'Borrador cancelado desde el asistente', 'borrador'))) return
    setSucios([])
    toast.success(`Borrador ${contrato.numero} cancelado`)
  }

  const enviarAFirma = async () => {
    if (!contrato.documento) return
    const ok = await v3.enviar({
      generacion: contrato.documento.generacion,
      propioSha256: rutaB ? contrato.propio?.sha256 : undefined,
    })
    if (ok) toast.success(`Contrato ${contrato.numero} enviado a firma`)
  }

  // Orden de firma = orden de las partes: arrendatario, coarrendatario y el representante
  // legal por la inmobiliaria. Los celulares son los del paso 5 guardado (a donde va el WhatsApp).
  const c5 = guardados[5]?.contactos
  const ordenFirma = [
    { nombre: resumen?.arrendatario.nombre ?? 'Arrendatario', celular: c5?.arrendatario.telefono },
    ...(resumen?.coarrendatario
      ? [{ nombre: resumen.coarrendatario.nombre, celular: c5?.coarrendatario?.telefono }]
      : []),
    {
      nombre: `${resumen?.arrendador.representanteLegal ?? 'Representante legal'} por ${resumen?.arrendador.razonSocial ?? 'la inmobiliaria'}`,
      celular: c5?.arrendador.telefono,
    },
  ]
  const crc = resumen?.fianza?.crc

  // Ruta B: el paso 4 no aplica (ni cuenta como pendiente ni como cambio sin guardar).
  const pendientesSinGuardar = sucios.filter((n) => !(rutaB && n === 4)).sort()
  const documentoTexto = rutaB ? 'el Anexo' : 'la vista previa'
  // Pasos con algo por hacer (sin guardar o con faltantes), para decir cuáles y no "los pendientes".
  const pasosIncompletos = [
    ...new Set([
      ...NUMEROS.filter((n) => !(rutaB && n === 4) && !guardados[n]),
      ...faltantes.map((f) => f.paso),
    ]),
  ].sort()
  const listaPasos = (ns: number[]) =>
    ns.length === 1 ? `el paso ${ns[0]}` : `los pasos ${ns.slice(0, -1).join(', ')} y ${ns[ns.length - 1]}`
  // Adenda 1 contratos §2.4: el canon sobre el tope no impide intentar generar: el API
  // bloquea igual y es ese intento el que envía el caso a la Gerencia General.
  const bloqueosQueFrenan = bloqueos.filter((b) => b.codigo !== 'CANON_EXCEDE_TOPE')
  const motivoNoGenerar = !editable
    ? 'Tu acceso es de solo lectura.'
    : pendientesSinGuardar.length > 0
      ? `Tienes cambios sin guardar en ${listaPasos(pendientesSinGuardar)}.`
      : // El paso 5 llega prellenado: sin tocar nada parece listo, pero falta guardarlo
        // (su faltante no se pinta mientras se llena).
        !guardados[5]
        ? `Guarda el paso 5 (Notificaciones) antes de generar ${documentoTexto}.`
        : bloqueosQueFrenan.length > 0
          ? `Resuelve ${bloqueosQueFrenan.length === 1 ? 'el bloqueo marcado' : `los ${bloqueosQueFrenan.length} bloqueos marcados`} en rojo antes de generar ${documentoTexto}.`
          : pasosIncompletos.length > 0
            ? `Completa ${listaPasos(pasosIncompletos)} antes de generar ${documentoTexto}.`
            : null

  // Los bloqueos con paso se pintan arriba de su paso; los demás (y los de
  // otros pasos, con "Ir al paso N") arriba del indicador.
  const bloqueosArriba = bloqueos.filter((b) => b.paso !== paso)
  const bloqueosDelPaso = bloqueos.filter((b) => b.paso === paso)
  // "Falta guardar este paso" sobra mientras se llena: solo se muestran los
  // faltantes de un paso ya guardado.
  const faltantesDelPaso = guardados[paso] ? faltantes.filter((f) => f.paso === paso) : []

  const soloNuevaEvaluacion = bloqueos.some((b) => SOLO_NUEVA_EVALUACION.includes(b.codigo))
  // dd/mm/aaaa; un API anterior (despliegue a medias) no trae la fecha.
  const reservadoHasta = contrato.reservadoHasta?.split('-').reverse().join('/')

  const etiquetaPrimario = !editable
    ? 'Siguiente'
    : paso === 4
      ? primario4.etiqueta
      : paso === 5
        ? 'Guardar'
        : 'Guardar y continuar'

  return (
    <>
      <PageHeader
        className="mb-0"
        title={`Contrato N° ${contrato.numero} · Borrador`}
        subtitle={resumen ? `Estudio ${resumen.expedienteNumero}` : undefined}
        actions={
          editable && (
            <Button variante="secondary" onClick={() => setConfirmarCancelar(true)} disabled={ocupado}>
              Cancelar borrador
            </Button>
          )
        }
      />
      {banner}
      {/* Adenda 1 contratos, respuesta 15: la reserva vence a los días hábiles del parámetro.
          Condicional: un API anterior (despliegue a medias) no trae la fecha. */}
      {reservadoHasta && (
        <Aviso>
          El inmueble está reservado hasta el {reservadoHasta}
          {contrato.reservaDiasHabiles ? ` (${contrato.reservaDiasHabiles} días hábiles desde que se inició el contrato)` : ''}.
          Si el contrato no se envía a firma antes, el borrador se cancela solo y el inmueble se libera; lo que ya llenaste
          se conserva para cuando lo vuelvas a iniciar.
        </Aviso>
      )}

      <BloqueosContrato
        bloqueos={bloqueosArriba}
        expedienteId={expedienteId}
        inmuebleId={resumen?.inmueble.id}
        inmuebleAccesible={inmuebleAccesible}
        esTitular={esTitular}
        onIrPaso={irA}
      />
      {editable && soloNuevaEvaluacion && (
        <Aviso tono="aviso">
          Mientras se hace la nueva evaluación, este borrador mantiene el inmueble reservado, pero la reserva vence sola
          {contrato.reservaDiasHabiles ? ` a los ${contrato.reservaDiasHabiles} días hábiles` : ''}
          {reservadoHasta ? ` (el ${reservadoHasta})` : ''}: si para entonces no se envía a firma, el borrador se cancela y
          el inmueble se libera. Si la evaluación va a tardar o no se hará, cancela el borrador ya para liberarlo; cuando
          esté lista, lo creas de nuevo con los datos que ya llenaste.
        </Aviso>
      )}
      <AvisosContrato avisos={avisos} />
      {/* Textos sin aprobar previstos con lo guardado; con el documento ya generado los muestra la vista previa. */}
      {!(paso === 5 && contrato.documento) && <AvisosContrato avisos={contrato.textosPendientes} tono="aviso" />}

      <WizardStepIndicator
        steps={PASOS}
        currentStep={paso}
        completados={NUMEROS.filter((n) => guardados[n] || (rutaB && n === 4))}
        onStepClick={(n) => irA(n as NumeroPaso)}
      />

      <BloqueosContrato
        bloqueos={bloqueosDelPaso}
        faltantes={faltantesDelPaso}
        expedienteId={expedienteId}
        inmuebleId={resumen?.inmueble.id}
        inmuebleAccesible={inmuebleAccesible}
        esTitular={esTitular}
      />

      <fieldset
        disabled={!editable}
        className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7"
      >
        {paso === 1 && (
          <Paso1Confirmacion
            value={forms[1]}
            onChange={poner(1)}
            errores={errores}
            resumen={resumen}
            expedienteId={expedienteId}
            esTitular={esTitular}
            inmuebleAccesible={inmuebleAccesible}
            modalidadConvenio={contrato.modalidadConvenio ?? undefined}
          />
        )}
        {paso === 2 && (
          <Paso2Inmueble value={forms[2]} onChange={poner(2)} errores={errores} />
        )}
        {paso === 3 && (
          <Paso3Condiciones
            value={forms[3]}
            onChange={poner(3)}
            errores={errores}
            propiedadHorizontal={forms[2].propiedadHorizontal}
            canonCop={forms[1].canonCop}
          />
        )}
        {paso === 4 && rutaB && (
          <div className="space-y-6">
            <EncabezadoPaso titulo="Cláusulas adicionales" />
            <Aviso>
              En la Ruta B no hay cláusulas adicionales: se firma el contrato de la inmobiliaria tal como lo cargues,
              seguido de una página divisoria y del Anexo de condiciones de Cofianza.
            </Aviso>
          </div>
        )}
        {paso === 4 && !rutaB && (
          <Paso4Clausulas
            value={forms[4]}
            onChange={poner(4)}
            errores={errores}
            errorPaso={v3.errorPaso}
            adicionales={adicionales}
            guardado={guardado4}
            sinCambios={sinCambios4}
            incorpora={incorpora}
            esAdmin={editable && rol === 'administrador'}
            excedeLimite={bloqueos.some((b) => b.codigo === 'ADICIONALES_EXCEDEN_LIMITE')}
            autorizando={accion === 'autorizar'}
            onAutorizar={v3.autorizarExceso}
            contratoNumero={contrato.numero}
            expedienteNumero={resumen?.expedienteNumero ?? null}
            expedienteId={expedienteId}
          />
        )}
        {paso === 5 && (
          <Paso5Notificaciones
            value={forms[5]}
            onChange={poner(5)}
            errores={errores}
            conCoarrendatario={conCoarrendatario}
          />
        )}
      </fieldset>

      <div className="flex items-center justify-between gap-3">
        <Button variante="secondary" onClick={() => irA((paso - 1) as NumeroPaso)} disabled={paso === 1 || ocupado}>
          Anterior
        </Button>
        {(editable || paso < 5) && (
          <Button
            variante="primary"
            onClick={guardarYContinuar}
            // "Guardar y continuar" del paso 4 exige aceptar el aviso de responsabilidad.
            disabled={ocupado || (editable && paso === 4 && primario4.etiqueta === 'Guardar y continuar' && !forms[4].acepto)}
          >
            {accion === 'guardar' && <IconLoader size={16} className="animate-spin" />}
            {accion === 'guardar' ? 'Guardando…' : etiquetaPrimario}
          </Button>
        )}
      </div>

      {paso === 5 && (
        <VistaPreviaContrato
          contrato={contrato}
          rutaB={rutaB}
          editable={editable}
          v3={v3}
          // Los del paso 5 ya se ven arriba del formulario.
          pendientes={faltantes.filter((f) => f.paso !== 5)}
          onIrPaso={irA}
          motivoNoGenerar={motivoNoGenerar}
          onEnviar={() => setConfirmarEnvio(true)}
        />
      )}

      <ConfirmDialog
        isOpen={confirmarEnvio}
        onClose={() => setConfirmarEnvio(false)}
        onConfirm={enviarAFirma}
        title="¿Enviar el contrato a firma?"
        message={
          <div className="space-y-3">
            <p>Se enviará por Auco (WhatsApp) para firmar en este orden, una parte a la vez:</p>
            <ol className="list-decimal space-y-1 pl-5">
              {ordenFirma.map((f, i) => (
                <li key={i}>
                  <span className="font-medium text-gray-900">{f.nombre}</span>
                  {f.celular && ` (${f.celular})`}
                </li>
              ))}
            </ol>
            <p>
              {crc ? `Se adjunta el CRC N° ${crc.codigo}.` : 'Se adjunta el CRC.'}
              {rutaB && ' El PDF de la inmobiliaria va sin modificaciones, seguido de una página divisoria y del Anexo de condiciones.'}
            </p>
            <p className="font-medium text-gray-900">
              Después de enviarlo, el contrato no se puede editar. Cada envío consume un crédito de firma.
            </p>
          </div>
        }
        confirmLabel="Enviar a firma"
        isLoading={accion === 'enviar'}
      />

      <ConfirmDialog
        isOpen={confirmarCancelar}
        onClose={() => setConfirmarCancelar(false)}
        onConfirm={cancelarBorrador}
        title="¿Cancelar el borrador?"
        message={`El número ${contrato.numero} quedará anulado y el inmueble volverá a estar disponible (fuera de la vitrina).`}
        confirmLabel="Cancelar borrador"
        cancelLabel="Volver"
        variant="danger"
        isLoading={accion === 'cancelar'}
      />

      <ConfirmDialog
        isOpen={salirA !== null}
        onClose={() => setSalirA(null)}
        onConfirm={() => {
          const destino = salirA
          setSucios([])
          if (destino) router.push(destino)
        }}
        title="¿Salir sin guardar?"
        message="Tienes cambios sin guardar en el contrato. Si sales ahora se pierden."
        confirmLabel="Salir sin guardar"
        cancelLabel="Seguir aquí"
        variant="danger"
      />
    </>
  )
}
