"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./ClubMap.css";

// Fix for default markers not showing in Leaflet with webpack/Next.js
// We need to manually set the icon paths since they don't bundle correctly
const defaultIcon = L.icon({
  iconUrl: "/images/marker-icon.png",
  iconRetinaUrl: "/images/marker-icon-2x.png",
  shadowUrl: "/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Set the default icon for all markers
L.Marker.prototype.options.icon = defaultIcon;

interface ClubMapProps {
  latitude: number;
  longitude: number;
  clubName: string;
  className?: string;
}

// Helper component to recenter map when coordinates change
function MapCenterUpdater({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([latitude, longitude], 15);
  }, [map, latitude, longitude]);
  
  return null;
}

export function ClubMap({ latitude, longitude, clubName, className = "" }: ClubMapProps) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      scrollWheelZoom={true}
      className={`rsp-club-map ${className}`.trim()}
      role="application"
      aria-label={`Map showing location of ${clubName}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[latitude, longitude]}>
        <Popup>
          <strong>{clubName}</strong>
        </Popup>
      </Marker>
      <MapCenterUpdater latitude={latitude} longitude={longitude} />
    </MapContainer>
  );
}
