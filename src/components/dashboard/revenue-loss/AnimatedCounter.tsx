import { useState, useEffect, useRef } from 'react'

interface AnimatedCounterProps {
  target: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
  decimals?: number
  startDelay?: number
}

export default function AnimatedCounter({
  target,
  duration = 2000,
  prefix = '$',
  suffix = '',
  className = '',
  decimals = 0,
  startDelay = 300,
}: AnimatedCounterProps) {
  const [current, setCurrent] = useState(0)
  const [started, setStarted] = useState(false)
  const rafRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), startDelay)
    return () => clearTimeout(timeout)
  }, [startDelay])

  useEffect(() => {
    if (!started || target === 0) {
      setCurrent(target)
      return
    }

    startTimeRef.current = performance.now()

    function animate(now: number) {
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out cubic for dramatic slow-down at end
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * target))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setCurrent(target)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, started])

  const formatted = decimals > 0
    ? current.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : current.toLocaleString()

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  )
}

/* ── Smaller animated number for inline use ── */
export function MiniCounter({ target, prefix = '$', className = '' }: {
  target: number; prefix?: string; className?: string
}) {
  const [current, setCurrent] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (target === 0) { setCurrent(0); return }
    const start = performance.now()
    function tick(now: number) {
      const p = Math.min((now - start) / 1200, 1)
      setCurrent(Math.round((1 - Math.pow(1 - p, 2)) * target))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target])

  return <span className={className}>{prefix}{current.toLocaleString()}</span>
}
