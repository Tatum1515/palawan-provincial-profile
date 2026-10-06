import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  GeoJSON,
  LayerGroup,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { provincialProfile } from "../data/provincialProfile";
import { Info, RotateCcw } from "lucide-react";
import { formatNumber, formatPercent, toNumber } from "../utils/numbers";
import { findMunicipalityInLocation, MUNICIPALITY_ALIASES, municipalityNamesMatch, normalizeMunicipalityName } from "../utils/municipalityMatcher.js";
import AccessibleLeafletControls from "./AccessibleLeafletControls.jsx";
import usePrefersReducedMotion from "../hooks/usePrefersReducedMotion.js";

const GEOJSON_URL = "/data/palawan-municipalities.geojson";
const PUERTO_PRINCESA_GEOJSON_URL = "/data/puerto-princesa.geojson";

const INDICATORS = {
  population: {
    label: "Population",
    type: "number",
  },
  romanCatholic: {
    label: "Roman Catholic",
    type: "percent",
  },
  islam: {
    label: "Islam",
    type: "percent",
  },
  inc: {
    label: "Iglesia ni Cristo",
    type: "percent",
  },
  noReligion: {
    label: "No Religion",
    type: "percent",
  },
};

function getMapName(feature) {
  return (
    feature?.properties?.ADM3_EN ||
    feature?.properties?.NAME_3 ||
    feature?.properties?.name ||
    feature?.properties?.NAME ||
    ""
  );
}

function getProfileName(mapName) {
  return MUNICIPALITY_ALIASES[mapName] || mapName;
}

function findRow(collection, name) {
  if (!collection) return null;

  const target = normalizeMunicipalityName(getProfileName(name));

  if (Array.isArray(collection)) {
    return (
      collection.find((row) => {
        const rowName =
          row?.municipality ||
          row?.name ||
          row?.cityMunicipality ||
          row?.city_municipality ||
          "";

        return normalizeMunicipalityName(rowName) === target;
      }) || null
    );
  }

  if (typeof collection === "object") {
    const key = Object.keys(collection).find(
      (item) => normalizeMunicipalityName(item) === target
    );

    return key ? collection[key] : null;
  }

  return null;
}

function findNumber(row, keys) {
  if (!row || typeof row !== "object") return null;

  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      return toNumber(row[key]);
    }
  }

  return null;
}

function getPopulation(name) {
  const source = provincialProfile?.population;

  if (!source) return null;

  const collections = [
    source?.municipalities,
    source?.byMunicipality,
    source?.data,
    source,
  ];

  for (const collection of collections) {
    const row = findRow(collection, name);

    if (row === null) continue;

    if (typeof row === "object") {
      const value = findNumber(row, [
        "population",
        "totalPopulation",
        "total_population",
        "value",
      ]);
      if (value !== null) return value;
    } else {
      const value = toNumber(row);
      if (value !== null) return value;
    }
  }

  const religiousRow = findRow(
    provincialProfile?.religiousAffiliation?.municipalities,
    name,
  );
  return religiousRow ? toNumber(religiousRow.totalPopulation) : null;
}

function getReligionValue(name, indicator) {
  const row = findRow(
    provincialProfile?.religiousAffiliation?.municipalities,
    name
  );

  if (!row || typeof row !== "object") {
    return null;
  }

  const fields = {
    romanCatholic: [
      "romanCatholic",
      "roman_catholic",
      "Roman Catholic",
      "Roman_Catholic",
    ],
    islam: ["islam", "Islam"],
    inc: [
      "inc",
      "INC",
      "iglesiaNiCristo",
      "iglesia_ni_cristo",
      "Iglesia ni Cristo",
    ],
    noReligion: [
      "noReligion",
      "no_religion",
      "No Religion",
    ],
  };

  return findNumber(row, fields[indicator] || []);
}

function getIndicatorValue(name, indicator) {
  return indicator === "population"
    ? getPopulation(name)
    : getReligionValue(name, indicator);
}


