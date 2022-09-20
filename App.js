import React from 'react';
import { StyleSheet, View, Platform, Dimensions, SafeAreaView, TurboModuleRegistry, AppState } from 'react-native';
import MapView, { Marker, AnimatedRegion, Polyline, LatLng } from 'react-native-maps';
import { PermissionsAndroid, PermissionStatus } from 'react-native';
import ReactNativeForegroundService from '@supersami/rn-foreground-service';
import RNLocation from 'react-native-location';


//import PubNubReact from 'pubnub-react';

const { width, height } = Dimensions.get('window');

const ASPECT_RATIO = width / height;

const LATITUDE = -42.780131;
const LONGITUDE = -65.055571;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const LOCATIONS: LatLng[] = []
export default class Trackee extends React.Component {
  locationSubscription = null;
  constructor(props) {
    super(props);

    this.state = {
      appState: AppState.currentState,
      latitude: LATITUDE,
      longitude: LONGITUDE,
      locations: LOCATIONS,
      backgroundLocations: [],
      coordinate: new AnimatedRegion({
        latitude: LATITUDE,
        longitude: LONGITUDE,
        latitudeDelta: 0,
        longitudeDelta: 0,
      }),
    };
  }

  componentDidMount() {
    this.appStateSubscription = AppState.addEventListener(
      "change",
      nextAppState => {
        if (
          this.state.appState.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          console.log("App has come to the foreground!");
          const { locations, backgroundLocations } = this.state
          const _locations = [...locations, ...backgroundLocations]
          this.setState({ appState: nextAppState, locations: _locations });
        }else this.setState({ appState: nextAppState });
      }
    );
    if (Platform.OS == 'android') this.isBackgroundGranted()
    else this.initLocationIOS()
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.latitude !== prevState.latitude) {
      // this.pubnub.publish({
      //   message: {
      //     latitude: this.state.latitude,
      //     longitude: this.state.longitude,
      //   },
      //   channel: 'location',
      // });
    }
  }

  componentWillUnmount() {
    console.log("componentWillUnmount")
    this.appStateSubscription.remove();
  }

  getMapRegion = () => ({
    latitude: this.state.latitude,
    longitude: this.state.longitude,
    locations: this.state.locations,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  });

  //request the permission before starting the service.
  async isBackgroundGranted(): Promise<PermissionStatus> {
    const backgroundGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      {
        title: 'Background Location Permission',
        message:
          'We need access to your location ' +
          'so you can get live quality updates.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );

    if (backgroundgranted === PermissionsAndroid.RESULTS.GRANTED) {
      //do your thing!
      console.log("is granted!")
    }
  }

  rnLocationConfigure() {
    RNLocation.configure({
      distanceFilter: 100, // Meters
      desiredAccuracy: {
        ios: 'best',
        android: 'balancedPowerAccuracy',
      },
      // Android only
      androidProvider: 'auto',
      interval: 5000, // Milliseconds
      fastestInterval: 10000, // Milliseconds
      maxWaitTime: 5000, // Milliseconds
      // iOS Only
      activityType: 'other',
      allowsBackgroundLocationUpdates: true,
      headingFilter: 1, // Degrees
      headingOrientation: 'portrait',
      pausesLocationUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: false,
    });
  }

  rnLocationRequestPermission() {
    RNLocation.requestPermission({
      ios: 'always',
      android: {
        detail: 'fine',
      },
    }).then((granted) => {
      console.log('Location Permissions: ', granted);
      if (granted) {
        this.locationSubscription = RNLocation.subscribeToLocationUpdates(
          ([location]) => {            
            
            const { coordinate, locations, appState, backgroundLocations } = this.state;
            const { latitude, longitude } = location;

            const newCoordinate: LatLng = {
              latitude,
              longitude,
            }

            coordinate.timing(newCoordinate).start();

            if(appState == 'active'){
              let _locations = [...locations, newCoordinate]
              console.log("locations length ", _locations.length)
              this.setState({
                latitude,
                longitude,
                locations: _locations
              });
            }else{
              let _locations = [...backgroundLocations, newCoordinate]
              console.log("BACKGROUND locations length ", _locations.length)
              this.setState({
                backgroundLocations: _locations
              });
            }           
            
          },
        );
      } else {
        console.log('no permissions to obtain location');
      }
    });
  }

  initLocationIOS() {
    this.rnLocationConfigure()
    this.rnLocationRequestPermission()
  }

  initLocationAndroid() {
    ReactNativeForegroundService.register();
    this.rnLocationConfigure()

    const taskId: string = ReactNativeForegroundService.add_task(
      () => {
        console.log('my task!')
        this.rnLocationRequestPermission()
      },
      {
        delay: 1000,
        onLoop: true,
        taskId: 'taskid',
        onError: (e) => console.log('Error logging:', e),
      },
    );

    ReactNativeForegroundService.start({ id: 55, title: 'My Trackee App', message: 'Estamos obteniendo tu ubicación...' })
  }

  clearTimeout() {

  }

  getLocations(){
    return []
  }

  render() {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          <MapView style={styles.map} showUserLocation followUserLocation loadingEnabled region={this.getMapRegion()}>
            <Marker.Animated
              ref={marker => {
                this.marker = marker;
              }}
              coordinate={this.state.coordinate}
            />
            <Polyline
              coordinates={this.state.locations}
              strokeColor="#000" // fallback for when `strokeColors` is not supported by the map-provider
              strokeColors={[
                '#7F0000',
                '#00000000', // no color, creates a "long" gradient between the previous and next coordinate
                '#B24112',
                '#E5845C',
                '#238C23',
                '#7F0000'
              ]}
              strokeWidth={6}
            />
          </MapView>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
