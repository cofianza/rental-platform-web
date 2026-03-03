'use client'

import React, { useRef, useCallback, type Dispatch, type SetStateAction } from 'react'

interface UseTouchGesturesOptions {
  zoom: number
  setZoom: Dispatch<SetStateAction<number>>
  position: { x: number; y: number }
  setPosition: Dispatch<SetStateAction<{ x: number; y: number }>>
  minZoom: number
  maxZoom: number
}

function getTouchDistance(t1: React.Touch, t2: React.Touch): number {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
}

export function useTouchGestures({
  zoom,
  setZoom,
  position,
  setPosition,
  minZoom,
  maxZoom,
}: UseTouchGesturesOptions) {
  const initialPinchDistance = useRef<number | null>(null)
  const initialPinchZoom = useRef(1)
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        initialPinchDistance.current = getTouchDistance(e.touches[0], e.touches[1])
        initialPinchZoom.current = zoom
        lastTouchCenter.current = null
      } else if (e.touches.length === 1 && zoom > 1) {
        lastTouchCenter.current = {
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        }
      }
    },
    [zoom, position]
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistance.current !== null) {
        e.preventDefault()
        const newDistance = getTouchDistance(e.touches[0], e.touches[1])
        const scale = newDistance / initialPinchDistance.current
        const targetZoom = Math.min(maxZoom, Math.max(minZoom, initialPinchZoom.current * scale))
        setZoom(targetZoom)

        if (targetZoom <= minZoom) {
          setPosition({ x: 0, y: 0 })
        }
      } else if (e.touches.length === 1 && zoom > 1 && lastTouchCenter.current) {
        setPosition({
          x: e.touches[0].clientX - lastTouchCenter.current.x,
          y: e.touches[0].clientY - lastTouchCenter.current.y,
        })
      }
    },
    [zoom, minZoom, maxZoom, setZoom, setPosition]
  )

  const onTouchEnd = useCallback(() => {
    initialPinchDistance.current = null
    lastTouchCenter.current = null
  }, [])

  return { onTouchStart, onTouchMove, onTouchEnd }
}