const LOCATION_NAMES = [
  'Aborlan', 'Agutaya', 'Araceli', 'Balabac', 'Bataraza', "Brooke's Point", 'Busuanga',
  'Cagayancillo', 'Coron', 'Culion', 'Cuyo', 'Dumaran', 'El Nido', 'Kalayaan',
  'Linapacan', 'Magsaysay', 'Narra', 'Quezon', 'Rizal', 'Roxas', 'San Vicente',
  'Sofronio Española', 'Taytay', 'Puerto Princesa City',
]

function getLocationMunicipality(location = '') {
  return findMunicipalityInLocation(location, LOCATION_NAMES)
}

function buildEducationMapPoints(profile) {
  const higherEducation = profile?.higherEducation || {}
  const tvet = profile?.tvet || {}
  const campuses = [
    ...(higherEducation.palawanStateUniversityCampuses || []).map((item) => ({ ...item, category: 'Higher education campus', source: 'Palawan State University' })),
    ...(higherEducation.westernPhilippinesUniversityCampuses || []).map((item) => ({ ...item, category: 'Higher education campus', source: 'Western Philippines University' })),
  ]
  const providers = (tvet.listedProviders || []).map((item) => ({ ...item, category: 'TVET provider', source: 'TESDA' }))
  return [...campuses, ...providers].map((item, index) => ({
    id: `${item.category}-${item.name}-${index}`,
    ...item,
    municipality: getLocationMunicipality(item.location),
    exactCoordinates: Array.isArray(item.coordinates) && item.coordinates.length === 2,
  }))
}

function getColor(value, min, max) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
    return "#e2e8f0";
  }

  if (max === min) {
    return "#15803d";
  }

  const ratio = (value - min) / (max - min);

  if (ratio >= 0.85) return "#14532d";
  if (ratio >= 0.7) return "#166534";
  if (ratio >= 0.55) return "#15803d";
  if (ratio >= 0.4) return "#16a34a";
  if (ratio >= 0.25) return "#4ade80";

  return "#bbf7d0";
}

function formatValue(value, indicator) {
  if (value === null || value === undefined) {
    return "—";
  }

  return INDICATORS[indicator].type === "percent"
    ? formatPercent(value)
    : formatNumber(value);
}

function FitBounds({ geojson }) {
  const map = useMap();

  useEffect(() => {
    if (!geojson?.features?.length) return;

    const bounds = L.geoJSON(geojson).getBounds();

    if (!bounds.isValid()) return;

    map.fitBounds(bounds, {
      padding: [25, 25],
      maxZoom: 8,
      animate: false,
    });
  }, [geojson, map]);

  return null;
}

function MapViewportReset({ geojson, prefersReducedMotion }) {
  const map = useMap();

  const reset = () => {
    if (!geojson?.features?.length) return;
    const bounds = L.geoJSON(geojson).getBounds();
    if (!bounds.isValid()) return;

    map.fitBounds(bounds, {
      padding: [28, 28],
      maxZoom: 8,
      animate: !prefersReducedMotion,
    });
  };

  return (
    <button
      type="button"
      className="palawan-map-reset-control"
      onClick={reset}
      aria-label="Reset map view"
      title="Reset map view"
    >
      <RotateCcw size={15} aria-hidden="true" />
      <span>Reset view</span>
    </button>
  );
}

