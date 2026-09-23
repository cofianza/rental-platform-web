/**
 * Editor de una cláusula adicional (Contratos V3, Entrega 4): la inmobiliaria
 * redacta las suyas desde el paso 4 y el administrador, las de la biblioteca.
 *
 * Guardar corre las reglas (y la IA, si está encendida) en el API. Un 422 trae
 * los hallazgos y se pintan aquí sin perder el texto; un 503 (revisión
 * automática caída) también deja el texto en el editor. Los toasts los pone
 * `guardarClausula` (hooks/useClausulasAdicionales).
 */

'use client'

import { useEffect, useId, useState, type FormEvent } from 'react'
import { Button, Modal } from '@/components/ui'
import type { ResultadoGuardado } from '@/hooks/useClausulasAdicionales'
import type { ClausulaEntrada } from '@/services/clausulasService'
import type { ClausulaCatalogo, Hallazgo } from '@/types/contratoV3'
import { Aviso, Campo, inputClass } from './campos'

const TITULO_MAX = 120
const TEXTO_MAX = 4000
const miles = (n: number) => n.toLocaleString('es-CO')

function Items({ lista }: { lista: Hallazgo[] }) {
  return (
    <ul className="mt-2 space-y-2.5">
      {lista.map((h, i) => (
        <li key={`${h.codigo}-${i}`}>
          <p className="font-semibold">{h.etiqueta}</p>
          <p>{h.mensaje}</p>
          {h.norma && <p className="mt-0.5 text-xs opacity-80">Norma: {h.norma}</p>}
          {h.fragmento && <p className="mt-0.5 break-words text-xs opacity-80">Texto detectado: «{h.fragmento}»</p>}
        </li>
      ))}
    </ul>
  )
}

/**
 * Hallazgos que bloquean (rojo) y avisos que no (ámbar) de un 422 del API.
 * El paso 4 la usa bajo cada fila con su propio `titulo`.
 */
export function ListaHallazgos({
  hallazgos,
  avisos = [],
  titulo = 'La cláusula no se puede guardar:',
}: {
  hallazgos: Hallazgo[]
  avisos?: Hallazgo[]
  titulo?: string
}) {
  if (hallazgos.length === 0 && avisos.length === 0) return null
  return (
    <div className="space-y-2">
      {hallazgos.length > 0 && (
        <Aviso tono="error">
          <p className="font-medium">{titulo}</p>
          <Items lista={hallazgos} />
        </Aviso>
      )}
      {avisos.length > 0 && (
        <Aviso tono="aviso">
          <p className="font-medium">Revisa:</p>
          <Items lista={avisos} />
        </Aviso>
      )}
    </div>
  )
}

type Fallo = Extract<ResultadoGuardado, { ok: false }>

interface EditorProps {
  isOpen: boolean
  onClose: () => void
  /**
   * Sin ella crea; con ella edita su `version` (CAS: el API responde 409 si ya
   * cambió). Pasa el objeto vigente del catálogo: tras un 409 el catálogo se
   * recarga y el siguiente guardado usa la versión nueva.
   */
  clausula?: Pick<ClausulaCatalogo, 'id' | 'version' | 'titulo' | 'texto'> | null
  /** Biblioteca de Cofianza (administrador): admite [[campo]]. */
  biblioteca?: boolean
  /** `guardar` de useClausulasAdicionales o de useClausulasAdmin. */
  onGuardar: (c: ClausulaEntrada, editando?: { id: string; version: number }) => Promise<ResultadoGuardado>
  /** Después de guardar con éxito (el editor ya se cerró). */
  onGuardada?: (c: ClausulaCatalogo) => void
}

export function EditorClausula({ isOpen, onClose, ...resto }: EditorProps) {
  const [guardando, setGuardando] = useState(false)
  // Escape, la X o Cancelar con texto sin guardar piden confirmación (antes
  // se perdían hasta 4.000 caracteres con una tecla).
  const [sucio, setSucio] = useState(false)
  const [pidiendoSalir, setPidiendoSalir] = useState(false)
  const salir = () => {
    setSucio(false)
    setPidiendoSalir(false)
    onClose()
  }
  const cerrar = () => {
    if (guardando) return
    if (sucio) setPidiendoSalir(true)
    else salir()
  }
  return (
    <Modal
      isOpen={isOpen}
      onClose={cerrar}
      title={resto.clausula ? 'Editar cláusula' : 'Nueva cláusula'}
      size="lg"
      closeOnBackdrop={false}
    >
      {/* Modal no pinta nada cerrado: el formulario arranca limpio en cada apertura. */}
      <Formulario
        {...resto}
        onClose={salir}
        onCancelar={cerrar}
        onSucio={setSucio}
        pidiendoSalir={pidiendoSalir}
        onSeguir={() => setPidiendoSalir(false)}
        guardando={guardando}
        setGuardando={setGuardando}
      />
    </Modal>
  )
}

