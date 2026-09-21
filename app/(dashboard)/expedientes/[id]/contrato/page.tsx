/**
 * Asistente de contratos V3 (Entrega 3) — /expedientes/[id]/contrato.
 *
 * El borrador es la fila `contratos` en borrador y vive en el servidor (D1):
 * cada paso se guarda con "Guardar y continuar" y se retoma desde cualquier
 * equipo. Antes de iniciar se muestra una vista sin efectos con los bloqueos;
 * "Iniciar contrato" asigna el número y reserva el inmueble (D2). Los bloqueos
 * y faltantes los decide el API; la página solo los pinta junto a su paso.
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
import { Paso5Notificaciones, VistaPreviaContrato } from '@/components/contratos/v3/Paso5Notificaciones'
import { Aviso, EncabezadoPaso } from '@/components/contratos/v3/campos'
import { useAuthStore } from '@/stores/auth.store'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import {
  useContratoV3,
  validarPaso1,
  validarPaso2,
  validarPaso3,
  validarPaso5,
  type Borrador,
  type ErroresPaso,
} from '@/hooks/useContratoV3'
import { contratoService } from '@/services/contratoService'
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

  const comun = { estado, expedienteId, editable, esTitular, banner, v3 }
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {volver}
      {estado.contrato ? (
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
  banner: ReactNode
  v3: V3
}

/** Vista sin efectos: bloqueos, avisos y resumen; "Iniciar contrato" solo sin bloqueos. */
function PreIniciar({ estado, expedienteId, editable, esTitular, banner, v3 }: VistaProps) {
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
        esTitular={esTitular}
      />
      <AvisosContrato avisos={avisos} />
      {resumen && <ResumenContrato resumen={resumen} expedienteId={expedienteId} esTitular={esTitular} />}

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

type Formularios = { 1: Borrador<Paso1>; 2: Borrador<Paso2>; 3: Borrador<Paso3>; 5: Borrador<Paso5> }

function Asistente({ estado, contrato, expedienteId, editable, esTitular, banner, v3 }: VistaProps & { contrato: Contrato }) {
  const { guardados, prefill, faltantes } = contrato
  const { bloqueos, avisos, resumen } = estado
  const { accion, guardarPaso, generar, recargar } = v3
  const ocupado = accion !== null

  // Se retoma en el primer paso sin guardar.
  const [paso, setPaso] = useState<NumeroPaso>(() => NUMEROS.find((n) => !guardados[n]) ?? 5)
  const [forms, setForms] = useState<Formularios>(() => ({
    1: guardados[1] ?? { ruta: 'A', ...prefill[1] },
    2: guardados[2] ?? { ...prefill[2] },
    3: guardados[3] ?? { ...prefill[3] },
    5: guardados[5] ?? { ...prefill[5] },
  }))
  const [errores, setErrores] = useState<ErroresPaso>({})
  // Pasos con cambios sin guardar: activan el aviso del navegador al salir.
  const [sucios, setSucios] = useState<NumeroPaso[]>([])
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)
  const [cancelando, setCancelando] = useState(false)

  useEffect(() => {
    if (sucios.length === 0) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [sucios.length])

  const poner =
    <N extends keyof Formularios>(n: N) =>
    (v: Formularios[N]) => {
      setForms((f) => ({ ...f, [n]: v }))
      setSucios((s) => (s.includes(n) ? s : [...s, n]))
    }

  const irA = (n: NumeroPaso) => {
    setErrores({})
    setPaso(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const conCoarrendatario = !!resumen?.coarrendatario

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
      case 4:
        return { body: { paso: 4, datos: { omitir: true } }, errs: {} }
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
    // Solo lectura: se navega sin guardar.
    if (!editable) {
      if (paso < 5) irA((paso + 1) as NumeroPaso)
      return
    }
    const { body, errs } = armar()
    setErrores(errs)
    if (Object.keys(errs).length > 0) {
      toast.error('Revisa los campos marcados.')
      return
    }
    if (!(await guardarPaso(body))) return
    setSucios((s) => s.filter((n) => n !== body.paso))
    if (body.paso < 5) irA((body.paso + 1) as NumeroPaso)
    else toast.success('Datos guardados')
  }

  const cancelarBorrador = async () => {
    setCancelando(true)
    try {
      await contratoService.transicionar(contrato.id, {
        nuevo_estado: 'cancelado',
        comentario: 'Borrador cancelado desde el asistente',
        // La transición a cancelado exige motivo (precondición MOTIVO_REQUERIDO del API).
        motivo: 'Borrador cancelado desde el asistente',
      })
      setSucios([])
      toast.success(`Borrador ${contrato.numero} cancelado`)
      await recargar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cancelar el borrador.')
    } finally {
      setCancelando(false)
    }
  }

  const todosGuardados = NUMEROS.every((n) => guardados[n])
  const pendientesSinGuardar = [...sucios].sort()
  const motivoNoGenerar = !editable
    ? 'Tu acceso es de solo lectura.'
    : pendientesSinGuardar.length > 0
      ? `Tienes cambios sin guardar en el paso ${pendientesSinGuardar.join(', ')}.`
      : bloqueos.length > 0 || faltantes.length > 0 || !todosGuardados
        ? 'Resuelve los pendientes antes de generar la vista previa.'
        : null

  // Los bloqueos con paso se pintan arriba de su paso; los demás (y los de
  // otros pasos, con "Ir al paso N") arriba del indicador.
  const bloqueosArriba = bloqueos.filter((b) => b.paso !== paso)
  const bloqueosDelPaso = bloqueos.filter((b) => b.paso === paso)
  // "Falta guardar este paso" sobra mientras se llena: solo se muestran los
  // faltantes de un paso ya guardado.
  const faltantesDelPaso = guardados[paso] ? faltantes.filter((f) => f.paso === paso) : []

  const etiquetaPrimario = !editable
    ? 'Siguiente'
    : paso === 4
      ? 'Omitir y continuar'
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
            <Button variante="secondary" onClick={() => setConfirmarCancelar(true)} disabled={ocupado || cancelando}>
              Cancelar borrador
            </Button>
          )
        }
      />
      {banner}

      <BloqueosContrato
        bloqueos={bloqueosArriba}
        expedienteId={expedienteId}
        inmuebleId={resumen?.inmueble.id}
        esTitular={esTitular}
        onIrPaso={irA}
      />
      <AvisosContrato avisos={avisos} />

      <WizardStepIndicator steps={PASOS} currentStep={paso} onStepClick={(n) => irA(n as NumeroPaso)} />

      <BloqueosContrato
        bloqueos={bloqueosDelPaso}
        faltantes={faltantesDelPaso}
        expedienteId={expedienteId}
        inmuebleId={resumen?.inmueble.id}
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
          />
        )}
        {paso === 2 && <Paso2Inmueble value={forms[2]} onChange={poner(2)} errores={errores} />}
        {paso === 3 && (
          <Paso3Condiciones
            value={forms[3]}
            onChange={poner(3)}
            errores={errores}
            propiedadHorizontal={forms[2].propiedadHorizontal}
            canonCop={forms[1].canonCop}
          />
        )}
        {paso === 4 && (
          <div className="space-y-4">
            <EncabezadoPaso titulo="Cláusulas adicionales" />
            <p className="text-sm text-gray-600">Este contrato no lleva cláusulas adicionales.</p>
          </div>
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
          <Button variante="primary" onClick={guardarYContinuar} disabled={ocupado}>
            {accion === 'guardar' && <IconLoader size={16} className="animate-spin" />}
            {accion === 'guardar' ? 'Guardando…' : etiquetaPrimario}
          </Button>
        )}
      </div>

      {paso === 5 && (
        <VistaPreviaContrato
          contratoId={contrato.id}
          documento={contrato.documento}
          // Los del paso 5 ya se ven arriba del formulario.
          pendientes={faltantes.filter((f) => f.paso !== 5)}
          onIrPaso={irA}
          motivoNoGenerar={motivoNoGenerar}
          generando={accion === 'generar'}
          onGenerar={generar}
        />
      )}

      <ConfirmDialog
        isOpen={confirmarCancelar}
        onClose={() => setConfirmarCancelar(false)}
        onConfirm={cancelarBorrador}
        title="¿Cancelar el borrador?"
        message={`El número ${contrato.numero} quedará anulado y el inmueble volverá a estar disponible (fuera de la vitrina).`}
        confirmLabel="Cancelar borrador"
        cancelLabel="Volver"
        variant="danger"
        isLoading={cancelando}
      />
    </>
  )
}
