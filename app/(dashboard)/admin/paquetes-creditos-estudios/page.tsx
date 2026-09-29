/**
 * Admin: CRUD de paquetes de creditos de estudios.
 * La ve cualquier administrador; crear, editar y desactivar paquetes (precio
 * y cantidad) solo la Gerencia General (Adenda de precios §9.14; el API
 * responde 403 al resto). La vigencia ya no es del paquete: es el parámetro
 * VIGENCIA_PAQUETE_MESES de /admin/calibracion (§9.6).
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import {
  creditosEstudiosService,
  type IPaqueteCreditos,
  type ICreatePaqueteInput,
} from '@/services/creditosEstudiosService'
import {
  IconLoader,
  IconPlus,
  IconEdit,
  IconTrash,
  IconLock,
} from '@/components/icons'

const formatCOP = (n: number) => `$${n.toLocaleString('es-CO')}`

interface PaqueteFormState {
  nombre: string
  descripcion: string
  cantidad_estudios: string
  precio_cop: string
  activo: boolean
  orden: string
}

const EMPTY_FORM: PaqueteFormState = {
  nombre: '',
  descripcion: '',
  cantidad_estudios: '',
  precio_cop: '',
  activo: true,
  orden: '0',
}

export default function AdminPaquetesPage() {
  const { user } = useAuth()
  const esGerencia = user?.es_gerencia_general === true
  const [paquetes, setPaquetes] = useState<IPaqueteCreditos[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<IPaqueteCreditos | null>(null)
  const [form, setForm] = useState<PaqueteFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchPaquetes = async () => {
    try {
      const data = await creditosEstudiosService.adminListPaquetes()
      setPaquetes(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando paquetes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.rol === 'administrador') fetchPaquetes()
    else setLoading(false)
  }, [user])

  if (user?.rol !== 'administrador') {
    return (
      <div className="space-y-6">
        <PageHeader title="Paquetes de créditos" />
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-3">
          <IconLock className="text-red-600" size={20} />
          <p className="text-sm text-red-800">
            Solo los administradores pueden acceder a esta sección.
          </p>
        </div>
      </div>
    )
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (p: IPaqueteCreditos) => {
    setEditing(p)
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      cantidad_estudios: String(p.cantidad_estudios),
      precio_cop: String(p.precio_cop),
      activo: p.activo,
      orden: String(p.orden),
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.cantidad_estudios || !form.precio_cop) {
      toast.error('Nombre, cantidad y precio son obligatorios')
      return
    }
    const input: ICreatePaqueteInput = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(), // vacía = quitarla (la API la guarda como null)
      cantidad_estudios: parseInt(form.cantidad_estudios, 10),
      precio_cop: parseInt(form.precio_cop, 10),
      activo: form.activo,
      orden: parseInt(form.orden, 10) || 0,
    }
    setSaving(true)
    try {
      if (editing) {
        await creditosEstudiosService.adminUpdatePaquete(editing.id, input)
        toast.success('Paquete actualizado')
      } else {
        await creditosEstudiosService.adminCreatePaquete(input)
        toast.success('Paquete creado')
      }
      setModalOpen(false)
      fetchPaquetes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error guardando paquete')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (p: IPaqueteCreditos) => {
    toast(`¿Desactivar el paquete "${p.nombre}"?`, {
      description: 'No se borrará — quedará oculto pero las compras existentes se conservan.',
      duration: 10000,
      action: {
        label: 'Desactivar',
        onClick: async () => {
          try {
            await creditosEstudiosService.adminDeletePaquete(p.id)
            toast.success('Paquete desactivado')
            fetchPaquetes()
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error')
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <IconLoader className="animate-spin text-primary-600" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paquetes de créditos de estudios"
        subtitle="Configura los paquetes que las inmobiliarias compran para liberar estudios"
        actions={
          esGerencia ? (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-md hover:bg-primary-800 transition"
            >
              <IconPlus size={16} />
              Nuevo paquete
            </button>
          ) : undefined
        }
      />

      <p className="flex items-start gap-1.5 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
        <IconLock size={14} className="mt-0.5 shrink-0" />
        <span>
          Los precios y cantidades de los paquetes solo los cambia la Gerencia General, y cada cambio queda en la
          auditoría. La vigencia de los paquetes se fija en{' '}
          <Link href="/admin/calibracion" className="font-medium text-primary-700 hover:underline">
            Calibración
          </Link>{' '}
          (vigencia del paquete, en meses).
        </span>
      </p>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Orden
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Nombre
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Cantidad
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Precio
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Por estudio
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Estado
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paquetes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">
                  No hay paquetes configurados
                </td>
              </tr>
            ) : (
              paquetes.map((p) => {
                const porEstudio = Math.round(p.precio_cop / p.cantidad_estudios)
                return (
                  <tr key={p.id} className={!p.activo ? 'opacity-50' : ''}>
                    <td className="px-4 py-3 text-sm text-gray-700">{p.orden}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{p.nombre}</div>
                      {p.descripcion && (
                        <div className="text-xs text-gray-500">{p.descripcion}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {p.cantidad_estudios}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {/* Adenda de precios §1.1: el precio es la base; se cobra con TARIFA_IVA. */}
                      {p.total_cop != null ? (
                        <>
                          <div>{formatCOP(p.precio_cop)} + IVA</div>
                          <div className="text-xs font-normal text-gray-500">= {formatCOP(p.total_cop)}</div>
                        </>
                      ) : (
                        formatCOP(p.precio_cop)
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500">
                      {formatCOP(porEstudio)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {p.activo ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {esGerencia ? (
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition"
                            title="Editar"
                          >
                            <IconEdit size={16} />
                          </button>
                          {p.activo && (
                            <button
                              onClick={() => handleDelete(p)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                              title="Desactivar"
                            >
                              <IconTrash size={16} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <IconLock size={14} />
                          Solo Gerencia General
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Editar paquete' : 'Nuevo paquete'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="paquetes-creditos-estudios-nombre" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input id="paquetes-creditos-estudios-nombre"
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              placeholder="Paquete 5 estudios"
            />
          </div>

          <div>
            <label htmlFor="paquetes-creditos-estudios-descripcion" className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input id="paquetes-creditos-estudios-descripcion"
              type="text"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              placeholder="Opcional — visible al inmobiliario"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="paquetes-creditos-estudios-cantidad-de-estudios" className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad de estudios <span className="text-red-500">*</span>
              </label>
              <input id="paquetes-creditos-estudios-cantidad-de-estudios"
                type="number"
                min={1}
                value={form.cantidad_estudios}
                onChange={(e) => setForm({ ...form, cantidad_estudios: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="paquetes-creditos-estudios-precio-cop" className="block text-sm font-medium text-gray-700 mb-1">
                Precio base sin IVA (COP) <span className="text-red-500">*</span>
              </label>
              <input id="paquetes-creditos-estudios-precio-cop"
                type="number"
                min={1000}
                step={1000}
                value={form.precio_cop}
                onChange={(e) => setForm({ ...form, precio_cop: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="paquetes-creditos-estudios-orden" className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
              <input id="paquetes-creditos-estudios-orden"
                type="number"
                min={0}
                value={form.orden}
                onChange={(e) => setForm({ ...form, orden: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Activo</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-md hover:bg-primary-800 disabled:opacity-50 transition flex items-center gap-2"
            >
              {saving && <IconLoader className="animate-spin" size={14} />}
              {editing ? 'Guardar cambios' : 'Crear paquete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
