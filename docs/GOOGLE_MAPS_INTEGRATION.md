# Google Maps StreetView and 3D Buildings Integration

## Overview

The MapAble platform now supports Google Maps as an optional map provider alongside Leaflet/OpenStreetMap. Users can toggle between providers to access StreetView and 3D building visualization features.

## Features

### Map Providers
- **Leaflet/OpenStreetMap** (default, free, open source)
- **Google Maps** (with StreetView and 3D buildings, requires API key)

### Google Maps Features
- **StreetView Integration**: Full-screen and embedded StreetView panoramas
- **3D Buildings**: Tilted satellite view with 3D building visualization
- **Interactive Controls**: Tilt, rotate, and reset view controls
- **Provider Toggle**: Easy switching between map providers
- **Marker Support**: Compatible with existing marker system
- **Ad Integration**: Works with sponsored markers and advertisements

## Setup

### 1. Install Dependencies

```bash
pnpm install @react-google-maps/api @types/google.maps
```

### 2. Environment Variables

Add to `.env.local`:

```env
# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
GOOGLE_MAPS_ENABLED=true
GOOGLE_MAPS_STREETVIEW_ENABLED=true
GOOGLE_MAPS_3D_BUILDINGS_ENABLED=true

# Map Provider Default
NEXT_PUBLIC_DEFAULT_MAP_PROVIDER=leaflet

# Optional: Customize 3D settings
GOOGLE_MAPS_3D_TILT=45
GOOGLE_MAPS_3D_HEADING=0
GOOGLE_MAPS_DEFAULT_TYPE=roadmap
```

### 3. Google Cloud Console Setup

1. Create a project in Google Cloud Console
2. Enable **Maps JavaScript API**
3. Enable **Street View Static API** (optional, for static images)
4. Create API key with appropriate restrictions
5. Add API key to environment variables

## Usage

### Basic Map with Provider Toggle

```tsx
import Map from "@/components/map/Map";

<Map
  center={[-33.8688, 151.2093]}
  zoom={13}
  markers={markers}
  showProviderToggle={true}
  enable3DBuildings={true}
  enableStreetView={true}
/>
```

### Map with Ads and Google Maps

```tsx
import { MapWithAds } from "@/components/map/MapWithAds";

<MapWithAds
  center={[-33.8688, 151.2093]}
  zoom={13}
  showProviderToggle={true}
  enable3DBuildings={true}
  enableStreetView={true}
  adUnitId="your_ad_unit_id"
/>
```

### Standalone StreetView

```tsx
import { StreetView } from "@/components/map/StreetView";

<StreetView
  position={{ lat: -33.8688, lng: 151.2093 }}
  heading={0}
  pitch={0}
  fullscreen={true}
  onClose={() => setShowStreetView(false)}
/>
```

### Using Map Provider Hook

```tsx
import { useMapProvider } from "@/hooks/use-map-provider";

function MyComponent() {
  const { provider, setProvider, capabilities, supportsStreetView } = useMapProvider();

  return (
    <div>
      <button onClick={() => setProvider("google")}>
        Switch to Google Maps
      </button>
      {supportsStreetView && <p>StreetView available</p>}
    </div>
  );
}
```

## Components

### Map Component
- Supports both Leaflet and Google Maps
- Automatic provider switching
- Optional provider toggle UI
- Maintains marker compatibility

### GoogleMap Component
- Full Google Maps JavaScript API integration
- 3D buildings support (satellite view with tilt)
- StreetView controls
- Custom marker support
- Event handlers (click, marker click)

### StreetView Component
- Standalone StreetView panorama
- Full-screen or embedded mode
- Navigation controls
- Position change callbacks

### MapProviderToggle Component
- UI to switch between providers
- Shows provider capabilities
- Persists user preference

### Map3DControls Component
- Tilt adjustment (0-45 degrees)
- Heading/rotation control (0-360 degrees)
- Reset view button
- Collapsible interface

## API Routes

### StreetView Metadata
`GET /api/maps/streetview?lat={lat}&lng={lng}`

Returns StreetView availability information for a location.

## Configuration

### Google Maps Config (`lib/config/google-maps.ts`)

- API key management
- Map options (zoom, center, mapTypeId)
- StreetView options
- 3D buildings configuration
- Feature flags

### Map Provider Service (`lib/services/mapping/map-provider-service.ts`)

- Provider availability checking
- Capability detection
- Default provider selection

## Hooks

### useMapProvider
- Current provider state
- Provider switching
- Capability checking
- localStorage persistence

### useGoogleMaps
- Google Maps API loading
- Load state management
- Error handling

## Cost Considerations

- **Leaflet/OSM**: Free (open source)
- **Google Maps**: Pay-per-use pricing
  - Maps JavaScript API: ~$7 per 1000 loads
  - Street View Static API: ~$7 per 1000 requests
  - Free tier: $200 credit/month

**Recommendation**: Default to Leaflet to minimize costs, allow users to opt-in to Google Maps for enhanced features.

## Accessibility

- Keyboard navigation for StreetView
- Screen reader support
- ARIA labels for all controls
- High contrast mode support
- Alternative text for 3D building descriptions

## Next Steps

1. Install dependencies: `pnpm install`
2. Set up Google Maps API key in Google Cloud Console
3. Add environment variables
4. Test StreetView and 3D buildings features
5. Configure API restrictions and quotas
6. Monitor usage and costs
