import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp } from './helpers/e2e-app';
import { loadStations, findTrip } from './helpers/seed-data';

describe('Seat availability — GET /trips/:tripId/seats (e2e)', () => {
  let app: INestApplication;
  let stations: Awaited<ReturnType<typeof loadStations>>;

  beforeAll(async () => {
    app = await createE2eApp();
    stations = await loadStations(app);
  });

  afterAll(async () => {
    await app.close();
  });

  function getSeats(params: { tripId: string; from: string; to: string }) {
    return request(app.getHttpServer())
      .get(`/trips/${params.tripId}/seats`)
      .query({
        fromStationId: stations.get(params.from)!.id,
        toStationId: stations.get(params.to)!.id,
      });
  }

  it('returns all 16 seats for a trip with no bookings', async () => {
    // Trip 2 (IC-101, R1, 2026-05-11) has no bookings in seed data
    const trips = await findTrip(app, {
      fromStationId: stations.get('NUNN')!.id,
      toStationId: stations.get('PENN')!.id,
      serviceDate: '2026-05-11',
    });

    expect(trips).toHaveLength(1);
    const tripId = trips[0].tripId;

    const response = await getSeats({
      tripId,
      from: 'NUNN',
      to: 'PENN',
    }).expect(200);

    expect(response.body.length).toBeGreaterThanOrEqual(16);
  });

  it('excludes seats booked for an overlapping segment', async () => {
    // Trip 1 (IC-101, R1, 2026-05-10) seed bookings:
    //   Car1/Seat1 booked NUNN->GEBU (stop 1->2)
    //   Car1/Seat3 booked NUNN->SLON (stop 1->3)
    //   Car1/Seat2 booked GEBU->WRUT (stop 2->4)
    //   Car2/Seat1, Car2/Seat2 booked SLON->PENN (stop 3->5)
    //
    // Search NUNN->SLON (stop 1->3) — overlaps:
    //   Car1/Seat1 (1->2 overlaps 1->3)
    //   Car1/Seat2 (2->4 overlaps 1->3)
    //   Car1/Seat3 (1->3 overlaps 1->3)
    const trips = await findTrip(app, {
      fromStationId: stations.get('NUNN')!.id,
      toStationId: stations.get('SLON')!.id,
      serviceDate: '2026-05-10',
    });

    expect(trips).toHaveLength(1);
    const tripId = trips[0].tripId;

    const response = await getSeats({
      tripId,
      from: 'NUNN',
      to: 'SLON',
    }).expect(200);

    const seatLabels = response.body.map((s: any) => s.label);
    expect(seatLabels).not.toContain('1/1');
    expect(seatLabels).not.toContain('1/2');
    expect(seatLabels).not.toContain('1/3');
  });

  it('allows seats for non-overlapping segments on the same trip', async () => {
    // Trip 1: Car1/Seat1 is booked NUNN->GEBU (stop 1->2)
    // Search for seats GEBU->SLON (stop 2->3) — does NOT overlap with stop 1->2
    const trips = await findTrip(app, {
      fromStationId: stations.get('GEBU')!.id,
      toStationId: stations.get('SLON')!.id,
      serviceDate: '2026-05-10',
    });

    expect(trips).toHaveLength(1);
    const tripId = trips[0].tripId;

    const response = await getSeats({
      tripId,
      from: 'GEBU',
      to: 'SLON',
    }).expect(200);

    const seatLabels = response.body.map((s: any) => s.label);
    // Car1/Seat1 should be available because NUNN->GEBU does not overlap GEBU->SLON
    expect(seatLabels).toContain('1/1');
  });

  it('excludes seats booked for a fully enclosing segment', async () => {
    // Trip 1: Car1/Seat3 is booked NUNN->SLON (stop 1->3)
    // Search for seats GEBU->SLON (stop 2->3) — stop 1->3 overlaps stop 2->3
    const trips = await findTrip(app, {
      fromStationId: stations.get('GEBU')!.id,
      toStationId: stations.get('SLON')!.id,
      serviceDate: '2026-05-10',
    });

    const tripId = trips[0].tripId;

    const response = await getSeats({
      tripId,
      from: 'GEBU',
      to: 'SLON',
    }).expect(200);

    const seatLabels = response.body.map((s: any) => s.label);
    expect(seatLabels).not.toContain('1/3');
  });

  it('returns correct seat structure with id, carNumber, seatNumber, and label', async () => {
    const trips = await findTrip(app, {
      fromStationId: stations.get('NUNN')!.id,
      toStationId: stations.get('PENN')!.id,
      serviceDate: '2026-05-11',
    });

    const tripId = trips[0].tripId;

    const response = await getSeats({
      tripId,
      from: 'NUNN',
      to: 'PENN',
    }).expect(200);

    const seat = response.body[0];
    expect(seat).toHaveProperty('seatId');
    expect(seat).toHaveProperty('carNumber');
    expect(seat).toHaveProperty('seatNumber');
    expect(seat).toHaveProperty('label');
    expect(typeof seat.seatId).toBe('string');
    expect(typeof seat.carNumber).toBe('number');
    expect(typeof seat.label).toBe('string');
  });

  it('returns 400 when segment query params are missing', async () => {
    const trips = await findTrip(app, {
      fromStationId: stations.get('NUNN')!.id,
      toStationId: stations.get('PENN')!.id,
      serviceDate: '2026-05-11',
    });

    const tripId = trips[0].tripId;

    await request(app.getHttpServer())
      .get(`/trips/${tripId}/seats`)
      .expect(400);
  });
});