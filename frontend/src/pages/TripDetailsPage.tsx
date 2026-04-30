import { useParams } from 'react-router'

export function TripDetailsPage() {
  const { tripId } = useParams<{ tripId: string }>()

  return (
    <section className="hero-panel">
      <p className="eyebrow">Trip details</p>
      <h1>Trip details placeholder</h1>
      <p className="summary">
        This route will show route details.
      </p>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Selected trip ID:{' '}
        <span className="font-semibold text-[var(--text)]">
          {tripId ?? 'missing'}
        </span>
      </p>
    </section>
  )
}
