/**
 * Paso 1 del asistente de contratos V3: confirmación de partes, inmueble y
 * fianza (solo lectura, tomados del estudio y del CRC), canon pactado, ruta y
 * modalidad. El canon se guarda solo en el contrato (A1): el API revisa la
 * tolerancia contra el canon evaluado en cada guardado.
 */

'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  IconArrowRight,
  IconBuilding2,
  IconFileText,
  IconHome,
  IconScrollText,
  IconShieldCheck,
  IconUser,
  IconUsers,
} from '@/components/icons'
import { formatCurrency, formatDate } from '@/lib/constants'
import type { Borrador, ErroresPaso } from '@/hooks/useContratoV3'
import type { EstadoAsistente, Paso1 } from '@/types/contratoV3'
import { Aviso, CampoPesos, Dato, EncabezadoPaso, OpcionTarjeta, Tarjeta, documento, porcentaje } from './campos'

type Resumen = NonNullable<EstadoAsistente['resumen']>

const VIA_LABEL: Record<NonNullable<Resumen['fianza']>['via'], string> = {
  automatica: 'Aprobación automática',
  condicionada_coarrendatario: 'Aprobación con coarrendatario',
  revision_manual: 'Revisión manual',
}

const TIPO_CUENTA: Record<string, string> = { ahorros: 'Ahorros', corriente: 'Corriente' }

const enlace = 'inline-flex items-center gap-1 font-semibold text-primary-700 hover:text-primary-800 hover:underline'

interface ResumenProps {
  resumen: Resumen
  expedienteId: string
  esTitular: boolean
  /** Contenido del canon en la tarjeta del inmueble; por defecto, el canon registrado. */
  canon?: ReactNode
}

/** Tarjetas de solo lectura: se ven antes de iniciar y en el paso 1. */
export function ResumenContrato({ resumen, expedienteId, esTitular, canon }: ResumenProps) {
  const { arrendador: a, arrendatario, coarrendatario, inmueble, fianza } = resumen
  const returnTo = encodeURIComponent(`/expedientes/${expedienteId}/contrato`)
  const tomadoDelEstudio = 'Tomados del estudio evaluado; no se pueden cambiar.'

  return (
    <div className="space-y-4">
      <Tarjeta
        titulo="Arrendador"
        icono={IconBuilding2}
        pie={
          esTitular ? (
            <Link href={`/configuracion/datos-contrato?returnTo=${returnTo}`} className={enlace}>
              Editar en Datos para contrato <IconArrowRight size={12} />
            </Link>
          ) : (
            'Solo el titular de la inmobiliaria puede cambiar estos datos.'
          )
        }
      >
        <Dato label="Razón social" valor={a.razonSocial} />
        <Dato label="NIT" valor={a.nit} />
        <Dato label="Representante legal" valor={a.representanteLegal} />
        <Dato
          label="Matrícula de arrendador"
          valor={a.matricula && `N° ${a.matricula}${a.matriculaExpedidaPor ? `, expedida por ${a.matriculaExpedidaPor}` : ''}`}
        />
        <Dato
          label="Cuenta de recaudo"
          ancho
          valor={
            a.cuenta.numero &&
            [a.cuenta.banco, a.cuenta.tipo && (TIPO_CUENTA[a.cuenta.tipo] ?? a.cuenta.tipo), `N° ${a.cuenta.numero}`]
              .filter(Boolean)
              .join(' · ')
          }
        />
        <Dato label="Titular de la cuenta" valor={a.cuenta.titular} />
        <Dato label="NIT / C.C. del titular" valor={a.cuenta.nit} />
      </Tarjeta>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Tarjeta titulo="Arrendatario" icono={IconUser} pie={tomadoDelEstudio}>
          <Dato label="Nombre" valor={arrendatario.nombre} ancho />
          <Dato label="Documento" valor={documento(arrendatario.tipoDocumento, arrendatario.numeroDocumento)} ancho />
        </Tarjeta>
        {coarrendatario && (
          <Tarjeta titulo="Coarrendatario" icono={IconUsers} pie={tomadoDelEstudio}>
            <Dato label="Nombre" valor={coarrendatario.nombre} ancho />
            <Dato label="Documento" valor={documento(coarrendatario.tipoDocumento, coarrendatario.numeroDocumento)} ancho />
          </Tarjeta>
        )}
      </div>

      <Tarjeta
        titulo="Inmueble"
        icono={IconHome}
        pie={
          // returnTo: al guardar el inmueble se vuelve al contrato.
          <Link href={`/inmuebles/${inmueble.id}/editar?returnTo=${returnTo}`} className={enlace}>
            Editar en el inmueble <IconArrowRight size={12} />
          </Link>
        }
      >
        <Dato label="Dirección" valor={inmueble.direccion} />
        <Dato label="Municipio" valor={inmueble.municipio} />
        {inmueble.codigo && <Dato label="Código" valor={inmueble.codigo} />}
        {canon ?? <Dato label="Canon registrado" valor={formatCurrency(inmueble.canonRegistroCop)} />}
      </Tarjeta>

      <Tarjeta
        titulo="Fianza"
        icono={IconShieldCheck}
        insignia={
          fianza?.negociada && (
            <span className="rounded-full bg-coral-50 px-2 py-0.5 text-[11px] font-semibold text-coral-700">Tarifa negociada</span>
          )
        }
        pie="Tomado del CRC; no se puede editar."
      >
        {fianza ? (
          <>
            <Dato label="Ruta de aprobación" valor={VIA_LABEL[fianza.via] ?? fianza.via} />
            <Dato
              label="Condiciones"
              valor={`Prima ${porcentaje(fianza.primaPct)} % + IVA, tarifa mensual ${porcentaje(fianza.tarifaPct)} % + IVA, cashback ${porcentaje(fianza.cashbackPct)} %`}
            />
            <Dato
              label="Certificado de Riesgo"
              ancho
              valor={
                fianza.crc &&
                `CRC N° ${fianza.crc.codigo} del ${formatDate(fianza.crc.fechaEmision)} · vigente hasta ${formatDate(fianza.crc.vigenteHasta)}`
              }
            />
          </>
        ) : (
          <Dato label="Condiciones" valor={null} ancho />
        )}
      </Tarjeta>
    </div>
  )
}

