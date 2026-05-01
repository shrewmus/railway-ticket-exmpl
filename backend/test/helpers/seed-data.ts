/**
 * Helper to look up seed data entity IDs by their business identifiers.
 * The e2e tests depend on the seed dataset, so we query the API to resolve
 * UUIDs rather than hardcoding them.
 */

import request from 'supertest';

type StationLookup = Map<string, { id: string; code: string; name: string }>;

export async function loadStations(app: any): Promise<StationLookup> {
  const response = await request(app.getHttpServer())
    .get('/stations')
    .expect(200);

  const map = new Map<string, { id: string; code: string; name: string }>();
  for (const station of response.body) {
    map.set(station.code, station);
  }
  return map;
}

export async function findTrip(
  app: any,
  params: {
    fromStationId: string;
    toStationId: string;
    serviceDate: string;
    seatCount?: number;
  },
) {
  const query: Record<string, string | number> = {
    fromStationId: params.fromStationId,
    toStationId: params.toStationId,
    serviceDate: params.serviceDate,
  };

  if (params.seatCount !== undefined) {
    query.seatCount = params.seatCount;
  }

  const response = await request(app.getHttpServer())
    .get('/trips/search')
    .query(query)
    .expect(200);

  return response.body;
}