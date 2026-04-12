"use client";

import { useState } from "react";

import ProviderOutletAutocomplete from "../provider-finder/components/ProviderOutletAutocomplete";

interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  providers: any[];
  providerOutlets: any[];
}

export default function PlacesPage() {
  const [lat, setLat] = useState(-33.756532);
  const [lon, setLon] = useState(151.291779);
  const [distanceKm, setDistanceKm] = useState(7);
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/places/nearby?lat=${lat}&lon=${lon}&distanceKm=${distanceKm}`,
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch");
      }
      const data: Place[] = await res.json();
      console.log("data", data);
      setResults(data);
    } catch (err: any) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Nearby Places Search</h1>

      <ProviderOutletAutocomplete
        id="provider-search-main"
        lat={lat}
        lon={lon}
        searchRadiusKm={distanceKm}
        value={query}
        onValueChange={(nextValue) => {
          setQuery(nextValue);
          // setPage(1);
        }}
        onSelect={(item) => {
          // if (item.suburb) setSelectedLocation(item.suburb);
        }}
        className="mt-1"
      />

      <div className="flex flex-col gap-3 mb-4">
        <input
          type="number"
          step="any"
          placeholder="Latitude"
          value={lat}
          onChange={(e) => setLat(parseFloat(e.target.value))}
          className="border p-2 rounded"
        />
        <input
          type="number"
          step="any"
          placeholder="Longitude"
          value={lon}
          onChange={(e) => setLon(parseFloat(e.target.value))}
          className="border p-2 rounded"
        />
        <input
          type="number"
          placeholder="Radius (km)"
          value={distanceKm}
          onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
          className="border p-2 rounded"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          {loading ? "Searching..." : "Search Nearby"}
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <ul className="space-y-2">
        {results.map((place) => {
          // console.log("place", place);
          return (
            <li key={place.id} className="border p-2 rounded">
              <p className="font-bold">{place.name}</p>
              <p>
                Lat: {place.latitude}, Lon: {place.longitude}
              </p>
              <p>Created: {new Date(place.createdAt).toLocaleString()}</p>
            </li>
          );
        })}
      </ul>

      {results.length === 0 && !loading && <p>No results found.</p>}
    </div>
  );
}