interface Paso1Props {
  value: Borrador<Paso1>
  onChange: (v: Borrador<Paso1>) => void
  errores: ErroresPaso
  /** null solo si el API no pudo armar el resumen: queda el canon sin tarjetas. */
  resumen: Resumen | null
  expedienteId: string
  esTitular: boolean
  /** §7.2: la modalidad que fija el convenio de la inmobiliaria (viene preseleccionada). */
  modalidadConvenio?: Paso1['modalidad']
}

export function Paso1Confirmacion({
  value,
  onChange,
  errores,
  resumen,
  expedienteId,
  esTitular,
  modalidadConvenio,
}: Paso1Props) {
  const evaluadoCop = resumen?.canon.evaluadoCop ?? null
  const maximo = resumen?.canon.maximoSinNuevaEvaluacionCop ?? null

  const canon = (
    <div className="sm:col-span-2">
      <CampoPesos
        label="Canon mensual (COP)"
        requerido
        value={value.canonCop}
        onChange={(canonCop) => onChange({ ...value, canonCop })}
        error={errores.canonCop}
        help={
          evaluadoCop !== null && maximo !== null
            ? `Canon evaluado: ${formatCurrency(evaluadoCop)}. Hasta ${formatCurrency(maximo)} sin nueva evaluación, sujeto a la relación canon/ingreso.`
            : undefined
        }
      />
    </div>
  )

  return (
    <div className="space-y-6">
      <EncabezadoPaso titulo="Confirmación" subtitulo="Revisa las partes y la fianza, y pacta el canon y la modalidad." />

      {resumen ? (
        <ResumenContrato resumen={resumen} expedienteId={expedienteId} esTitular={esTitular} canon={canon} />
      ) : (
        canon
      )}

      <fieldset className="space-y-2.5">
        <legend className="mb-2 text-sm font-medium text-gray-700">Ruta del contrato</legend>
        <OpcionTarjeta
          name="ruta"
          checked={value.ruta === 'A'}
          onSelect={() => onChange({ ...value, ruta: 'A' })}
          titulo="Ruta A — contrato de Cofianza"
          descripcion="Cofianza genera el contrato de arrendamiento completo."
          icono={IconFileText}
        />
        <OpcionTarjeta
          name="ruta"
          checked={value.ruta === 'B'}
          onSelect={() => onChange({ ...value, ruta: 'B' })}
          titulo="Ruta B — contrato propio de la inmobiliaria"
          descripcion="Cargas tu contrato en PDF y se firma sin modificaciones, seguido del Anexo de condiciones de la fianza."
          icono={IconScrollText}
        />
        {errores.ruta && <p className="text-xs text-red-600">{errores.ruta}</p>}
        {value.ruta === 'B' && (
          <Aviso>
            En la Ruta B no hay cláusulas adicionales. En el paso 5 cargas el contrato en PDF (máximo 6 MB y 60
            páginas, sin contraseña ni campos editables) y generas el Anexo.
          </Aviso>
        )}
      </fieldset>

      <fieldset className="space-y-2.5">
        <legend className="mb-2 text-sm font-medium text-gray-700">
          Modalidad de la fianza<span className="text-coral-500"> *</span>
        </legend>
        <OpcionTarjeta
          name="modalidad"
          checked={value.modalidad === 'trasladada'}
          onSelect={() => onChange({ ...value, modalidad: 'trasladada' })}
          invalido={!!errores.modalidad && !value.modalidad}
          titulo="Trasladada"
          descripcion="El arrendatario paga la prima y la tarifa mensual de la fianza."
          icono={IconUser}
        />
        <OpcionTarjeta
          name="modalidad"
          checked={value.modalidad === 'tradicional'}
          onSelect={() => onChange({ ...value, modalidad: 'tradicional' })}
          titulo="Tradicional"
          descripcion="La inmobiliaria asume la prima y la tarifa; el arrendatario no paga suma alguna por fianza."
          icono={IconBuilding2}
        />
        {errores.modalidad && <p className="text-xs text-red-600">{errores.modalidad}</p>}
        {modalidadConvenio && (
          <p className="text-xs text-gray-500">
            {value.modalidad === modalidadConvenio
              ? 'Viene preseleccionada según el convenio de tu inmobiliaria con Cofianza; la puedes cambiar para este contrato.'
              : `El convenio de tu inmobiliaria con Cofianza indica la modalidad ${modalidadConvenio === 'trasladada' ? 'Trasladada' : 'Tradicional'}.`}
          </p>
        )}
        {value.modalidad && <Aviso>La cuota de administración no está cubierta por la fianza.</Aviso>}
      </fieldset>
    </div>
  )
}
