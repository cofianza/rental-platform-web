/** Mientras Next.js trae una página del panel: la forma de una lista, no una pantalla vacía. */

import { SkeletonPage } from '@/components/ui/Skeleton'

export default function CargandoPanel() {
  return <SkeletonPage />
}
