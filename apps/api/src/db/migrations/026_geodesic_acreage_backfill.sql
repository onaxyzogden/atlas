-- Migration 026 — geodesic acreage backfill
--
-- The boundary endpoint, template instantiation, and the builtin seed all
-- previously computed acreage as ST_Area(ST_Transform(geom, 26917)) / 4046.86.
-- EPSG:26917 (UTM Zone 17N) was hardcoded for every project regardless of
-- location, so any site outside SW Ontario carried a projection-distorted
-- area. The code paths now use the location-independent WGS84 spheroid
-- (ST_Area(geom::geography)), matching the in-app OLOS measure-area tool's
-- geodesic turf.area. Re-derive every stored acreage from its persisted
-- boundary so existing rows agree with the new formula.

UPDATE projects
SET acreage = ST_Area(parcel_boundary::geography) / 4046.86
WHERE parcel_boundary IS NOT NULL;
