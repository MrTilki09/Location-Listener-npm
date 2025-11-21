# location-listener

A robust React Native location listener with intelligent retry logic, automatic permission handling, and customizable callbacks. Perfect for applications that need continuous location tracking with built-in error recovery.

## Features

✅ **Automatic Permission Handling** - Requests geolocation authorization on mount  
✅ **Intelligent Retry Logic** - Exponential backoff for failed location requests  
✅ **Continuous Watching** - Automatically switches to `watchPosition` after initial location  
✅ **Custom Callbacks** - Pass your own `onLocation` handler to process location updates  
✅ **Optimized Settings** - Configurable accuracy, intervals, and distance filters  
✅ **Automatic Cleanup** - Properly clears watchers and timers on unmount  
✅ **TypeScript Support** - Fully typed for excellent IDE autocomplete

## Installation

```bash
npm install location-listener
```

### Peer Dependencies

This package requires:
- `react` >= 16.8.0
- `@react-native-community/geolocation` >= 3.0.0

Install the geolocation dependency:

```bash
npm install @react-native-community/geolocation
```

### iOS Setup

Add the following to your `Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs access to location to track your position.</string>
```

### Android Setup

Add to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

## Usage

### Basic Usage

Wrap your app (or specific components) with `NewLocationProvider`:

```tsx
import NewLocationProvider from 'location-listener';

function App() {
  return (
    <NewLocationProvider>
      <YourAppComponents />
    </NewLocationProvider>
  );
}
```

### Accessing Location in Components

Use the `useLocation` hook to access the current location and control the listener:

```tsx
import { useLocation } from 'location-listener';

function MyComponent() {
  const { location, startListening } = useLocation();

  if (!location) {
    return <Text>Waiting for location...</Text>;
  }

  return (
    <View>
      <Text>Latitude: {location.lat}</Text>
      <Text>Longitude: {location.long}</Text>
      <Button title="Restart Listening" onPress={startListening} />
    </View>
  );
}
```

### Using the Custom Callback

Pass an `onLocation` callback to `NewLocationProvider` to receive location updates directly:

```tsx
import NewLocationProvider, { LocationType } from 'location-listener';

function App() {
  const handleLocationUpdate = (loc: LocationType) => {
    console.log('New location:', loc.lat, loc.long);
    // Send to your API, log to analytics, etc.
    logToBackend(loc);
  };

  return (
    <NewLocationProvider onLocation={handleLocationUpdate}>
      <YourAppComponents />
    </NewLocationProvider>
  );
}
```

### Advanced Example: Logging to Backend

```tsx
import NewLocationProvider, { LocationType } from 'location-listener';

function App() {
  const logLocationToServer = async (loc: LocationType) => {
    try {
      await fetch('https://your-api.com/log-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: loc.lat,
          longitude: loc.long,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to log location:', error);
    }
  };

  return (
    <NewLocationProvider onLocation={logLocationToServer}>
      <NavigationContainer>
        <MainNavigator />
      </NavigationContainer>
    </NewLocationProvider>
  );
}
```

## API Reference

### `NewLocationProvider`

The main provider component that manages location tracking.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `React.ReactNode` | Yes | Your app components |
| `onLocation` | `(loc: LocationType) => void` | No | Callback invoked on every location update |

**Example:**

```tsx
<NewLocationProvider onLocation={(loc) => console.log(loc)}>
  {children}
</NewLocationProvider>
```

### `useLocation` Hook

Access location state and controls from any component within the provider.

**Returns:**

```typescript
{
  location: LocationType | null;  // Current location or null if not yet available
  startListening: () => void;      // Manually restart location tracking
}
```

**Example:**

```tsx
const { location, startListening } = useLocation();

if (location) {
  console.log(`Current position: ${location.lat}, ${location.long}`);
}
```

### `LocationType`

The location object type:

```typescript
type LocationType = {
  lat: number;   // Latitude
  long: number;  // Longitude
};
```

## How It Works

### Initialization Flow

