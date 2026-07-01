import { useEffect, useRef, useState } from 'react'

/**
 * Scroll-reveal wrapper. Adds the `.is-in` class (opacity+translateY → settle)
 * once the element enters the viewport, once. Honors prefers-reduced-motion via
 * the CSS layer (the class is inert there). `delay` staggers grid children.
 *
 * Follows the design-engineering skill: reveals ease OUT from a slight offset —
 * never from scale(0) — and fire on a first-time/occasional surface (marketing),
 * where a little motion adds clarity without being seen hundreds of times a day.
 */
export default function Reveal({ children, delay = 0, as: Tag = 'div', className = '', ...rest }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || shown) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setShown(true); io.disconnect() }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [shown])

  return (
    <Tag
      ref={ref}
      className={`reveal ${shown ? 'is-in' : ''} ${className}`}
      style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
