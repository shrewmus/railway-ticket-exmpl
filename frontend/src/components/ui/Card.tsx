import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'article' | 'div'
  children: ReactNode
}

export function Card({
  as = 'section',
  children,
  className,
  ...props
}: CardProps) {
  const Component = as

  return (
    <Component
      className={[
        'rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Component>
  )
}
