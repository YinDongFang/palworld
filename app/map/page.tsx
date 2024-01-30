'use client';
import { useRef, useEffect } from 'react';
import { PalList } from '#/ui/pal-list';
import mapboxgl from 'mapbox-gl';
// import

export default function Page() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    mapRef.current = new mapboxgl.Map({
      maxBounds: [
        [-1.2, 0.2],
        [-0.2, 1.2],
      ],
      style: {
        version: 8,
        name: 'OSM Liberty',
        sources: {
          natural_earth_shaded_relief: {
            bounds: [-1.4, 0, 0, 1.4],
            maxZoom: 14,
            tileSize: 256,
            tiles: ['/tiles/{z}/{x}/{y}.jpg'],
            type: 'raster',
          },
        },
        sprite:
          'https://cdn.mapgenie.io/images/games/palworld/markers?NDA5MTQw',
        glyphs:
          'https://cdn.mapgenie.io/fonts/palworld/pbf/{fontstack}/{range}.pbf',
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#172537' },
          },
          {
            id: 'natural_earth',
            type: 'raster',
            source: 'natural_earth_shaded_relief',
            maxZoom: 14,
          },
        ],
      },
      container: containerRef.current,
      center: [-0.7029870290901385, 0.6983461022008157],
      zoom: 11,
      maxPitch: 0,
      minZoom: 9,
      maxZoom: 14,
      pitchWithRotate: false,
      attributionControl: false,
      dragRotate: false,
      boxZoom: false,
      touchZoomRotate: true,
      touchPitch: false,
      renderWorldCopies: false,
      keyboard: true,
      antialias: false,
      bearing: 0,
    });
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
