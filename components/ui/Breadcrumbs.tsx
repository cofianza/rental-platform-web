/**
 * Breadcrumbs - HP-180
 * Navegación jerárquica con enlaces
 */

import Link from 'next/link'
import { IconChevronRight, IconHome } from '@/components/icons'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  showHome?: boolean
}

export function Breadcrumbs({ items, showHome = true }: BreadcrumbsProps) {
  const allItems = showHome
    ? [{ label: 'Inicio', href: '/dashboard' }, ...items]
    : items

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm">
      <ol className="flex items-center gap-1.5">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1
          const isHome = index === 0 && showHome

          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <IconChevronRight size={14} className="text-gray-400 flex-shrink-0" />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1 text-gray-500 hover:text-primary-600 transition-colors"
                >
                  {isHome && <IconHome size={14} />}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span className="flex items-center gap-1 text-gray-900 font-medium">
                  {isHome && <IconHome size={14} />}
                  <span className="truncate max-w-[200px]">{item.label}</span>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
