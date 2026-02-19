/**
 * Skeleton Loader para Vista Detalle de Inmueble - HP-180
 * Muestra placeholders animados mientras carga los datos
 */

export function InmuebleDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Breadcrumbs skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 bg-gray-200 rounded" />
        <div className="h-4 w-4 bg-gray-200 rounded" />
        <div className="h-4 w-20 bg-gray-200 rounded" />
        <div className="h-4 w-4 bg-gray-200 rounded" />
        <div className="h-4 w-24 bg-gray-200 rounded" />
      </div>

      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-200 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-gray-200 rounded" />
          <div className="h-10 w-32 bg-gray-200 rounded" />
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Image and info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero image skeleton */}
          <div className="aspect-video w-full bg-gray-200 rounded-lg" />

          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Basic info card */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="h-5 w-32 bg-gray-200 rounded" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
                <div className="h-4 w-1/2 bg-gray-200 rounded" />
              </div>
            </div>

            {/* Location card */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="h-5 w-28 bg-gray-200 rounded" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-2/3 bg-gray-200 rounded" />
                <div className="h-4 w-1/2 bg-gray-200 rounded" />
              </div>
            </div>
          </div>

          {/* Characteristics */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="h-5 w-36 bg-gray-200 rounded" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-gray-200 rounded" />
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column - Sidebar */}
        <div className="space-y-6">
          {/* Status card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-6 w-24 bg-gray-200 rounded-full" />
              <div className="h-4 w-32 bg-gray-200 rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-10 w-full bg-gray-200 rounded" />
              <div className="h-10 w-full bg-gray-200 rounded" />
            </div>
          </div>

          {/* Financial card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="h-5 w-40 bg-gray-200 rounded" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-20 bg-gray-200 rounded" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
              </div>
              <div className="flex justify-between">
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-4 w-20 bg-gray-200 rounded" />
              </div>
              <div className="border-t pt-2 flex justify-between">
                <div className="h-5 w-16 bg-gray-200 rounded" />
                <div className="h-5 w-28 bg-gray-200 rounded" />
              </div>
            </div>
          </div>

          {/* Owner card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="h-5 w-28 bg-gray-200 rounded" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gray-200 rounded-full" />
              <div className="space-y-1">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-24 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-4 border-b pb-3 mb-4">
          <div className="h-8 w-24 bg-gray-200 rounded" />
          <div className="h-8 w-20 bg-gray-200 rounded" />
          <div className="h-8 w-28 bg-gray-200 rounded" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
          <div className="h-4 w-1/2 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  )
}