function Legend({ indicator, min, max }) {
  const formatter =
    INDICATORS[indicator].type === "percent"
      ? formatPercent
      : formatNumber;

  const colors = [
    "#bbf7d0",
    "#4ade80",
    "#16a34a",
    "#15803d",
    "#166534",
    "#14532d",
  ];

  return (
    <div className="palawan-map-legend">
      <div className="palawan-map-legend-card">
        <p className="palawan-map-legend-title">
          {INDICATORS[indicator].label}
        </p>

        <div className="palawan-map-legend-scale">
          {colors.map((color) => (
            <span
              key={color}
              className="palawan-map-legend-swatch"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <div className="palawan-map-legend-values">
          <span>{formatter(min)}</span>
          <span>{formatter(max)}</span>
        </div>

        <div className="palawan-map-legend-missing">
          <span className="palawan-map-legend-missing-swatch" aria-hidden="true" />
          <span>Not reported</span>
        </div>
      </div>
    </div>
  );
}

export default function PalawanMap({ onSelectMunicipality }) {
  const [geojson, setGeojson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [indicator, setIndicator] = useState("population");
  const [selected, setSelected] = useState(null);
  const [showEducationPins, setShowEducationPins] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    let cancelled = false;

    async function loadMapData() {
      const loadJson = async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Unable to load map data (${response.status}).`);
        return response.json();
      };

      try {
        setLoading(true);
        setError("");

        const data = await loadJson(GEOJSON_URL);
        const sourceFeatures = Array.isArray(data?.features) ? data.features : [];
        const hasProvinceField = sourceFeatures.some(
          (feature) => feature?.properties?.ADM2_EN,
        );
        const features = hasProvinceField
          ? sourceFeatures.filter((feature) => feature?.properties?.ADM2_EN === "Palawan")
          : sourceFeatures;

        if (!features.length) {
          throw new Error("No Palawan municipality boundaries were found. Check public/data/palawan-municipalities.geojson.");
        }

        try {
          const puertoData = await loadJson(PUERTO_PRINCESA_GEOJSON_URL);
          const puertoFeatures = Array.isArray(puertoData?.features) ? puertoData.features : [];
          features.push(...puertoFeatures);
        } catch {
          // Puerto Princesa boundary is optional. The existing town-center behavior remains available.
        }

        if (!cancelled) {
          setGeojson({ type: "FeatureCollection", features });
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Unable to load the Palawan map.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMapData();

    return () => {
      cancelled = true;
    };
  }, []);

  const educationPoints = useMemo(() => buildEducationMapPoints(provincialProfile), []);

  const stats = useMemo(() => {
    const features = geojson?.features || [];

    const values = features
      .map((feature) =>
        getIndicatorValue(
          getMapName(feature),
          indicator
        )
      )
      .filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          !Number.isNaN(value)
      );

    return {
      count: features.length,
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0,
    };
  }, [geojson, indicator]);

  function featureStyle(feature) {
    const mapName = getMapName(feature);
    const value = getIndicatorValue(
      mapName,
      indicator
    );

    const isSelected =
      selected?.mapName === mapName;

    return {
      fillColor: getColor(
        value,
        stats.min,
        stats.max
      ),
      weight: isSelected ? 2.5 : 1,
      opacity: 1,
      color: isSelected ? "#14532d" : "#ffffff",
      fillOpacity: isSelected ? 0.94 : 0.82,
      lineJoin: "round",
    };
  }

  function handleFeature(feature, layer) {
    const mapName = getMapName(feature);
    const profileName = getProfileName(mapName);

    layer.bindTooltip(profileName, {
      sticky: true,
      direction: "top",
      className: "palawan-map-tooltip",
    });

    const makePathAccessible = () => {
      if (!layer?._path) return;
      layer._path.setAttribute("tabindex", "0");
      layer._path.setAttribute("role", "button");
      layer._path.setAttribute("aria-label", `View ${profileName} profile`);
      if (layer._path.dataset.keyboardBound === "true") return;
      layer._path.dataset.keyboardBound = "true";
      layer._path.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        layer.fire("click");
      });
    };

    layer.on("add", makePathAccessible);
    makePathAccessible();

    layer.on({
      mouseover: () => {
        layer.setStyle({
          weight: 2.5,
          color: "#14532d",
          fillOpacity: 0.96,
        });

        layer.bringToFront();
      },

      mouseout: () => {
        layer.setStyle(featureStyle(feature));
      },

      click: () => {
        const nextSelected = {
          mapName,
          profileName,
          value: getIndicatorValue(mapName, indicator),
        };

        setSelected(nextSelected);
        onSelectMunicipality?.(profileName);
      },
    });
  }

  const mapPoints = useMemo(() => {
    if (!geojson?.features?.length) return []

    return educationPoints
      .map((point) => {
        const feature = geojson.features.find((item) => municipalityNamesMatch(getMapName(item), point.municipality || ''))
        if (!feature) return null
        const bounds = L.geoJSON(feature).getBounds()
        if (!bounds.isValid()) return null
        const center = bounds.getCenter()
        return { ...point, center: [center.lat, center.lng] }
      })
      .filter(Boolean)
  }, [educationPoints, geojson])

  const unmatchedEducationPoints = educationPoints.filter((point) => !point.municipality).length
  const profileMunicipalities = provincialProfile?.religiousAffiliation?.municipalities || [];
  const unmatchedMunicipalities = profileMunicipalities.filter((row) => {
    return !(geojson?.features || []).some(
      (feature) => municipalityNamesMatch(getProfileName(getMapName(feature)), row.municipality),
    );
  });
  return (
    <section className="palawan-map-shell">
      <div className="palawan-map-header">
        <div className="palawan-map-header-row">
          <div>
            <div className="palawan-map-eyebrow">
              <span className="palawan-map-eyebrow-dot" />

              <span className="palawan-map-eyebrow-text">
                Geographic Data
              </span>
            </div>

            <h2 className="palawan-map-title">
              Explore Palawan
            </h2>

            <p className="palawan-map-description">
              Explore municipality-level indicators
              through an interactive map.
            </p>
          </div>

          <div className="palawan-map-controls">
            <div className="palawan-map-count">
              <span className="palawan-map-count-value">
                {stats.count}
              </span>{" "}
              municipalities
            </div>

            <label className="palawan-map-sr-only" htmlFor="map-indicator">
              Select map indicator
            </label>

            <select
              id="map-indicator"
              value={indicator}
              onChange={(event) => {
                setIndicator(event.target.value);
                setSelected(null);
              }}
              className="palawan-map-select"
            >
              {Object.entries(INDICATORS).map(
                ([key, definition]) => (
                  <option key={key} value={key}>
                    {definition.label}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              onClick={() => setShowEducationPins((current) => !current)}
              aria-pressed={showEducationPins}
              className={`palawan-map-button ${showEducationPins ? 'is-active' : ''}`}
            >
              {showEducationPins ? 'Hide education pins' : 'Show education pins'}
            </button>

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="palawan-map-button"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="palawan-map-body">
        {loading && (
          <div className="palawan-map-status palawan-map-status-loading">
            <div className="palawan-map-status-copy">
              <div className="palawan-map-spinner" />

              <p className="palawan-map-status-title">
                Loading Palawan map
              </p>

              <p className="palawan-map-status-detail">
                Preparing municipality boundaries
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="palawan-map-status palawan-map-status-error">
            <div className="palawan-map-status-copy palawan-map-status-copy-error">
              <div className="palawan-map-error-icon">
                !
              </div>

              <h3 className="palawan-map-status-title">
                Map unavailable
              </h3>

              <p className="palawan-map-status-detail">
                {error}
              </p>
            </div>
          </div>
        )}

        {!loading && !error && geojson && (
          <div className="palawan-map-canvas-wrap">
            <MapContainer
              className="palawan-leaflet-map"
              center={[9.8, 118.7]}
              zoom={7}
              minZoom={6}
              maxZoom={11}
              scrollWheelZoom
              doubleClickZoom
              zoomControl
              dragging
              touchZoom
              boxZoom
              keyboard
              aria-label="Interactive Palawan municipality map"
              zoomAnimation={!prefersReducedMotion}
              fadeAnimation={!prefersReducedMotion}
              markerZoomAnimation={!prefersReducedMotion}
            >
              <AccessibleLeafletControls />
              <MapViewportReset geojson={geojson} prefersReducedMotion={prefersReducedMotion} />
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
                tileSize={256}
              />

              <FitBounds geojson={geojson} />

              <GeoJSON
                key={`${indicator}-${selected?.mapName || "all"}`}
                data={geojson}
                style={featureStyle}
                onEachFeature={handleFeature}
              />

              {showEducationPins && (
                <LayerGroup>
                  {mapPoints.map((point) => (
                    <CircleMarker
                      key={point.id}
                      center={point.center}
                      radius={point.category === 'TVET provider' ? 5 : 7}
                      pathOptions={{
                        color: point.category === 'TVET provider' ? '#7c3aed' : '#0f766e',
                        fillColor: point.category === 'TVET provider' ? '#8b5cf6' : '#14b8a6',
                        fillOpacity: 0.9,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="palawan-map-popup">
                          <p className="palawan-map-popup-label">{point.category}</p>
                          <p className="palawan-map-popup-name">{point.name}</p>
                          <p className="palawan-map-status-detail">{point.location}</p>
                          <p className="palawan-map-popup-note">Municipality-level map position; exact coordinates were not supplied in the profile.</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </LayerGroup>
              )}
            </MapContainer>

            <div className="palawan-map-badge-wrap">
              <div className="palawan-map-badge">
                <p className="palawan-map-badge-label">
                  Province of
                </p>

                <p className="palawan-map-badge-value">
                  PALAWAN
                </p>
              </div>
            </div>

            <div className="palawan-map-guide" aria-label="Map guide">
              <div className="palawan-map-guide-icon"><Info size={14} aria-hidden="true" /></div>
              <div>
                <strong>How to explore</strong>
                <span>Hover to highlight · Click an area to open its profile</span>
              </div>
            </div>

            <Legend
              indicator={indicator}
              min={stats.min}
              max={stats.max}
            />

            {selected && (
              <aside className="palawan-map-selected">
                <div className="palawan-map-selected-head">
                  <div>
                    <p className="palawan-map-selected-label">
                      Municipality
                    </p>

                    <h3 className="palawan-map-selected-title">
                      {selected.profileName}
                    </h3>

                    {selected.profileName !==
                      selected.mapName && (
                      <p className="palawan-map-selected-alias">
                        {selected.mapName}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="palawan-map-close"
                    aria-label="Close municipality details"
                  >
                    ×
                  </button>
                </div>

                <div className="palawan-map-selected-context">
                  <span className="palawan-map-selected-context-dot" aria-hidden="true" />
                  <span>{selected.value === null || selected.value === undefined ? 'No supplied value for this indicator.' : 'Supplied profile value'}</span>
                </div>

                <div className="palawan-map-selected-value">
                  <p className="palawan-map-selected-value-label">
                    {INDICATORS[indicator].label}
                  </p>

                  <p className="palawan-map-selected-number">
                    {formatValue(
                      selected.value,
                      indicator
                    )}
                  </p>
                </div>

                <div className="palawan-map-selected-meta">
                  <span className="palawan-map-selected-meta-label">
                    Data status
                  </span>

                  <span className="palawan-map-selected-meta-value">
                    {selected.value === null ||
                    selected.value === undefined
                      ? "Not available"
                      : "Available"}
                  </span>
                </div>
              </aside>
            )}
          </div>
        )}
      </div>

      <div className="palawan-map-footer">
        <p className="palawan-map-footer-copy">
          Hover to highlight a municipality. Click a municipality to view its indicator value. Education pins use municipality-level positions when exact coordinates are not included in the supplied profile.
        </p>
        {unmatchedMunicipalities.length > 0 && (
          <p className="palawan-map-warning">
            {unmatchedMunicipalities.length} profile municipality{unmatchedMunicipalities.length === 1 ? '' : 'ies'} could not be matched to a boundary:
            {' '}{unmatchedMunicipalities.map((row) => row.municipality.replace(', Palawan', '')).join(', ')}.
          </p>
        )}
        {showEducationPins && unmatchedEducationPoints > 0 && (
          <p className="palawan-map-warning">
            {unmatchedEducationPoints} education/TVET location{unmatchedEducationPoints === 1 ? '' : 's'} could not be matched to a municipality and are not shown on the map.
          </p>
        )}
      </div>

      <style>{`

        .palawan-map-shell {
          overflow: hidden;
          border: 1px solid #e1e9e5;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 14px 40px rgba(27, 55, 47, 0.06);
        }

        .palawan-map-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e4ebe8;
          background: #ffffff;
        }

        .palawan-map-header-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
        }

        .palawan-map-eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .palawan-map-eyebrow-dot {
          width: 8px;
          height: 8px;
          flex: 0 0 8px;
          border-radius: 50%;
          background: #15803d;
        }

        .palawan-map-eyebrow-text,
        .palawan-map-selected-label {
          color: #166534;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .18em;
          text-transform: uppercase;
        }

        .palawan-map-title {
          margin: 0;
          color: #0f172a;
          font-size: 28px;
          line-height: 1.2;
          font-weight: 700;
          letter-spacing: -.02em;
        }

        .palawan-map-description {
          max-width: 560px;
          margin: 5px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.55;
        }

        .palawan-map-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .palawan-map-count,
        .palawan-map-button,
        .palawan-map-select {
          min-height: 40px;
          box-sizing: border-box;
          border-radius: 9px;
          font: inherit;
          font-size: 13px;
        }

        .palawan-map-count {
          display: inline-flex;
          align-items: center;
          padding: 0 12px;
          background: #f8faf9;
          color: #64748b;
          white-space: nowrap;
        }

        .palawan-map-count-value {
          margin-right: 4px;
          color: #0f172a;
          font-weight: 700;
        }

        .palawan-map-select {
          min-width: 200px;
          padding: 0 12px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-weight: 600;
          outline: none;
        }

        .palawan-map-select:focus,
        .palawan-map-button:focus-visible,
        .palawan-map-close:focus-visible {
          outline: 3px solid rgba(22, 101, 52, .18);
          outline-offset: 2px;
          border-color: #15803d;
        }

        .palawan-map-button {
          padding: 0 13px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          cursor: pointer;
          transition: background-color .18s ease, border-color .18s ease, color .18s ease;
        }

        .palawan-map-button:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
          color: #0f172a;
        }

        .palawan-map-button.is-active {
          border-color: #166534;
          background: #166534;
          color: #ffffff;
        }

        .palawan-map-body {
          padding: 16px;
          background: #f1f5f3;
        }

        .palawan-map-status {
          min-height: 560px;
          display: grid;
          place-items: center;
          box-sizing: border-box;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #ffffff;
          padding: 24px;
          text-align: center;
        }

        .palawan-map-status-copy {
          max-width: 420px;
        }

        .palawan-map-spinner {
          width: 32px;
          height: 32px;
          margin: 0 auto;
          border: 2px solid #e2e8f0;
          border-top-color: #166534;
          border-radius: 50%;
          animation: palawan-map-spin .8s linear infinite;
        }

        .palawan-map-status-title {
          margin: 14px 0 0;
          color: #334155;
          font-size: 14px;
          font-weight: 700;
        }

        .palawan-map-status-detail {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
        }

        .palawan-map-status-error {
          border-color: #fecaca;
        }

        .palawan-map-error-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          margin: 0 auto;
          border-radius: 50%;
          background: #fef2f2;
          color: #dc2626;
          font-size: 18px;
          font-weight: 800;
        }

        .palawan-map-canvas-wrap {
          position: relative;
          height: 560px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #edf2ed;
          box-shadow: inset 0 1px 3px rgba(15, 23, 42, .04);
        }

        .palawan-leaflet-map {
          width: 100%;
          height: 100%;
        }

        .palawan-map-badge-wrap {
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 1000;
          pointer-events: none;
        }

        .palawan-map-badge {
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: rgba(255, 255, 255, .95);
          box-shadow: 0 6px 18px rgba(15, 23, 42, .10);
        }

        .palawan-map-badge-label,
        .palawan-map-legend-title {
          margin: 0;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .palawan-map-badge-value {
          margin: 2px 0 0;
          color: #0f172a;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: .04em;
        }

        .palawan-map-legend {
          position: absolute;
          left: 16px;
          bottom: 16px;
          z-index: 1000;
        }

        .palawan-map-legend-card {
          min-width: 190px;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: rgba(255, 255, 255, .96);
          box-shadow: 0 8px 20px rgba(15, 23, 42, .12);
        }

        .palawan-map-legend-scale {
          display: flex;
          gap: 4px;
          margin-top: 8px;
        }

        .palawan-map-legend-swatch {
          width: 28px;
          height: 10px;
          flex: 1;
          border-radius: 3px;
        }

        .palawan-map-legend-values {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-top: 4px;
          color: #64748b;
          font-size: 11px;
        }

        .palawan-map-selected {
          position: absolute;
          right: 16px;
          bottom: 16px;
          z-index: 1100;
          width: 300px;
          max-width: calc(100% - 32px);
          box-sizing: border-box;
          padding: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          background: rgba(255, 255, 255, .97);
          box-shadow: 0 14px 30px rgba(15, 23, 42, .16);
          backdrop-filter: blur(8px);
        }

        .palawan-map-selected-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .palawan-map-selected-title {
          margin: 4px 0 0;
          color: #0f172a;
          font-size: 20px;
          line-height: 1.2;
          font-weight: 800;
        }

        .palawan-map-selected-alias {
          margin: 2px 0 0;
          color: #94a3b8;
          font-size: 12px;
        }

        .palawan-map-close {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          flex: 0 0 32px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          color: #64748b;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
        }

        .palawan-map-selected-value {
          margin-top: 16px;
          padding: 16px;
          border-radius: 12px;
          background: #f8fafc;
        }

        .palawan-map-selected-value-label,
        .palawan-map-selected-meta-label {
          margin: 0;
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
        }

        .palawan-map-selected-number {
          margin: 4px 0 0;
          color: #166534;
          font-size: 30px;
          line-height: 1.1;
          font-weight: 800;
          letter-spacing: -.02em;
        }

        .palawan-map-selected-meta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #f1f5f9;
        }

        .palawan-map-selected-meta-value {
          color: #334155;
          font-size: 12px;
          font-weight: 700;
        }

        .palawan-map-footer {
          padding: 12px 24px;
          border-top: 1px solid #e4ebe8;
          background: #ffffff;
        }

        .palawan-map-footer-copy,
        .palawan-map-warning {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.6;
        }

        .palawan-map-warning {
          margin-top: 4px;
          color: #b45309;
          font-weight: 600;
        }

        .palawan-map-sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .palawan-map-popup {
          min-width: 220px;
        }

        .palawan-map-popup-label {
          margin: 0;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .palawan-map-popup-name {
          margin: 4px 0 0;
          color: #0f172a;
          font-size: 13px;
          font-weight: 700;
        }

        .palawan-map-popup-location {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .palawan-map-popup-note {
          margin: 8px 0 0;
          color: #b45309;
          font-size: 11px;
          font-weight: 600;
          line-height: 1.45;
        }

        @keyframes palawan-map-spin {
          to { transform: rotate(360deg); }
        }

        .palawan-map-reset-control {
          position: absolute;
          top: 16px;
          right: 16px;
          z-index: 1000;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 36px;
          padding: 0 11px;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          background: rgba(255, 255, 255, .96);
          color: #475569;
          box-shadow: 0 7px 18px rgba(15, 23, 42, .10);
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          transition: background-color .18s ease, border-color .18s ease, color .18s ease, transform .18s ease;
        }

        .palawan-map-reset-control:hover {
          border-color: #cbd5e1;
          background: #ffffff;
          color: #166534;
          transform: translateY(-1px);
        }

        .palawan-map-reset-control:focus-visible {
          outline: 3px solid rgba(22, 101, 52, .18);
          outline-offset: 2px;
        }

        .palawan-map-guide {
          position: absolute;
          top: 16px;
          left: 50%;
          z-index: 1000;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 9px;
          max-width: min(430px, calc(100% - 270px));
          padding: 9px 12px;
          border: 1px solid rgba(226, 232, 240, .92);
          border-radius: 11px;
          background: rgba(255, 255, 255, .94);
          box-shadow: 0 7px 18px rgba(15, 23, 42, .09);
          backdrop-filter: blur(6px);
        }

        .palawan-map-guide-icon {
          display: grid;
          width: 26px;
          height: 26px;
          place-items: center;
          flex: 0 0 26px;
          border-radius: 7px;
          background: #edf5f1;
          color: #166534;
        }

        .palawan-map-guide strong,
        .palawan-map-guide span {
          display: block;
        }

        .palawan-map-guide strong {
          color: #334155;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .02em;
        }

        .palawan-map-guide span {
          margin-top: 1px;
          color: #64748b;
          font-size: 10px;
          line-height: 1.35;
        }

        .palawan-map-legend-missing {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          color: #64748b;
          font-size: 10px;
        }

        .palawan-map-legend-missing-swatch {
          width: 12px;
          height: 12px;
          flex: 0 0 12px;
          border: 1px solid #cbd5e1;
          border-radius: 3px;
          background: #e2e8f0;
        }

        .palawan-map-selected-context {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 12px;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
        }

        .palawan-map-selected-context-dot {
          width: 6px;
          height: 6px;
          flex: 0 0 6px;
          border-radius: 50%;
          background: #15803d;
        }

        @media (max-width: 900px) {
          .palawan-map-header-row {
            align-items: stretch;
            flex-direction: column;
          }
          .palawan-map-controls {
            justify-content: flex-start;
          }
        }

        @media (max-width: 620px) {
          .palawan-map-header { padding: 16px; }
          .palawan-map-body { padding: 10px; }
          .palawan-map-title { font-size: 24px; }
          .palawan-map-description { font-size: 13px; }
          .palawan-map-controls { display: grid; grid-template-columns: 1fr 1fr; }
          .palawan-map-count,
          .palawan-map-select,
          .palawan-map-button { width: 100%; min-width: 0; }
          .palawan-map-count { grid-column: 1 / -1; justify-content: center; }
          .palawan-map-select { grid-column: 1 / -1; }
          .palawan-map-canvas-wrap,
          .palawan-map-status { height: 390px; min-height: 390px; }
          .palawan-map-legend { left: 8px; bottom: 8px; }
          .palawan-map-legend-card { min-width: 160px; padding: 10px; }
          .palawan-map-guide { top: 8px; max-width: 220px; }
          .palawan-map-reset-control { top: 8px; right: 8px; }
          .palawan-map-selected { right: 8px; bottom: 8px; max-width: calc(100% - 16px); }
          .palawan-map-badge-wrap { top: 8px; left: 8px; }
          .palawan-map-footer { padding: 12px 16px; }
          .palawan-map-guide { left: 8px; right: 8px; transform: none; max-width: none; }
          .palawan-map-guide div:last-child { min-width: 0; }
          .palawan-map-guide span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .palawan-map-reset-control { top: 62px; right: 8px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .palawan-map-spinner { animation: none; }
          .palawan-map-button, .palawan-map-reset-control { transition: none; }
        }
        .leaflet-container {
          height: 100% !important;
          width: 100% !important;
          font-family: inherit;
          background: #edf2ed;
        }

        .palawan-map-tooltip {
          border: 0 !important;
          border-radius: 8px !important;
          padding: 7px 10px !important;
          background: #0f172a !important;
          color: #ffffff !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.18) !important;
        }

        .palawan-map-tooltip::before {
          border-top-color: #0f172a !important;
        }

        .leaflet-control-zoom {
          margin-right: 12px !important;
          margin-top: 12px !important;
          border: 0 !important;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12) !important;
        }

        .leaflet-control-zoom a {
          width: 44px !important;
          height: 44px !important;
          line-height: 44px !important;
          border: 0 !important;
          color: #334155 !important;
          background: rgba(255, 255, 255, 0.96) !important;
        }

        .leaflet-control-zoom a:first-child {
          border-radius: 9px 9px 0 0 !important;
        }

        .leaflet-control-zoom a:last-child {
          border-radius: 0 0 9px 9px !important;
        }

        .leaflet-control-zoom a:hover {
          color: #166534 !important;
          background: #f8fafc !important;
        }

        .leaflet-control-attribution {
          padding: 3px 6px !important;
          border-radius: 6px 0 0 0;
          background: rgba(255, 255, 255, 0.88) !important;
          font-size: 11px !important;
        }
      `}</style>
    </section>
  );
}