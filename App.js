import React from 'react';
import { StyleSheet, View, Platform, Dimensions, SafeAreaView, TurboModuleRegistry } from 'react-native';
import MapView, { Marker, AnimatedRegion } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
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

export default class Trackee extends React.Component {
  locationSubscription = null;
  locations: [] = []
  constructor(props) {
    super(props);

    this.state = {
      latitude: LATITUDE,
      longitude: LONGITUDE,
      coordinate: new AnimatedRegion({
        latitude: LATITUDE,
        longitude: LONGITUDE,
        latitudeDelta: 0,
        longitudeDelta: 0,
      }),
    };
  }

  componentDidMount() {
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
    //Geolocation.clearWatch(this.watchID);
  }

  getMapRegion = () => ({
    latitude: this.state.latitude,
    longitude: this.state.longitude,
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

  rnLocationRequestPermission(){
    RNLocation.requestPermission({
      ios: 'always',
      android: {
        detail: 'fine',
      },
    }).then((granted) => {
      console.log('Location Permissions: ', granted);
      if (granted) {
        this.locationSubscription = RNLocation.subscribeToLocationUpdates(
          ([locations]) => {
            this.locations.push(locations)
            console.log("total locations getted ", this.locations.length);
            const { coordinate } = this.state;
            const { latitude, longitude } = locations;

            const newCoordinate = {
              latitude,
              longitude,
            };

            coordinate.timing(newCoordinate).start();
            this.setState({
              latitude,
              longitude,
            });
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
