import React, { Component } from 'react';
import {
  AppRegistry,
    Alert,
  StyleSheet,
  Text,
  View,
  TouchableHighlight,
  NativeAppEventEmitter,
  NativeEventEmitter,
  NativeModules,
  Platform,
  PermissionsAndroid,
  ListView,
  ScrollView
} from 'react-native';
import Dimensions from 'Dimensions';
import BleManager from 'react-native-ble-manager';
import TimerMixin from 'react-timer-mixin';
import reactMixin from 'react-mixin';

const window = Dimensions.get('window');
const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

export default class App extends Component {
  constructor(){
    super()

    this.state = {
      scanning:false,
      peripherals: new Map()
    }

    this.handleDiscoverPeripheral = this.handleDiscoverPeripheral.bind(this);
    this.handleStopScan = this.handleStopScan.bind(this);
    this.handleUpdateValueForCharacteristic = this.handleUpdateValueForCharacteristic.bind(this);
    this.handleDisconnectedPeripheral = this.handleDisconnectedPeripheral.bind(this);
  }

  componentDidMount() {
    BleManager.start({showAlert: false, allowDuplicates: false});
    bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral );
      //发现设备的回调

    bleManagerEmitter.addListener('BleManagerStopScan', this.handleStopScan );
    //停止搜索的回调
    bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral );
    //断掉链接的回调
    bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic );
    //  write的回调

    if (Platform.OS === 'android' && Platform.Version >= 23) {
        PermissionsAndroid.checkPermission(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
            if (result) {
              Alert.alert("Permission is OK");
            } else {
              PermissionsAndroid.requestPermission(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
                if (result) {
                  Alert.alert("User accept");
                } else {
                  Alert.alert("User refuse");
                }
              });
            }
      });
    }
  }

  handleDisconnectedPeripheral(data) { //断开连接 data.peripheral 是mac地址
    let peripherals = this.state.peripherals;
    let peripheral = peripherals.get(data.peripheral);
    if (peripheral) {
      peripheral.connected = false;
      peripherals.set(peripheral.id, peripheral);
      this.setState({peripherals});
    }
    Alert.alert('Disconnected from ' + JSON.stringify(data.peripheral));
  }

  handleUpdateValueForCharacteristic(data) {
   /* Alert.alert('Received '+ data.value + ' from ' + data.peripheral + ' characteristic ' + data.characteristic);*/
   Alert.alert('Received',JSON.stringify(data))
  }

  handleStopScan() {
    Alert.alert('Scan is stopped');
    this.setState({ scanning: false });
  }

  startScan() { //搜索
    if (!this.state.scanning) {
      BleManager.scan([], 3, true).then((results) => {
        Alert.alert('Scanning...');
        this.setState({scanning:true});
      });
    }
  }

  handleDiscoverPeripheral(peripheral){ //发现设备
    var peripherals = this.state.peripherals;
    if (!peripherals.has(peripheral.id)){
      Alert.alert('Got ble peripheral', JSON.stringify(peripheral));
      peripherals.set(peripheral.id, peripheral);
      this.setState({ peripherals })
    }
  }

  test(peripheral) {  //连接
    if (peripheral){
      if (peripheral.connected){
        BleManager.disconnect(peripheral.id);
      }else{
        BleManager.connect(peripheral.id).then(() => {
          let peripherals = this.state.peripherals;
          let p = peripherals.get(peripheral.id);
          if (p) {
            p.connected = true;
            peripherals.set(peripheral.id, p);
            this.setState({peripherals});
          }
          Alert.alert('Connected to ',JSON.stringify(peripheral));
          this.setTimeout(() => {

            BleManager.retrieveServices(peripheral.id).then((peripheralData) => {
              Alert.alert('Retrieved peripheral services', JSON.stringify(peripheralData));

              BleManager.readRSSI(peripheral.id).then((rssi) => {
                Alert.alert('Retrieved actual RSSI value', JSON.stringify(rssi));
              });
            });


            /*            
            BleManager.retrieveServices(peripheral.id).then((peripheralInfo) => {
              BleManager.startNotification(peripheral.id, '00035B03-58E6-07DD-021A-08123A000300', '00035B03-58E6-07DD-021A-08123A000301').then(() => {
                Alert.alert('Started notification on ' + peripheral.id);
                this.setTimeout(() => {

                }, 500);
              }).catch((error) => {
                Alert.alert('Notification error', error);
                reject(error);
              });
            });
            ;*/

          }, 900);
        }).catch((error) => {
          Alert.alert('Connection error', JSON.stringify(error));
        });
      }
    }
  }

  render() {
    const list = Array.from(this.state.peripherals.values());
    const dataSource = ds.cloneWithRows(list);


    return (
      <View style={styles.container}>
        <TouchableHighlight style={{marginTop: 40,margin: 20, padding:20, backgroundColor:'#ccc'}} onPress={() => this.startScan() }>
          <Text>Scan Bluetooth ({this.state.scanning ? '正在搜索' : '搜索'})</Text>
        </TouchableHighlight>
        <ScrollView style={styles.scroll}>
          {(list.length == 0) &&
            <View style={{flex:1, margin: 20}}>
              <Text style={{textAlign: 'center'}}>No peripherals</Text>
            </View>
          }
          <ListView
            enableEmptySections={true}
            dataSource={dataSource}
            renderRow={(item) => {
              const color = item.connected ? 'green' : '#fff';
              return (
                <TouchableHighlight onPress={() => this.test(item) }>
                  <View style={[styles.row, {backgroundColor: color}]}>
                    <Text style={{fontSize: 12, textAlign: 'center', color: '#333333', padding: 10}}>{item.name}</Text>
                    <Text style={{fontSize: 8, textAlign: 'center', color: '#333333', padding: 10}}>{item.id}</Text>
                  </View>
                </TouchableHighlight>
              );
            }}
          />
        </ScrollView>
      </View>
    );
  }
}
reactMixin(App.prototype, TimerMixin);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    width: window.width,
    height: window.height
  },
  scroll: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    margin: 10,
  },
  row: {
    margin: 10
  },
});