1. **Permission Request**: On mount, the provider requests geolocation authorization
2. **Fast Location Fetch**: Attempts to get current position with `getCurrentPosition`
3. **Retry Logic**: If failed, retries with exponential backoff (max 5 attempts)
4. **Continuous Watching**: After success, starts `watchPosition` for live updates

### Retry Strategy

The package uses intelligent retry logic:

- **Attempt 1**: Immediate retry after 2 seconds
- **Attempt 2**: Retry after 3 seconds (2 × 1.5)
- **Attempt 3**: Retry after 4.5 seconds
- **Attempt 4**: Retry after 6.75 seconds
- **Attempt 5**: Retry after 10.125 seconds
- **After 5 attempts**: Falls back to `watchPosition` for continuous tracking

### Geolocation Settings

#### `getCurrentPosition` Options:
```typescript
{
  enableHighAccuracy: false,  // Faster response, lower accuracy
  timeout: 20000,             // 20 second timeout
  maximumAge: 10000           // Accept cached location up to 10s old
}
```

#### `watchPosition` Options:
```typescript
{
  enableHighAccuracy: false,  // Battery-friendly mode
  distanceFilter: 5,          // Update every 5 meters
  interval: 10000,            // Update every 10 seconds
  fastestInterval: 5000,      // Min 5 seconds between updates
  timeout: 20000,             // 20 second timeout per update
  maximumAge: 5000            // Accept cached location up to 5s old
}
```

### Error Handling

The package handles errors gracefully:

- **Permission Denied**: Sets `location` to `null` and logs error
- **Location Timeout**: Retries with exponential backoff
- **Watcher Errors**: Clears watch, waits 5 seconds, then restarts
- **Background State**: Tracks active state to prevent unnecessary retries

### Cleanup

Automatically cleans up on unmount:
- Clears all watch subscriptions
- Cancels pending retry timers
- Resets internal state

## Best Practices

### 1. Wrap at the App Root

Place the provider at your app's root level so all components can access location:

```tsx
// App.tsx
<NewLocationProvider onLocation={logLocation}>
  <NavigationContainer>
    <RootNavigator />
  </NavigationContainer>
</NewLocationProvider>
```

### 2. Check for Null Location

Always check if `location` is available before using it:

```tsx
const { location } = useLocation();

if (!location) {
  return <LoadingSpinner />;
}

return <Map center={location} />;
```

### 3. Avoid Re-renders

Memoize your `onLocation` callback to prevent unnecessary re-renders:

```tsx
const handleLocation = useCallback((loc: LocationType) => {
  // Your logic here
}, []);

<NewLocationProvider onLocation={handleLocation}>
```

### 4. Battery Optimization

The default settings are optimized for battery life. If you need high accuracy:

- Fork and modify the `enableHighAccuracy` option
- Adjust `distanceFilter` and `interval` based on your needs
- Consider disabling tracking when the app is in background

### 5. Error Monitoring

Log errors to your monitoring service:

```tsx
const handleLocation = (loc: LocationType) => {
  try {
    // Your logic
  } catch (error) {
    analytics.logError('location_tracking_error', error);
  }
};
```

## Troubleshooting

### Location Always Null

**Possible causes:**
- Permissions denied
- Location services disabled on device
- Emulator/simulator without location mock

**Solution:** Check device settings and grant location permissions.

### Frequent Timeouts

**Possible causes:**
- Poor GPS signal
- Indoor location
- Device in airplane mode

**Solution:** Increase `timeout` values or adjust `maximumAge` to accept older cached locations.

### High Battery Usage

**Possible causes:**
- `enableHighAccuracy: true`
- Low `distanceFilter` value
- Low `interval` value

**Solution:** Use default settings (high accuracy disabled) or increase intervals.

## TypeScript Support

This package is written in TypeScript and exports all necessary types:

```typescript
import NewLocationProvider, { 
  LocationType, 
  useLocation 
} from 'location-listener';
```

## License

ISC

## Author

**eyuphantilki**

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Changelog

### 1.0.0
- Initial release
- Automatic permission handling
- Intelligent retry logic with exponential backoff
- Continuous location watching
- Custom `onLocation` callback support
- TypeScript support
