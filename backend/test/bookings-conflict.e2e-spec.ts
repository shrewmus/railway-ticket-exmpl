import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp } from './helpers/e2e-app';
import { loadStations, findTrip } from './helpers/seed-data';

describe('POST /bookings — conflict and validation scenarios (e2e)', () => {
  let app: INestApplication;
  let stations: Awaited<ReturnType<typeof loadStations>>;

  beforeAll(async () => {
    app = await createE2eApp();
    stations = await loadStations(app);
  });

  afterAll(async () => {
    await app.close();
  });

  async function getAvailableSeats(params: {
    tripId: string;
    from: string;
    to: string;
  }) {
    const response = await request(app.getHttpServer())
      .get(`/trips/${params.tripId}/seats`)
      .query({
        fromStationId: stations.get(params.from)!.id,
        toStationId: stations.get(params.to)!.id,
      })
      .expect(200);

    return response.body;
  }

  function postBooking(params: {
    tripId: string;
    from: string;
    to: string;
    seatIds: string[];
    customerName?: string;
    documentNumber?: string;
  }) {
    return request(app.getHttpServer())
      .post('/bookings')
      .send({
        tripId: params.tripId,
        fromStationId: stations.get(params.from)!.id,
        toStationId: stations.get(params.to)!.id,
        seatIds: params.seatIds,
        customerName: params.customerName ?? 'Test User',
        documentNumber: params.documentNumber ?? 'DOC-TEST',
      });
  }

  it('creates a booking successfully for a segment with available seats', async () => {
    // Use trip 3 (REG-202, R2, 2026-05-10) which has no seed bookings
    const trips = await findTrip(app, {
      fromStationId: stations.get('GEBU')!.id,
      toStationId: stations.get('WRUT')!.id,
      serviceDate: '2026-05-10',
    });

    // Find the REG-202 trip
    const regTrip = trips.find((t: any) => t.trainNumber === 'REG-202');
    expect(regTrip).toBeDefined();

    const seats = await getAvailableSeats({
      tripId: regTrip.tripId,
      from: 'GEBU',
      to: 'WRUT',
    });

    const response = await postBooking({
      tripId: regTrip.tripId,
      from: 'GEBU',
      to: 'WRUT',
      seatIds: [seats[0].seatId],
      customerName: 'Eve Test',
      documentNumber: 'DOC-E2E-001',
    }).expect(201);

    expect(response.body).toHaveProperty('bookingId');
    expect(response.body.tripId).toBe(regTrip.tripId);
    expect(response.body.seatCount).toBe(1);
    expect(response.body.totalPrice).toBe('15.00');
    expect(response.body.seatIds).toHaveLength(1);
  });

  it('creates a multi-seat booking', async () => {
    // Use trip 3 (REG-202, R2, 2026-05-10) — different segment
    const trips = await findTrip(app, {
      fromStationId: stations.get('GEBU')!.id,
      toStationId: stations.get('BECI')!.id,
      serviceDate: '2026-05-10',
    });

    const regTrip = trips.find((t: any) => t.trainNumber === 'REG-202');
    const seats = await getAvailableSeats({
      tripId: regTrip.tripId,
      from: 'GEBU',
      to: 'BECI',
    });

    // Pick 2 available seats
    const seatIds = seats.slice(0, 2).map((s: any) => s.seatId);

    const response = await postBooking({
      tripId: regTrip.tripId,
      from: 'GEBU',
      to: 'BECI',
      seatIds,
      customerName: 'Multi Test',
      documentNumber: 'DOC-E2E-002',
    }).expect(201);

    expect(response.body.seatCount).toBe(2);
    expect(response.body.totalPrice).toBe('60.00');
    expect(response.body.seatIds).toHaveLength(2);
  });

  it('returns 409 when booking an already-taken seat for an overlapping segment', async () => {
    // Trip 1 (IC-101, R1, 2026-05-10) seed booking:
    //   Car1/Seat1 booked NUNN->GEBU (stop 1->2)
    //
    // Try to book Car1/Seat1 for NUNN->SLON (stop 1->3) — overlaps
    // First, get the seat ID for Car1/Seat1 from a segment where it IS available
    const trips = await findTrip(app, {
      fromStationId: stations.get('GEBU')!.id,
      toStationId: stations.get('SLON')!.id,
      serviceDate: '2026-05-10',
    });

    const tripId = trips[0].tripId;
    const gebuSlonSeats = await getAvailableSeats({
      tripId,
      from: 'GEBU',
      to: 'SLON',
    });

    // Car1/Seat1 is available for GEBU->SLON (doesn't overlap with NUNN->GEBU booking)
    const car1Seat1 = gebuSlonSeats.find((s: any) => s.label === '1/1');
    expect(car1Seat1).toBeDefined();

    // Now try to book Car1/Seat1 for NUNN->SLON — should conflict with NUNN->GEBU booking
    const response = await postBooking({
      tripId,
      from: 'NUNN',
      to: 'SLON',
      seatIds: [car1Seat1.seatId],
      customerName: 'Conflict Tester',
      documentNumber: 'DOC-E2E-003',
    }).expect(409);

    expect(response.body).toHaveProperty('conflictingSeatIds');
    expect(response.body.conflictingSeatIds).toContain(car1Seat1.seatId);
  });

  it('allows booking a seat for a non-overlapping segment after it was booked', async () => {
    // Trip 1: Car1/Seat1 is booked NUNN->GEBU (stop 1->2) in seed data
    // Booking it for SLON->PENN (stop 3->5) should work — no overlap
    const trips = await findTrip(app, {
      fromStationId: stations.get('SLON')!.id,
      toStationId: stations.get('PENN')!.id,
      serviceDate: '2026-05-10',
    });

    const tripId = trips[0].tripId;
    const seats = await getAvailableSeats({
      tripId,
      from: 'SLON',
      to: 'PENN',
    });

    const car1Seat1 = seats.find((s: any) => s.label === '1/1');
    expect(car1Seat1).toBeDefined();

    const response = await postBooking({
      tripId,
      from: 'SLON',
      to: 'PENN',
      seatIds: [car1Seat1.seatId],
      customerName: 'Non-overlap User',
      documentNumber: 'DOC-E2E-004',
    }).expect(201);

    expect(response.body.seatCount).toBe(1);
    expect(response.body.totalPrice).toBe('40.00');
  });

  it('returns 400 when seatIds is empty', async () => {
    const trips = await findTrip(app, {
      fromStationId: stations.get('GEBU')!.id,
      toStationId: stations.get('BECI')!.id,
      serviceDate: '2026-05-10',
    });

    const tripId = trips[0].tripId;

    await postBooking({
      tripId,
      from: 'GEBU',
      to: 'BECI',
      seatIds: [],
    }).expect(400);
  });

  it('returns 400 when customerName is too short', async () => {
    const trips = await findTrip(app, {
      fromStationId: stations.get('GEBU')!.id,
      toStationId: stations.get('BECI')!.id,
      serviceDate: '2026-05-10',
    });

    const tripId = trips[0].tripId;
    const seats = await getAvailableSeats({
      tripId,
      from: 'GEBU',
      to: 'BECI',
    });

    await postBooking({
      tripId,
      from: 'GEBU',
      to: 'BECI',
      seatIds: [seats[0].seatId],
      customerName: 'A',
      documentNumber: 'DOC-E2E-005',
    }).expect(400);
  });

  it('returns 400 when documentNumber is too short', async () => {
    const trips = await findTrip(app, {
      fromStationId: stations.get('GEBU')!.id,
      toStationId: stations.get('BECI')!.id,
      serviceDate: '2026-05-10',
    });

    const tripId = trips[0].tripId;
    const seats = await getAvailableSeats({
      tripId,
      from: 'GEBU',
      to: 'BECI',
    });

    await postBooking({
      tripId,
      from: 'GEBU',
      to: 'BECI',
      seatIds: [seats[0].seatId],
      customerName: 'Valid Name',
      documentNumber: 'AB',
    }).expect(400);
  });

  it('returns 400 when required fields are missing', async () => {
    await request(app.getHttpServer())
      .post('/bookings')
      .send({})
      .expect(400);
  });

  it('returns 400 when extra unknown fields are sent', async () => {
    await request(app.getHttpServer())
      .post('/bookings')
      .send({
        tripId: '00000000-0000-0000-0000-000000000000',
        fromStationId: '00000000-0000-0000-0000-000000000000',
        toStationId: '00000000-0000-0000-0000-000000000000',
        seatIds: ['00000000-0000-0000-0000-000000000000'],
        customerName: 'Test',
        documentNumber: 'DOC',
        extraField: 'should be rejected',
      })
      .expect(400);
  });

  it('returns 400 when more than 5 seats are requested', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    await request(app.getHttpServer())
      .post('/bookings')
      .send({
        tripId: fakeId,
        fromStationId: fakeId,
        toStationId: fakeId,
        seatIds: [fakeId, fakeId, fakeId, fakeId, fakeId, fakeId],
        customerName: 'Test',
        documentNumber: 'DOC',
      })
      .expect(400);
  });
});
