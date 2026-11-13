import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { useEffect, useRef } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { Location } from '../api/types'

// Bundlers break Leaflet's default icon URLs (Leaflet guesses a path from its CSS);
// remove that guess and point the icons at the bundled image files instead.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

const KUALA_LUMPUR: [number, number] = [3.139, 101.6869]

interface Props {
  locations: Location[]
  selectedId: number | null
  onSelect: (l: Location) => void
  onEdit: (l: Location) => void
  onMapClick: (lat: number, lng: number) => void
}

/** Zooms to fit all markers whenever the set of shown locations changes. */
function FitToLocations({ locations, selectedId }: { locations: Location[]; selectedId: number | null }) {
  const map = useMap()
  const key = locations.map((l) => `${l.id}:${l.latitude}:${l.longitude}`).join('|')
  useEffect(() => {
    if (selectedId !== null || locations.length === 0) return
    if (locations.length === 1) {
      map.setView([locations[0].latitude, locations[0].longitude], 14)
    } else {
      map.fitBounds(L.latLngBounds(locations.map((l) => [l.latitude, l.longitude])), { padding: [40, 40], maxZoom: 15 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map])
  return null
}

function ClickToPick({ onMapClick }: { onMapClick: Props['onMapClick'] }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) })
  return null
}

export function LocationMap({ locations, selectedId, onSelect, onEdit, onMapClick }: Props) {
  const markerRefs = useRef(new Map<number, L.Marker>())

  return (
    <MapContainer center={KUALA_LUMPUR} zoom={11} className="h-full w-full rounded-xl" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToLocations locations={locations} selectedId={selectedId} />
      <FlyToSelected locations={locations} selectedId={selectedId} markerRefs={markerRefs} />
      <ClickToPick onMapClick={onMapClick} />
      {locations.map((l) => (
        <Marker
          key={l.id}
          position={[l.latitude, l.longitude]}
          title={l.name}
          ref={(m) => {
            if (m) markerRefs.current.set(l.id, m)
            else markerRefs.current.delete(l.id)
          }}
          eventHandlers={{ click: () => onSelect(l) }}
        >
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">{l.name}</p>
              <p className="text-xs text-slate-500">
                {l.latitude.toFixed(6)}, {l.longitude.toFixed(6)}
              </p>
              <button type="button" className="text-xs font-medium text-blue-600 hover:underline" onClick={() => onEdit(l)}>
                Edit
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

/** When a location is selected in the list, fly to it and open its popup. */
function FlyToSelected({
  locations,
  selectedId,
  markerRefs,
}: {
  locations: Location[]
  selectedId: number | null
  markerRefs: React.RefObject<Map<number, L.Marker>>
}) {
  const map = useMap()
  const selected = locations.find((l) => l.id === selectedId)
  useEffect(() => {
    if (!selected) return
    map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 14), { duration: 0.6 })
    markerRefs.current?.get(selected.id)?.openPopup()
  }, [selected, map, markerRefs])
  return null
}
