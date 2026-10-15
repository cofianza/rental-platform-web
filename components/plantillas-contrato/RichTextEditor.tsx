'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useCallback, useState, useRef } from 'react'
import {
  IconAlignCenter,
  IconAlignJustify,
  IconAlignLeft,
  IconAlignRight,
  IconBold,
  IconChevronDown,
  IconItalic,
  IconList,
  IconListOrdered,
  IconMinus,
  IconPlus,
  IconRedo,
  IconUnderline,
  IconUndo,
} from '@/components/icons'

// ============================================================
// Standard variables available for contract templates
// ============================================================

const VARIABLE_GROUPS = [
  {
    label: 'Arrendador',
    variables: [
      { key: 'arrendador_nombre', label: 'Nombre del arrendador' },
      { key: 'arrendador_documento', label: 'Documento del arrendador' },
    ],
  },
  {
    label: 'Arrendatario',
    variables: [
      { key: 'arrendatario_nombre', label: 'Nombre del arrendatario' },
      { key: 'arrendatario_documento', label: 'Documento del arrendatario' },
    ],
  },
  {
    label: 'Inmueble',
    variables: [
      { key: 'inmueble_direccion', label: 'Direccion del inmueble' },
      { key: 'inmueble_ciudad', label: 'Ciudad del inmueble' },
    ],
  },
  {
    label: 'Contrato',
    variables: [
      { key: 'canon_mensual', label: 'Canon mensual' },
      { key: 'fecha_inicio', label: 'Fecha de inicio' },
      { key: 'fecha_fin', label: 'Fecha de fin' },
      { key: 'duracion_meses', label: 'Duración en meses' },
      { key: 'deposito', label: 'Depósito' },
      { key: 'clausulas_adicionales', label: 'Cláusulas adicionales' },
    ],
  },
]

// ============================================================
// Toolbar Button
// ============================================================

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={isActive}
      className={`p-1.5 rounded text-sm font-medium transition-colors ${
        isActive
          ? 'bg-primary-100 text-primary-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}

// ============================================================
// Variable Dropdown
// ============================================================

function VariableDropdown({ onInsert }: { onInsert: (variable: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    // Escape cierra solo el menú. En captura y con preventDefault: el editor
    // vive dentro de un Modal que también escucha Escape, y sin esto se
    // cerraba el editor completo con todo el texto escrito.
    function handleEscape(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape, true)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleEscape, true)
      }
    }
  }, [isOpen])

  function handleToggle() {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPos({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - 288), // 288 = w-72
      })
    }
    setIsOpen(!isOpen)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
      >
        <IconPlus size={14} />
        Variable
        <IconChevronDown size={12} />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="fixed w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-100 max-h-80 overflow-y-auto"
          style={{ top: pos.top, left: pos.left }}
        >
          {VARIABLE_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">
                {group.label}
              </div>
              {group.variables.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => {
                    onInsert(v.key)
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors flex items-center justify-between"
                >
                  <span className="text-gray-700">{v.label}</span>
                  <code className="text-xs text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                    {`{{${v.key}}}`}
                  </code>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ============================================================
// Toolbar
// ============================================================

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const insertVariable = useCallback(
    (variable: string) => {
      editor?.chain().focus().insertContent(`{{${variable}}}`).run()
    },
    [editor],
  )

  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-gray-200 bg-gray-50/50">
      {/* Text style */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Título 1"
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Título 2"
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Título 3"
      >
        H3
      </ToolbarButton>

      <div className="w-px h-5 bg-gray-300 mx-1" />

      {/* Bold / Italic / Underline */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Negrita (Ctrl+B)"
      >
        <IconBold size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Cursiva (Ctrl+I)"
      >
        <IconItalic size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Subrayado (Ctrl+U)"
      >
        <IconUnderline size={16} />
      </ToolbarButton>

      <div className="w-px h-5 bg-gray-300 mx-1" />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Lista con viñetas"
      >
        <IconList size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Lista numerada"
      >
        <IconListOrdered size={16} />
      </ToolbarButton>

      <div className="w-px h-5 bg-gray-300 mx-1" />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title="Alinear izquierda"
      >
        <IconAlignLeft size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title="Centrar"
      >
        <IconAlignCenter size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        title="Alinear derecha"
      >
        <IconAlignRight size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        isActive={editor.isActive({ textAlign: 'justify' })}
        title="Justificar"
      >
        <IconAlignJustify size={16} />
      </ToolbarButton>

      <div className="w-px h-5 bg-gray-300 mx-1" />

      {/* Horizontal rule */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Línea horizontal"
      >
        <IconMinus size={16} />
      </ToolbarButton>

      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Deshacer (Ctrl+Z)"
      >
        <IconUndo size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Rehacer (Ctrl+Shift+Z)"
      >
        <IconRedo size={16} />
      </ToolbarButton>

      <div className="flex-1" />

      {/* Variable insertion */}
      <VariableDropdown onInsert={insertVariable} />
    </div>
  )
}

// ============================================================
// Main Editor Component
// ============================================================

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Escriba el contenido de la plantilla aqui...',
      }),
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3',
      },
    },
  })

  // Sync external content changes (e.g. when switching between create/edit).
  // Sin emitUpdate: cargar contenido no es editarlo; si emitiera, onChange
  // reescribiría el HTML del padre con lo que TipTap sabe representar.
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [editor, content])

  if (!editor) return null

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
