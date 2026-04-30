import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={[
        'min-h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] shadow-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[rgba(15,118,110,0.18)] disabled:cursor-not-allowed disabled:bg-[rgba(216,224,220,0.3)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}
