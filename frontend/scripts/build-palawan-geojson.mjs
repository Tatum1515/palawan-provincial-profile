/* global Buffer, console */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(__dirname, "..");
const sourcePath = resolve(frontendRoot, "data-source/philippines-municipalities.geojson");
const outputPath = resolve(frontendRoot, "public/data/palawan-municipalities.geojson");
const KEEP_PROPERTIES = ["ADM3_EN", "ADM3_PCODE", "psgc_code", "AREA_SQKM"];
const COORDINATE_PRECISION = 4;

function roundCoordinate(value) {
  return Number(Number(value).toFixed(COORDINATE_PRECISION));
}

function simplifyCoordinates(coordinates) {
  if (!Array.isArray(coordinates)) return coordinates;
  if (typeof coordinates[0] === "number") {
    return coordinates.map(roundCoordinate);
  }
  return coordinates.map(simplifyCoordinates);
}

function simplifyGeometry(geometry) {
  if (!geometry) return null;
  return {
    type: geometry.type,
    ...(geometry.coordinates
      ? { coordinates: simplifyCoordinates(geometry.coordinates) }
      : {}),
    ...(geometry.geometries
      ? { geometries: geometry.geometries.map(simplifyGeometry) }
      : {}),
  };
}

function isPuertoPrincesa(feature) {
  const properties = feature?.properties ?? {};
  const values = [properties.ADM3_EN, properties.ADM2_EN, properties.psgc_name]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return values.some((value) => value.includes("puerto princesa"));
}

function isPalawanFeature(feature) {
  return feature?.properties?.ADM2_EN === "Palawan" || isPuertoPrincesa(feature);
}

const source = JSON.parse(await readFile(sourcePath, "utf8"));
const selected = (source.features ?? []).filter(isPalawanFeature);

if (selected.length !== 23 && selected.length !== 24) {
  throw new Error(
    `Expected 23 Palawan municipalities, or 24 if Puerto Princesa City is present; found ${selected.length}.`
  );
}

const puertoPrincesaPresent = selected.some(isPuertoPrincesa);
const output = {
  type: "FeatureCollection",
  features: selected.map((feature) => ({
    type: "Feature",
    properties: Object.fromEntries(
      KEEP_PROPERTIES.map((key) => [key, feature?.properties?.[key] ?? null])
    ),
    geometry: simplifyGeometry(feature.geometry),
  })),
};

await writeFile(outputPath, JSON.stringify(output));

const bytes = Buffer.byteLength(JSON.stringify(output));
console.log(`Wrote ${output.features.length} features to ${outputPath}`);
console.log(`Puerto Princesa City: ${puertoPrincesaPresent ? "included" : "not present in source GeoJSON"}`);
console.log(`Output size: ${(bytes / 1024).toFixed(1)} KB`);
