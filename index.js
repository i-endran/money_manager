/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import App from './App';
import { name as appName } from './app.json';

Ionicons.loadFont();
MaterialIcons.loadFont();

AppRegistry.registerComponent(appName, () => App);