function Formulario({
  clausula,
  biblioteca,
  onGuardar,
  onGuardada,
  onClose,
  onCancelar,
  onSucio,
  pidiendoSalir,
  onSeguir,
  guardando,
  setGuardando,
}: Omit<EditorProps, 'isOpen'> & {
  guardando: boolean
  setGuardando: (v: boolean) => void
  onCancelar: () => void
  onSucio: (v: boolean) => void
  pidiendoSalir: boolean
  onSeguir: () => void
}) {
  const [titulo, setTitulo] = useState(clausula?.titulo ?? '')
  const [texto, setTexto] = useState(clausula?.texto ?? '')
  const sucio = titulo !== (clausula?.titulo ?? '') || texto !== (clausula?.texto ?? '')
  useEffect(() => onSucio(sucio), [sucio, onSucio])
  const [intentado, setIntentado] = useState(false)
  const [fallo, setFallo] = useState<Fallo | null>(null)
  const idTexto = useId()

  const t = titulo.trim()
  const x = texto.trim()
  const errTitulo = intentado && t.length < 3 ? 'Escribe un título de al menos 3 caracteres.' : undefined
  const errTexto = intentado && x.length < 20 ? 'Escribe un texto de al menos 20 caracteres.' : undefined

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    setIntentado(true)
    if (guardando || t.length < 3 || x.length < 20) return
    setGuardando(true)
    setFallo(null)
    try {
      const r = await onGuardar(
        { titulo: t, texto: x },
        clausula ? { id: clausula.id, version: clausula.version } : undefined,
      )
      if (r.ok) {
        onClose()
        onGuardada?.(r.clausula)
      } else {
        setFallo(r)
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="space-y-4">
      <Campo
        label="Título"
        requerido
        autoFocus
        maxLength={TITULO_MAX}
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        error={errTitulo}
        help={`${titulo.length}/${TITULO_MAX}`}
      />

      <div>
        <label htmlFor={idTexto} className="mb-1 block text-sm font-medium text-gray-700">
          Texto<span className="text-coral-500"> *</span>
        </label>
        <textarea
          id={idTexto}
          rows={8}
          maxLength={TEXTO_MAX}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-invalid={!!errTexto}
          aria-describedby={`${idTexto}-ayuda`}
          className={inputClass(errTexto)}
        />
        <div id={`${idTexto}-ayuda`} className="mt-1 flex items-start justify-between gap-3 text-xs text-gray-500">
          <div className="space-y-1">
            <p>
              Se imprime como un solo párrafo, con el título en mayúsculas. Nombra otras cláusulas por su título, no
              por su número.
            </p>
            {biblioteca && (
              <p>
                Escribe [[nombre del dato]] donde la inmobiliaria deba completar un dato (máximo 10). Ejemplo: [[número
                del parqueadero]].
              </p>
            )}
          </div>
          <span className="shrink-0 tabular-nums">
            {miles(texto.length)}/{miles(TEXTO_MAX)}
          </span>
        </div>
        {errTexto && <p className="mt-1 text-xs text-red-600">{errTexto}</p>}
      </div>

      {fallo?.revisionNoDisponible && (
        <Aviso tono="error">
          No pudimos completar la revisión automática. Tu texto sigue aquí; intenta de nuevo en unos minutos.
        </Aviso>
      )}
      {fallo && <ListaHallazgos hallazgos={fallo.hallazgos} avisos={fallo.avisos} />}

      {pidiendoSalir && (
        <Aviso tono="aviso">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Tienes cambios sin guardar. ¿Los descartas?</span>
            <div className="flex gap-2">
              <Button variante="secondary" tamano="sm" onClick={onSeguir}>
                Seguir editando
              </Button>
              <Button variante="secondary" tamano="sm" onClick={onClose}>
                Descartar
              </Button>
            </div>
          </div>
        </Aviso>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button variante="secondary" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cláusula'}
        </Button>
      </div>
    </form>
  )
}
