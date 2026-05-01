import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { apiClient } from '../api/client'
import { Button, Card } from '../components/ui'
import { appRoutes } from '../app/routes'
import {
  formatPrice,
  formatStationLabel,
  formatTripTime,
} from '../lib/format'

export function TripDetailsPage() {
  const navigate = useNavigate()
  const { tripId } = useParams<{ tripId: string }>()
  const [searchParams] = useSearchParams()
  const fromStationId = searchParams.get('fromStationId')
  const toStationId = searchParams.get('toStationId')
  const seatCount = searchParams.get('seatCount')

  const searchQueryString = searchParams.toString()
  const searchPageUrl = searchQueryString
    ? `${appRoutes.search}?${searchQueryString}`
    : appRoutes.search
  const requestedSeatCount = seatCount ? Number(seatCount) : null
  const hasRequiredSegmentParams = Boolean(tripId && fromStationId && toStationId)
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([])

  const tripDetailsQuery = useQuery({
    queryKey: ['trip-details', tripId, fromStationId, toStationId],
    queryFn: () =>
      apiClient.getTripDetails(tripId!, {
        fromStationId: fromStationId!,
        toStationId: toStationId!,
    }),
    enabled: hasRequiredSegmentParams,
  })
  const tripSeatsQuery = useQuery({
    queryKey: ['trip-seats', tripId, fromStationId, toStationId],
    queryFn: () =>
      apiClient.getTripSeats(tripId!, {
        fromStationId: fromStationId!,
        toStationId: toStationId!,
      }),
    enabled: hasRequiredSegmentParams,
  })

  const selectedSeats =
    tripSeatsQuery.data?.filter((seat) => selectedSeatIds.includes(seat.seatId)) ??
    []
  const hasExactSeatCountSelection =
    requestedSeatCount !== null && selectedSeatIds.length === requestedSeatCount
  const hasReachedSeatSelectionLimit =
    requestedSeatCount !== null && selectedSeatIds.length >= requestedSeatCount
  const selectedSeatTotal =
    tripDetailsQuery.data && selectedSeatIds.length > 0
      ? tripDetailsQuery.data.selectedSegment.pricePerSeat * selectedSeatIds.length
      : 0
  const requestedSeatTotal =
    tripDetailsQuery.data && requestedSeatCount !== null
      ? tripDetailsQuery.data.selectedSegment.pricePerSeat * requestedSeatCount
      : null

  function toggleSeatSelection(seatId: string) {
    setSelectedSeatIds((currentSelectedSeatIds) =>
      currentSelectedSeatIds.includes(seatId)
        ? currentSelectedSeatIds.filter((selectedSeatId) => selectedSeatId !== seatId)
        : requestedSeatCount !== null &&
            currentSelectedSeatIds.length >= requestedSeatCount
          ? currentSelectedSeatIds
          : [...currentSelectedSeatIds, seatId],
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <section className="hero-panel">
        <Button
          variant="secondary"
          onClick={() => navigate(searchPageUrl)}
        >
          &larr; Back to search
        </Button>
        <p className="eyebrow">Trip details</p>
        <h1>Trip details and segment context</h1>
        <p className="summary">
          This page now loads the selected trip using the preserved route
          segment from search results. The next tasks will turn this payload
          into the route timeline and booking context UI.
        </p>
      </section>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="eyebrow mb-0">Route timeline</p>
            <h2 className="text-2xl leading-tight text-[var(--text)]">
              Full ordered route
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-[var(--muted)]">
              This timeline shows every stop returned for the selected trip.
              The next task will apply explicit segment highlighting to this
              structure.
            </p>
          </div>

          {!hasRequiredSegmentParams ? (
            <p className="text-sm leading-6 text-[var(--danger)]">
              Missing required route context, so the route timeline cannot be
              loaded.
            </p>
          ) : tripDetailsQuery.isLoading ? (
            <p className="text-sm leading-6 text-[var(--muted)]">
              Loading full route timeline...
            </p>
          ) : tripDetailsQuery.isError ? (
            <p className="text-sm leading-6 text-[var(--danger)]">
              Route timeline request failed. Check the preserved query
              parameters or backend state and try again.
            </p>
          ) : tripDetailsQuery.data ? (
            <ol className="grid gap-4">
              {tripDetailsQuery.data.routeStops.map((routeStop) => (
                <li
                  key={routeStop.stationId}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-4"
                >
                  <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_repeat(2,minmax(0,12rem))] lg:items-center">
                    <div
                      className={[
                        'flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold shadow-[var(--shadow-card)]',
                        routeStop.isSelectedFrom || routeStop.isSelectedTo
                          ? 'bg-[var(--primary)] text-white'
                          : routeStop.isWithinSelectedSegment
                            ? 'bg-[rgba(15,118,110,0.12)] text-[var(--text)]'
                            : 'bg-[var(--surface)] text-[var(--text)]',
                      ].join(' ')}
                    >
                      {routeStop.stopOrder}
                    </div>

                    <div className="flex flex-col gap-1">
                      <p
                        className={[
                          'text-base font-semibold',
                          routeStop.isSelectedFrom || routeStop.isSelectedTo
                            ? 'text-[var(--primary)]'
                            : 'text-[var(--text)]',
                        ].join(' ')}
                      >
                        {formatStationLabel({
                          code: routeStop.stationCode,
                          name: routeStop.stationName,
                        })}
                      </p>
                      <p className="text-sm text-[var(--muted)]">
                        {routeStop.isSelectedFrom
                          ? 'Selected departure station'
                          : routeStop.isSelectedTo
                            ? 'Selected arrival station'
                            : routeStop.isDepartureLegSelected
                              ? 'Inside selected travel segment'
                              : `Route stop #${routeStop.stopOrder}`}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Arrival
                      </p>
                      <p className="text-sm font-semibold text-[var(--text)]">
                        {routeStop.arrivalTime
                          ? formatTripTime(routeStop.arrivalTime)
                          : 'Start of route'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Departure
                      </p>
                      <p className="text-sm font-semibold text-[var(--text)]">
                        {routeStop.departureTime
                          ? formatTripTime(routeStop.departureTime)
                          : 'End of route'}
                      </p>
                    </div>
                  </div>
                  {routeStop.isDepartureLegSelected ? (
                    <div className="mt-4 h-1.5 rounded-full bg-[rgba(15,118,110,0.18)]">
                      <div className="h-full w-full rounded-full bg-[var(--primary)]" />
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="eyebrow mb-0">Segment summary</p>
            <h2 className="text-2xl leading-tight text-[var(--text)]">
              Pricing and availability context
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-[var(--muted)]">
              This summary keeps the selected segment and requested seat count
              visible before the next step loads exact seat availability.
            </p>
          </div>

          {!hasRequiredSegmentParams ? (
            <p className="text-sm leading-6 text-[var(--danger)]">
              Missing required route context, so the segment summary cannot be
              computed.
            </p>
          ) : tripDetailsQuery.isLoading ? (
            <p className="text-sm leading-6 text-[var(--muted)]">
              Loading selected-segment pricing details...
            </p>
          ) : tripDetailsQuery.isError ? (
            <p className="text-sm leading-6 text-[var(--danger)]">
              Segment summary request failed. Check the preserved query
              parameters or backend state and try again.
            </p>
          ) : tripDetailsQuery.data ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Pricing
                </p>
                <div className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
                  <p>
                    Segment:{' '}
                    <span className="font-semibold text-[var(--text)]">
                      {formatStationLabel({
                        code: tripDetailsQuery.data.selectedSegment.fromStationCode,
                        name: tripDetailsQuery.data.selectedSegment.fromStationName,
                      })}{' '}
                      to{' '}
                      {formatStationLabel({
                        code: tripDetailsQuery.data.selectedSegment.toStationCode,
                        name: tripDetailsQuery.data.selectedSegment.toStationName,
                      })}
                    </span>
                  </p>
                  <p>
                    Segment count:{' '}
                    <span className="font-semibold text-[var(--text)]">
                      {tripDetailsQuery.data.selectedSegment.segmentCount}
                    </span>
                  </p>
                  <p>
                    Price per seat:{' '}
                    <span className="font-semibold text-[var(--text)]">
                      {formatPrice(
                        tripDetailsQuery.data.selectedSegment.pricePerSeat,
                      )}
                    </span>
                  </p>
                  <p>
                    Estimated total:{' '}
                    <span className="font-semibold text-[var(--text)]">
                      {requestedSeatCount === null
                        ? 'Missing seat count'
                        : formatPrice(
                            tripDetailsQuery.data.selectedSegment.pricePerSeat *
                              requestedSeatCount,
                          )}
                    </span>
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Availability
                </p>
                <div className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
                  <p>
                    Requested seats:{' '}
                    <span className="font-semibold text-[var(--text)]">
                      {requestedSeatCount ?? 'missing'}
                    </span>
                  </p>
                  <p>
                    Segment departure:{' '}
                    <span className="font-semibold text-[var(--text)]">
                      {formatTripTime(
                        tripDetailsQuery.data.selectedSegment.departureTime,
                      )}
                    </span>
                  </p>
                  <p>
                    Segment arrival:{' '}
                    <span className="font-semibold text-[var(--text)]">
                      {formatTripTime(
                        tripDetailsQuery.data.selectedSegment.arrivalTime,
                      )}
                    </span>
                  </p>
                  <p>
                    Next step:{' '}
                    <span className="font-semibold text-[var(--text)]">
                      load exact seat availability for this segment
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="eyebrow mb-0">Seat availability</p>
            <h2 className="text-2xl leading-tight text-[var(--text)]">
              Available seats for this segment
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-[var(--muted)]">
              This step loads the dedicated seats endpoint for the preserved
              segment. The next task will turn this data into the actual seat
              selection UI.
            </p>
          </div>

          {!hasRequiredSegmentParams ? (
            <p className="text-sm leading-6 text-[var(--danger)]">
              Missing required route context, so seat availability cannot be
              loaded.
            </p>
          ) : tripSeatsQuery.isLoading ? (
            <p className="text-sm leading-6 text-[var(--muted)]">
              Loading available seats for this segment...
            </p>
          ) : tripSeatsQuery.isError ? (
            <p className="text-sm leading-6 text-[var(--danger)]">
              Seat availability request failed. Check the preserved query
              parameters or backend state and try again.
            </p>
          ) : tripSeatsQuery.data ? (
            <div className="grid gap-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Seat pool
                  </p>
                  <div className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
                    <p>
                      Available seats:{' '}
                      <span className="font-semibold text-[var(--text)]">
                        {tripSeatsQuery.data.length}
                      </span>
                    </p>
                    <p>
                      Requested seats:{' '}
                      <span className="font-semibold text-[var(--text)]">
                        {requestedSeatCount ?? 'missing'}
                      </span>
                    </p>
                    <p>
                      Can satisfy request:{' '}
                      <span className="font-semibold text-[var(--text)]">
                        {requestedSeatCount === null
                          ? 'unknown'
                          : tripSeatsQuery.data.length >= requestedSeatCount
                            ? 'yes'
                            : 'no'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Selection note
                  </p>
                  <div className="mt-4 grid gap-2 text-sm text-[var(--muted)]">
                    <p>
                      The seats below are all currently available for the
                      selected segment.
                    </p>
                    <p>
                      Next step:{' '}
                      <span className="font-semibold text-[var(--text)]">
                        selection cap is now enforced; next we add total
                        confirmation before purchase
                      </span>
                    </p>
                    <p>
                      Current selection:{' '}
                      <span className="font-semibold text-[var(--text)]">
                        {selectedSeatIds.length}
                      </span>
                    </p>
                    <p>
                      Limit status:{' '}
                      <span className="font-semibold text-[var(--text)]">
                        {requestedSeatCount === null
                          ? 'unknown'
                          : hasReachedSeatSelectionLimit
                            ? 'selection cap reached'
                            : 'more seats can still be selected'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Seat list
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {tripSeatsQuery.data.map((seat) => (
                    (() => {
                      const isSelected = selectedSeatIds.includes(seat.seatId)
                      const isDisabled = !isSelected && hasReachedSeatSelectionLimit

                      return (
                        <button
                          type="button"
                          key={seat.seatId}
                          onClick={() => toggleSeatSelection(seat.seatId)}
                          disabled={isDisabled}
                          className={[
                            'rounded-2xl border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-60',
                            isSelected
                              ? 'border-[var(--primary)] bg-[rgba(15,118,110,0.12)]'
                              : 'border-[var(--border)] bg-[var(--surface-alt)] hover:border-[var(--primary)]',
                          ].join(' ')}
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Car {seat.carNumber}
                          </p>
                          <p className="mt-2 text-lg font-semibold text-[var(--text)]">
                        Seat {seat.seatNumber}
                          </p>
                          <p className="mt-1 text-sm text-[var(--muted)]">
                        Label {seat.label}
                          </p>
                          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                            {isSelected
                              ? 'Selected'
                              : isDisabled
                                ? 'Unavailable to select now'
                                : 'Available'}
                          </p>
                        </button>
                      )
                    })()
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Selected seats
                  </p>
                  <div className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
                    <p>
                      Selected labels:{' '}
                      <span className="font-semibold text-[var(--text)]">
                        {selectedSeats.map((seat) => seat.label).join(', ') || 'none'}
                      </span>
                    </p>
                    <p>
                      Selection status:{' '}
                      <span className="font-semibold text-[var(--text)]">
                        {hasExactSeatCountSelection
                          ? 'requested count reached'
                          : 'selection still in progress'}
                      </span>
                    </p>
                    <p>
                      Current selected total:{' '}
                      <span className="font-semibold text-[var(--text)]">
                        {formatPrice(selectedSeatTotal)}
                      </span>
                    </p>
                    <p>
                      Expected total for requested count:{' '}
                      <span className="font-semibold text-[var(--text)]">
                        {requestedSeatTotal === null
                          ? 'missing'
                          : formatPrice(requestedSeatTotal)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
