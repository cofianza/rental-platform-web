'use client'

// Esqueletos del listado de contratos: reutilizan los compartidos de
// components/ui/Skeleton (en el celular se ven como tarjetas).
import { SkeletonPage, SkeletonTable } from '@/components/ui/Skeleton'

export function ContratosSkeleton() {
  return <SkeletonTable filas={5} columnas={7} etiqueta="Cargando contratos…" />
}

export function ContratosPageSkeleton() {
  return <SkeletonPage etiqueta="Cargando contratos…" />
}
