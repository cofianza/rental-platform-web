/**
 * Layout para páginas de autenticación
 * Layout centrado sin sidebar ni header
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-6">
        {children}
      </div>
    </div>
  )
}
