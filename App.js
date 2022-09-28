import React from 'react';
import {
  StyleSheet,
  View,
  Platform,
  Dimensions,
  SafeAreaView,
  TurboModuleRegistry,
  AppState,
  Text,
} from 'react-native';
import MapView, {
  Marker,
  AnimatedRegion,
  Polyline,
  LatLng,
} from 'react-native-maps';
import {PermissionsAndroid, PermissionStatus} from 'react-native';
//import VIForegroundService from '@voximplant/react-native-foreground-service';
import notifee from '@notifee/react-native';

import RNLocation from 'react-native-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

//import PubNubReact from 'pubnub-react';

const {width, height} = Dimensions.get('window');

const ASPECT_RATIO = width / height;

const LATITUDE = -42.780131;
const LONGITUDE = -65.055571;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const LOCATIONS: LatLng[] = [];
export default class Trackee extends React.Component {
  locationSubscription = null;
  //foregroundService = VIForegroundService.getInstance();
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

  async componentDidMount() {
    const lastState: string = (await AsyncStorage.getItem('@appState')) || '';
    if (lastState == 'background') {
      // La app fue removida, verificar sino quedo un
      // recorrido en curso y si fue así,
      // reestablecerlo.
    }
    this.appStateSubscription = AppState.addEventListener(
      'change',
      async nextAppState => {
        await AsyncStorage.setItem('@appState', nextAppState);
        if (
          this.state.appState.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          // La aplicación ha vuelto al foreground.
          // Se agregan las coordenadas obtenidas en background
          // para que puedan visualizarse.
          const {locations, backgroundLocations} = this.state;
          const _locations = [...locations, ...backgroundLocations];
          this.setState({locations: _locations, backgroundLocations: []});
        } else if (nextAppState.match(/inactive|background/)) {
          // La aplicación ha pasado a segundo plano.
          // En este momento se debe persistir el estado actual del recorrido,
          // en caso de haber uno en curso.
        }
        this.setState({appState: nextAppState});
      },
    );
    if (Platform.OS == 'android') {
      //this.isBackgroundGranted();
      this.initLocationAndroid();
    } else this.initLocationIOS();
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
    console.log('componentWillUnmount');
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
  async isBackgroundGranted(): Promise<boolean> {
    try {
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
      return backgroundGranted === PermissionsAndroid.RESULTS.GRANTED
    } catch (error) {
      console.error('background error ', error);
      return false
    }
  }

  rnLocationConfigure() {
    RNLocation.configure({
      distanceFilter: 0, // Meters
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
    }).then(granted => {
      console.log('Location Permissions: ', granted);
      if (granted) {
        this.locationSubscription = RNLocation.subscribeToLocationUpdates(
          ([location]) => {
            const {
              coordinate,
              locations,
              appState,
              backgroundLocations,
            } = this.state;
            const {latitude, longitude} = location;

            const newCoordinate: LatLng = {
              latitude,
              longitude,
            };

            coordinate.timing(newCoordinate).start();

            if (appState == 'active') {
              let _locations = [...locations, newCoordinate];
              console.log('locations length ', _locations.length);
              this.setState({
                latitude,
                longitude,
                locations: _locations,
              });
            } else {
              let _locations = [...backgroundLocations, newCoordinate];
              console.log('BACKGROUND locations length ', _locations.length);
              this.setState({
                backgroundLocations: _locations,
              });
            }
          },
        );
      } else {
        console.log('no permissions to obtain location');
      }
    });
  }

  async configForegroundService() {
    
    // const channelConfig = {
    //   id: 'channelId',
    //   name: 'Channel name',
    //   description: 'Channel description',
    //   enableVibration: false,
    // };
    // await this.foregroundService.createNotificationChannel(channelConfig);

    // const notificationConfig = {
    //   channelId: 'channelId',
    //   id: 3456,
    //   title: 'Title',
    //   text: 'Some text',
    //   icon: 'ic_icon',
    //   button: 'Some text',
    //   }

    //   try {
    //       await this.foregroundService.startService(notificationConfig);
    //   } catch (e) {
    //       console.error(e);
    //   }

    notifee.registerForegroundService((notification) => {
      return new Promise(() => {
        // Long running task...
        console.log("foreground service running...")
      });
    });
  }

  initLocationIOS() {
    this.rnLocationConfigure();
    this.rnLocationRequestPermission();
  }

  initLocationAndroid() {
    const _isBackgroundGranted: boolean = this.isBackgroundGranted()
    if(_isBackgroundGranted) this.configForegroundService();
    this.rnLocationConfigure();
    this.rnLocationRequestPermission();
  }
  
  clearTimeout() {}

  getLocations() {
    return [];
  }

  render() {
    return (
      <SafeAreaView style={{flex: 1}}>
        <View style={styles.container}>
          <MapView
            style={styles.map}
            showUserLocation
            followUserLocation
            loadingEnabled
            region={this.getMapRegion()}
          >
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
                '#7F0000',
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
