/**
 * Indicadores de los últimos 30 días (Política V4.1 §8, Adenda 2 §5.1 y §8):
 * sirven para decidir si conviene mover un valor. null = no se pudo cargar;
 * son informativos y no tumban el panel.
 */

import type { ICascadaCentrales, IRevisionManual } from '@/services/calibracionService'
import { formatDate } from '@/lib/constants'

const pct = (n: number, total: number) => (total > 0 ? `${Math.round((n / total) * 100)} %` : '—')
const num = (n: number) => n.toLocaleString('es-CO')

function Dato({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <dt className="text-xs font-semibold text-gray-600">{label}</dt>
      <dd className="mt-1 text-2xl font-bold text-gray-900">{valor}</dd>
      {sub && <dd className="text-xs text-gray-500">{sub}</dd>}
    </div>
  )
}

function Bloque({ titulo, ayuda, children }: { titulo: string; ayuda: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-bold text-gray-900">{titulo}</h3>
      <p className="mb-3 text-xs text-gray-500">{ayuda}</p>
      {children}
    </section>
  )
}

export function Indicadores({ cascada, revision }: { cascada: ICascadaCentrales | null; revision: IRevisionManual | null }) {
  const sinCargar = <p className="text-sm text-gray-500">No se pudo cargar este resumen.</p>
  return (
    <div className="space-y-4">
      <Bloque titulo="Consultas a las centrales de riesgo" ayuda="Cuántos estudios se decidieron con una sola central y cuántos necesitaron las dos.">
        {cascada === null ? (
          sinCargar
        ) : cascada.total === 0 ? (
          <p className="text-sm text-gray-500">Sin estudios consultados desde {formatDate(cascada.desde)}.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Dato label="Estudios consultados" valor={num(cascada.total)} sub={`desde ${formatDate(cascada.desde)}`} />
            <Dato label="Con una sola central" valor={pct(cascada.una_central, cascada.total)} sub={`${num(cascada.una_central)} estudios`} />
            <Dato label="Con las dos centrales" valor={pct(cascada.dos_centrales, cascada.total)} sub={`${num(cascada.dos_centrales)} estudios`} />
            <Dato
              label="Sin dato"
              valor={num(cascada.sin_dato)}
              sub={cascada.sin_dato > 0 ? 'no cuentan en los porcentajes' : 'todos quedaron registrados'}
            />
          </dl>
        )}
      </Bloque>

      <Bloque titulo="Revisión manual" ayuda="Estudios que decide un analista de Cofianza y cuánto se tarda.">
        {revision === null ? (
          sinCargar
        ) : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Dato label="Esperando revisión ahora" valor={num(revision.en_revision_ahora)} />
            <Dato
              label="Revisadas"
              valor={num(revision.resueltas)}
              sub={revision.resueltas > 0 ? `${pct(revision.dentro_del_sla, revision.resueltas)} dentro del plazo` : undefined}
            />
            <Dato
              label="Tiempo promedio"
              valor={revision.promedio_horas_habiles === null ? '—' : `${revision.promedio_horas_habiles} h`}
              sub={`horas hábiles · el plazo es ${revision.sla_horas_habiles} h`}
            />
            <Dato label="Por falta de ingreso" valor={num(revision.escaladas_sin_ingreso)} sub="las centrales no estimaron ingreso" />
          </dl>
        )}
      </Bloque>

      {revision !== null && (
        <Bloque titulo="DataCrédito" ayuda="Si la central responde y si los datos que se le envían están bien.">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Dato label="Consultas" valor={num(revision.datacredito.consultas)} />
            <Dato label="Veces que no respondió" valor={num(revision.datacredito.caidas)} />
            <Dato
              label="Tasa de caída"
              valor={revision.datacredito.tasa_caida_pct === null ? '—' : `${revision.datacredito.tasa_caida_pct} %`}
              sub="se revisa a los 3 meses"
            />
            <Dato label="Errores en los datos enviados" valor={num(revision.datacredito.errores_de_dato)} sub="documento o apellido; no es falla de la central" />
          </dl>
          <p className="mt-3 text-xs text-gray-500">
            Horas hábiles: lunes a viernes de 8:00 a 18:00 (sin descontar festivos). Las caídas se distinguen desde el 11 de septiembre
            de 2026.
          </p>
        </Bloque>
      )}
    </div>
  )
}
