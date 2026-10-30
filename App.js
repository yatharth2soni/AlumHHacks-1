import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { demoDevices, demoNotices, GinjerClient, hasCoordinates } from './src/api';

const C = {
  green: '#8AAD41', greenDark: '#5F8523', greenPale: '#F2F7EA', ink: '#262930', darkGrey: '#393B42',
  muted: '#7F8782', line: '#E6E9E5', canvas: '#FAFAF9', white: '#FFFFFF', red: '#EF5533', redPale: '#FDEEEB',
  amber: '#E8A32A', amberPale: '#FFF7E8', blue: '#3598C4', bluePale: '#EBF5F9',
  cardBg: '#FFFFFF', cardBorder: '#EDEDEC', inputBorder: '#D8DCD7',
};
const DEVICE_IMAGES = {
  snow: require('./assets/reference/device-cold-chain.png'),
  water: require('./assets/reference/device-level-sensor.png'),
  controller: require('./assets/reference/device-controller.png'),
  alert: require('./assets/reference/device-panic-button.png'),
  air: require('./assets/reference/device-air-quality.png'),
  busylight: require('./assets/reference/device-busylight.png'),
  tektelic: require('./assets/reference/device-tektelic.png'),
  agriculture: require('./assets/reference/device-agriculture.png'),
};
const NOTICE_IMAGES = {
  'notice-fill-critical': require('./assets/reference/notice-fill-critical.png'),
  'notice-fill-warning': require('./assets/reference/notice-fill-warning.png'),
  'notice-sos': require('./assets/reference/notice-sos.png'),
  'notice-safe': require('./assets/reference/notice-safe.png'),
  'notice-water-critical': require('./assets/reference/notice-water-critical.png'),
  'notice-water-safe': require('./assets/reference/notice-water-safe.png'),
  'notice-light': require('./assets/reference/notice-light.png'),
};
const GOOGLE_MAPS_LIGHT_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#525b54' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eef3ea' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#5d675f' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#dcedd8' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#4b7554' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#fedda0' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e7c588' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#808982' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c7e5f5' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#688d9e' }] },
];

const DEMO_PROFILE = { name: 'Shaheen Ansari', email: 'shaheenansari2519cs@gmail.com', primaryPhone: '', secondaryPhone: '', organization: 'SenRa IoT' };
const POPULAR_PLACES = {
  delhi: { latitude: 28.6139, longitude: 77.2090, name: 'Delhi, India' },
  'new delhi': { latitude: 28.6139, longitude: 77.2090, name: 'New Delhi, India' },
  mumbai: { latitude: 19.0760, longitude: 72.8777, name: 'Mumbai, Maharashtra' },
  jaipur: { latitude: 26.9124, longitude: 75.7873, name: 'Jaipur, Rajasthan' },
  bangalore: { latitude: 12.9716, longitude: 77.5946, name: 'Bengaluru, Karnataka' },
  bengaluru: { latitude: 12.9716, longitude: 77.5946, name: 'Bengaluru, Karnataka' },
  hyderabad: { latitude: 17.3850, longitude: 78.4867, name: 'Hyderabad, Telangana' },
  chennai: { latitude: 13.0827, longitude: 80.2707, name: 'Chennai, Tamil Nadu' },
  kolkata: { latitude: 22.5726, longitude: 88.3639, name: 'Kolkata, West Bengal' },
  pune: { latitude: 18.5204, longitude: 73.8567, name: 'Pune, Maharashtra' },
  ahmedabad: { latitude: 23.0225, longitude: 72.5714, name: 'Ahmedabad, Gujarat' },
  lucknow: { latitude: 26.8467, longitude: 80.9462, name: 'Lucknow, Uttar Pradesh' },
  chandigarh: { latitude: 30.7333, longitude: 76.7794, name: 'Chandigarh, India' },
  indore: { latitude: 22.7196, longitude: 75.8577, name: 'Indore, Madhya Pradesh' },
  bhopal: { latitude: 23.2599, longitude: 77.4126, name: 'Bhopal, Madhya Pradesh' },
  noida: { latitude: 28.5355, longitude: 77.3910, name: 'Noida, Uttar Pradesh' },
  gurgaon: { latitude: 28.4595, longitude: 77.0266, name: 'Gurgaon, Haryana' },
  gurugram: { latitude: 28.4595, longitude: 77.0266, name: 'Gurugram, Haryana' },
};



const QUICK_COMMANDS = [
  { label: 'Turn ON',    icon: 'power',               value: { action: 'on' },        color: '#82AE25' },
  { label: 'Turn OFF',   icon: 'power-off',            value: { action: 'off' },       color: '#E9685E' },
  { label: 'Ping',       icon: 'access-point-check',   value: { action: 'ping' },      color: '#38A1C5' },
  { label: 'Reset',      icon: 'restart',              value: { action: 'reset' },     color: '#E5AE37' },
  { label: 'Buzzer ON',  icon: 'volume-high',          value: { action: 'buzzer_on' }, color: '#E5AE37' },
  { label: 'Buzzer OFF', icon: 'volume-off',           value: { action: 'buzzer_off'}, color: '#858D87' },
];

const DEMO_AUTOMATION_RULES = [
  { id: 'r1', name: 'High Fill Alert → Notify', trigger: 'Level > 85%',     action: 'Push notification', active: true,  icon: 'water-alert', color: '#38A1C5' },
  { id: 'r2', name: 'Low Battery → Reset',      trigger: 'Battery < 15%',   action: 'Send Downlink: reset', active: true, icon: 'battery-alert', color: '#E5AE37' },
  { id: 'r3', name: 'Device Offline > 1hr',     trigger: 'No heartbeat 1h', action: 'Banner Alert',      active: false, icon: 'wifi-off',     color: '#E9685E' },
  { id: 'r4', name: 'SOS Button Pressed',       trigger: 'Alert payload',   action: 'Notify + Log',      active: true,  icon: 'alarm-light',  color: '#E9685E' },
];

const DEMO_SCHEDULES = [
  { id: 's1', name: 'Daily Ping All', time: '08:00 AM', repeat: 'Every day',   icon: 'clock-outline',    color: '#38A1C5' },
  { id: 's2', name: 'Night Buzzer OFF', time: '11:00 PM', repeat: 'Mon–Fri',   icon: 'volume-off',       color: '#858D87' },
];

function IconButton({ name, onPress, label, style, color = C.muted, size = 21 }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={[styles.iconButton, style]}><Icon name={name} size={size} color={color} /></Pressable>;
}

function ProfileAvatar({ uri, onEditPress, size = 82, style }) {
  const radius = size / 2;
  return (
    <View style={[styles.avatarWrap, { width: size, height: size }, style]}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: radius }]}>
        {uri ? <Image source={{ uri }} resizeMode="cover" style={styles.avatarImage} /> : <Icon name="account-outline" size={Math.round(size * 0.42)} color={C.greenDark} />}
      </View>
      {onEditPress ? <Pressable accessibilityRole="button" accessibilityLabel="Edit profile photo" onPress={onEditPress} hitSlop={12} style={styles.editPhotoButton}>
        <Icon name="pencil" size={15} color={C.white} />
      </Pressable> : null}
    </View>
  );
}

function ProfileMenuRow({ icon, title, value, onPress, last = false }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={value ? `${title}: ${value}` : title} onPress={onPress} style={[styles.menuRow, last && styles.menuRowLast]}>
    <View style={styles.menuIconSlot}><Icon name={icon} size={21} color={C.greenDark} /></View>
    <View style={styles.menuCopy}>
      <Text numberOfLines={1} style={styles.menuTitle}>{title}</Text>
      {value ? <Text numberOfLines={1} ellipsizeMode="tail" style={styles.menuValue}>{value}</Text> : null}
    </View>
    <Icon name="chevron-right" size={19} color="#A8ADA9" />
  </Pressable>;
}

function ProfileField({ label, value, onChangeText, icon, keyboardType, autoCapitalize, onPress, editable = true }) {
  return <View style={styles.profileFieldGroup}>
    <Text style={styles.profileFieldLabel}>{label}</Text>
    <Pressable disabled={!onPress} onPress={onPress} style={styles.profileField}>
      <Icon name={icon} size={20} color={C.greenDark} />
      <TextInput value={value} onChangeText={onChangeText} editable={editable} keyboardType={keyboardType} autoCapitalize={autoCapitalize} autoCorrect={false} style={styles.profileFieldInput} placeholder={label} placeholderTextColor="#9EA39F" accessibilityLabel={label} />
      {onPress ? <Icon name="chevron-down" size={19} color={C.muted} /> : null}
    </Pressable>
  </View>;
}

function ScreenHeader({ title, onBack, right }) {
  return <View style={styles.pageHeader}>
    <IconButton name="arrow-left" label="Back" onPress={onBack} color={C.ink} />
    <Text numberOfLines={1} style={styles.pageTitle}>{title}</Text>
    <View style={styles.pageRight}>{right || null}</View>
  </View>;
}

function SearchField({ value, onChangeText, placeholder = 'Search devices', style, onSubmitEditing }) {
  return <View style={[styles.searchField, style]}>
    <Icon name="magnify" size={20} color={C.muted} />
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#A0A6A1" style={styles.searchInput} returnKeyType="search" accessibilityLabel={placeholder} onSubmitEditing={onSubmitEditing} />
    {value ? (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={onSubmitEditing} style={{ paddingHorizontal: 6 }} hitSlop={6} accessibilityLabel="Search">
          <Icon name="arrow-right-circle" size={20} color={C.greenDark} />
        </Pressable>
        <IconButton name="close-circle" label="Clear search" size={18} onPress={() => onChangeText('')} />
      </View>
    ) : null}
  </View>;
}

function StatusChip({ label, status }) {
  const colors = status === 'red' ? [C.redPale, C.red] : status === 'amber' ? [C.amberPale, '#A87917'] : status === 'blue' ? [C.bluePale, C.blue] : [C.greenPale, C.greenDark];
  return <View style={[styles.statusChip, { backgroundColor: colors[0] }]}><Text numberOfLines={1} style={[styles.statusChipText, { color: colors[1] }]}>{label}</Text></View>;
}

function DeviceThumb({ kind, size = 54 }) {
  const image = DEVICE_IMAGES[kind] || DEVICE_IMAGES.controller;
  return <View style={[styles.deviceThumb, { width: size, height: size }]}><Image source={image} resizeMode="contain" style={{ width: size - 7, height: size - 7 }} /></View>;
}

function DeviceCard({ device, onPress }) {
  const statusColor = device.chips?.[0]?.status === 'red' ? C.red : device.chips?.[0]?.status === 'amber' ? C.amber : C.green;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${device.name}, ${device.loc}. Open details`} onPress={onPress} style={({ pressed }) => [styles.deviceCard, pressed && styles.pressed]}>
    <DeviceThumb kind={device.kind} />
    <View style={styles.deviceCardBody}>
      <Text numberOfLines={1} style={styles.deviceName}>{device.name}</Text>
      <Text numberOfLines={1} style={styles.deviceId}>{device.id || device.devEui || 'ID unavailable'}</Text>
      <Text numberOfLines={1} style={styles.deviceLocation}><Icon name="map-marker-outline" size={12} color={C.muted} /> {device.loc}</Text>
      <View style={styles.chipRow}>{device.chips?.slice(0, 2).map((chip, index) => <StatusChip key={`${chip.label}-${index}`} {...chip} />)}</View>
    </View>
    <View style={styles.deviceCardMeta}>
      <View style={[styles.onlineDot, { backgroundColor: statusColor }]} />
      <Text style={styles.lastLabel}>Last heard</Text>
      <Text numberOfLines={2} style={styles.lastTime}>{device.heard || 'Unknown'}</Text>
      <Icon name="chevron-right" color={C.green} size={21} style={{ marginTop: 5 }} />
    </View>
  </Pressable>;
}


function DeviceCardCompact({ device, onPress }) {
  const statusColor = device.chips?.[0]?.status === 'red' ? C.red : device.chips?.[0]?.status === 'amber' ? C.amber : C.green;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={device.name} onPress={onPress} style={({ pressed }) => [styles.deviceCardCompact, pressed && styles.pressed]}>
      <View style={[styles.compactDot, { backgroundColor: statusColor }]} />
      <DeviceThumb kind={device.kind} size={34} />
      <Text numberOfLines={1} style={[styles.deviceName, { flex: 1, fontSize: 13, marginLeft: 6 }]}>{device.name}</Text>
      <StatusChip label={device.chips?.[0]?.label || 'OK'} status={device.chips?.[0]?.status || 'green'} />
      <Icon name="chevron-right" color={C.green} size={18} />
    </Pressable>
  );
}

function BottomTabs({ current, onChange }) {
  const items = [
    ['devices', 'Devices', 'view-dashboard-outline'],
    ['locations', 'Locations', 'map-outline'],
    ['automation', 'Automation', 'robot-outline'],
    ['profile', 'Profile', 'account-outline'],
  ];
  return (
    <View style={styles.bottomTabs}>
      {items.map(([id, label, icon]) => {
        const active = current === id;
        return (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${label} tab`}
            onPress={() => onChange(id)}
            hitSlop={8}
            style={({ pressed }) => [styles.tabButton, pressed && styles.tabButtonPressed]}
          >
            <Icon name={icon} size={23} color={active ? C.greenDark : '#9BA19D'} pointerEvents="none" />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]} pointerEvents="none">{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ActionButton({ title, onPress, secondary = false, disabled = false, style }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [secondary ? styles.secondaryButton : styles.primaryButton, disabled && styles.disabledButton, pressed && !disabled && styles.pressed, style]}>
    <Text style={[secondary ? styles.secondaryButtonText : styles.primaryButtonText, disabled && { color: '#A3AAA3' }]}>{title}</Text>
  </Pressable>;
}

function StatCard({ label, value, icon, tint = C.green }) {
  return <View style={styles.statCard}><View style={[styles.statIcon, { backgroundColor: `${tint}18` }]}><Icon name={icon} size={19} color={tint} /></View><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function Sheet({ visible, title, subtitle, onClose, children, actions }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
    <Pressable style={styles.modalScrim} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={event => event.stopPropagation()}>
        <View style={styles.sheetGrabber} />
        <Text style={styles.sheetTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sheetSubtitle}>{subtitle}</Text> : null}
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.sheetContent}>{children}</ScrollView>
        {actions ? <View style={styles.sheetActions}>{actions}</View> : null}
      </Pressable>
    </Pressable>
  </Modal>;
}

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

function AppContent() {
  const [serverInput, setServerInput] = useState('http://172.22.64.81:8787');
  const [serverUrl, setServerUrl] = useState('');
  const [connectedToBackend, setConnectedToBackend] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [route, setRoute] = useState('setup');
  const [tab, setTab] = useState('devices');
  const [previousRoute, setPreviousRoute] = useState('devices');
  const [modal, setModal] = useState(null);
  const [loginMode, setLoginMode] = useState('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [devices, setDevices] = useState(demoDevices);
  const [organisations, setOrganisations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [activeOrganisation, setActiveOrganisation] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [profile, setProfile] = useState(DEMO_PROFILE);
  const [profileDraft, setProfileDraft] = useState(DEMO_PROFILE);
  const [profilePhotoUri, setProfilePhotoUri] = useState(null);
  const [profilePhotoDraftUri, setProfilePhotoDraftUri] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(demoDevices[1]);
  const [selectedMapDevice, setSelectedMapDevice] = useState(null);
  const [selectedCustomLocation, setSelectedCustomLocation] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [noticeFilter, setNoticeFilter] = useState('all');
  const [expanded, setExpanded] = useState(false);
  const [toast, setToast] = useState('');
  const [downlinkValue, setDownlinkValue] = useState('{}');
  const [downlinkModule, setDownlinkModule] = useState('');
  const [deviceView, setDeviceView] = useState('expanded');
  const [bannerNotice, setBannerNotice] = useState(null);
  const [downlinkSending, setDownlinkSending] = useState(false);
  const [downlinkSent, setDownlinkSent] = useState(false);
  const [downlinkResultMsg, setDownlinkResultMsg] = useState('Command Dispatched!');
  const [autoRules, setAutoRules] = useState(DEMO_AUTOMATION_RULES.map(r => ({ ...r })));
  const [organizationQuery, setOrganizationQuery] = useState('');
  const [ginjerEnv, setGinjerEnv] = useState('dev');
  const sendAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef(null);
  const client = useMemo(() => serverUrl ? new GinjerClient(serverUrl, ginjerEnv) : null, [serverUrl, ginjerEnv]);
  const isConnected = connectedToBackend && !demoMode;
  const hasTabs = ['devices', 'locations', 'automation', 'profile', 'analytics'].includes(route);
  const positionableDevices = useMemo(() => {
    const withCoords = devices.filter(hasCoordinates);
    if (isConnected) return withCoords;
    return withCoords.length > 0 ? withCoords : demoDevices.filter(hasCoordinates);
  }, [devices, isConnected]);
  const isFallbackDemo = !isConnected && demoMode;
  const showToast = useCallback(message => {
    setToast(message);
    setTimeout(() => setToast(''), 2500);
  }, []);

  const showCurrentLocation = useCallback(async () => {
    if (locating) return;
    setLocating(true);
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        showToast(permission.canAskAgain ? 'Allow location access to show your position on the map.' : 'Enable location permission for Alumhacks in your phone settings.');
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        showToast('Turn on your phone’s location service and try again.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coordinate = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCurrentLocation(coordinate);
      mapRef.current?.animateToRegion({ ...coordinate, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 650);
      showToast('Showing your current location.');
    } catch {
      showToast('Could not get your location. Check that location services are enabled.');
    } finally {
      setLocating(false);
    }
  }, [locating, showToast]);

  const handleMapPress = useCallback(async e => {
    const coordinate = e.nativeEvent?.coordinate;
    if (!coordinate) return;
    setSelectedMapDevice(null);
    const fallbackName = `${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`;
    setSelectedCustomLocation({ latitude: coordinate.latitude, longitude: coordinate.longitude, placeName: fallbackName });
    try {
      const places = await Location.reverseGeocodeAsync(coordinate);
      if (places && places.length > 0) {
        const p = places[0];
        const label = [p.name || p.street, p.city || p.district || p.subregion, p.region || p.country].filter(Boolean).join(', ');
        if (label) setSelectedCustomLocation({ latitude: coordinate.latitude, longitude: coordinate.longitude, placeName: label });
      }
    } catch {}
  }, []);

  const handleSearchSubmit = useCallback(async () => {
    const q = (query || '').trim();
    if (!q) return;
    const match = positionableDevices.find(d => `${d.name} ${d.id} ${d.loc}`.toLowerCase().includes(q.toLowerCase()));
    if (match && hasCoordinates(match)) {
      if (isFallbackDemo) {
        showToast('Sample placeholder only. No live device is connected at this location.');
        return;
      }
      const coord = { latitude: Number(match.position.lat), longitude: Number(match.position.lng) };
      setSelectedMapDevice(match);
      setSelectedCustomLocation(null);
      mapRef.current?.animateToRegion({ ...coord, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 500);
      showToast(`Found device: ${match.name}`);
      return;
    }
    const key = q.toLowerCase();
    if (POPULAR_PLACES[key]) {
      const loc = POPULAR_PLACES[key];
      const coord = { latitude: loc.latitude, longitude: loc.longitude };
      setSelectedCustomLocation({ ...coord, placeName: loc.name });
      setSelectedMapDevice(null);
      mapRef.current?.animateToRegion({ ...coord, latitudeDelta: 0.15, longitudeDelta: 0.15 }, 500);
      showToast(`Selected: ${loc.name}`);
      return;
    }
    try {
      const results = await Location.geocodeAsync(q);
      if (results && results.length > 0) {
        const first = results[0];
        const coord = { latitude: first.latitude, longitude: first.longitude };
        setSelectedCustomLocation({ ...coord, placeName: q });
        setSelectedMapDevice(null);
        mapRef.current?.animateToRegion({ ...coord, latitudeDelta: 0.12, longitudeDelta: 0.12 }, 500);
        showToast(`Selected: ${q}`);
        return;
      }
    } catch {}
    showToast(`No location found for "${q}".`);
  }, [query, positionableDevices, isFallbackDemo, showToast]);


  const openDownlinkModal = useCallback(() => {
    setDownlinkValue('{}');
    setDownlinkResultMsg('Command Dispatched!');
    const dlMods = modules.filter(m => m.moduleType === 'DOWNLINK_INTERFACE' || /downlink/i.test(m.label || '') || /downlink/i.test(m.moduleType || ''));
    const chosen = dlMods[0] || modules.find(m => m.moduleType === 'DOWNLINK_INTERFACE') || modules[0];
    setDownlinkModule(chosen?._id || '');
    setModal('downlink');
  }, [modules]);

  const sendQuickDownlink = useCallback(async (cmd) => {
    const effectiveModuleId = downlinkModule ||
      modules.find(m => m.moduleType === 'DOWNLINK_INTERFACE')?._id ||
      modules.find(m => /downlink/i.test(m.label || '') || /downlink/i.test(m.moduleType || ''))?._id ||
      modules[0]?._id;

    if (isConnected && !effectiveModuleId) {
      showToast('No Downlink Interface module configured in this organization.');
      return;
    }

    if (isConnected && (!selectedDevice?.apiId && !selectedDevice?._id)) {
      showToast('Selected device does not have a valid Ginjer ID.');
      return;
    }

    setDownlinkSending(true);
    setDownlinkSent(false);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sendAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(sendAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    );
    loop.start();
    try {
      if (isConnected && client && (selectedDevice?.apiId || selectedDevice?._id)) {
        const resp = await client.sendDownlink(activeOrganisation, selectedDevice, effectiveModuleId, cmd.value);
        const msg = resp?.sendDownlink?.message || 'Command Dispatched!';
        setDownlinkResultMsg(msg);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setDownlinkResultMsg('Command Dispatched (Demo)');
      }
      loop.stop();
      sendAnim.setValue(0);
      setDownlinkSending(false);
      setDownlinkSent(true);
      setTimeout(() => { setDownlinkSent(false); setModal(null); }, 1500);
    } catch (error) {
      loop.stop();
      sendAnim.setValue(0);
      setDownlinkSending(false);
      showToast(error.message || 'Downlink failed.');
    }
  }, [isConnected, client, selectedDevice, activeOrganisation, downlinkModule, modules, sendAnim, showToast]);

  const pickImage = useCallback(async () => {
    try {
      let permission = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!permission.granted) permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast('Allow photo access to choose a profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setProfilePhotoDraftUri(result.assets[0].uri);
      showToast('Photo selected. Save your profile to apply it.');
    } catch {
      showToast('Could not open the photo library. Please try again.');
    }
  }, [showToast]);

  const changeTab = useCallback(nextTab => {
    setTab(nextTab);
    setRoute(nextTab);
    setQuery('');
    setSelectedMapDevice(null);
    setSelectedCustomLocation(null);
    setExpanded(false);
    setModal(null);
  }, []);

  const goToDevice = useCallback((device, from = route) => {
    setPreviousRoute(from); setSelectedDevice(device); setExpanded(false); setRoute('detail');
  }, [route]);

  const beginProfileEdit = () => {
    const cur = profile || DEMO_PROFILE;
    setProfileDraft({ ...cur, organization: activeOrganisation?.name || cur.organization || (isConnected ? 'My Organization' : 'SenRa IoT') });
    setProfilePhotoDraftUri(profilePhotoUri);
    setRoute('edit');
  };

  const saveProfile = () => {
    setProfile(profileDraft);
    setProfilePhotoUri(profilePhotoDraftUri);
    setRoute('profile');
    showToast(isConnected ? 'Profile saved for this session. Ginjer does not provide a profile update API.' : 'Profile saved for this preview session.');
  };

  const back = useCallback(() => {
    if (modal) { setModal(null); return true; }
    if (route === 'detail' || route === 'notifications' || route === 'map') {
      setRoute(route === 'detail' ? previousRoute : route === 'map' ? previousRoute : previousRoute);
      return true;
    }
    if (route === 'edit') { setRoute('profile'); return true; }
    if (route === 'setup') return false;
    setRoute(tab);
    return true;
  }, [modal, route, previousRoute, tab]);

  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', back);
    return () => listener.remove();
  }, [back]);

  // 20-second automatic polling for live Ginjer updates
  useEffect(() => {
    if (!isConnected || !activeOrganisation || !activeProject) return;
    const interval = setInterval(() => {
      refresh({ silent: true });
    }, 20000);
    return () => clearInterval(interval);
  }, [isConnected, activeOrganisation, activeProject, refresh]);

  useEffect(() => {
    if (route !== 'map' || positionableDevices.length === 0) return;
    const timer = setTimeout(() => {
      const coords = selectedMapDevice && hasCoordinates(selectedMapDevice)
        ? [{ latitude: Number(selectedMapDevice.position.lat), longitude: Number(selectedMapDevice.position.lng) }]
        : positionableDevices.map(device => ({ latitude: Number(device.position.lat), longitude: Number(device.position.lng) }));
      if (coords.length === 1) mapRef.current?.animateToRegion({ ...coords[0], latitudeDelta: 0.08, longitudeDelta: 0.08 }, 350);
      else mapRef.current?.fitToCoordinates(coords, { edgePadding: { top: 120, right: 55, bottom: 160, left: 55 }, animated: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [route, positionableDevices, selectedMapDevice]);

  useEffect(() => {
    if (isConnected) {
      const criticalDev = devices.find(d => d.chips?.some(c => c.status === 'red') || d.status === 'inactive');
      if (criticalDev) {
        const redChip = criticalDev.chips?.find(c => c.status === 'red');
        setBannerNotice({
          id: criticalDev.id,
          deviceId: criticalDev.id,
          title: `Alert: ${criticalDev.name}`,
          where: criticalDev.loc || criticalDev.name,
          desc: redChip?.label || 'Attention required',
          color: 'red',
          device: criticalDev.name,
        });
      } else {
        setBannerNotice(null);
      }
    } else if (demoMode) {
      const critical = demoNotices.find(n => n.color === 'red');
      if (critical) setBannerNotice(critical);
    } else {
      setBannerNotice(null);
    }
  }, [isConnected, demoMode, devices]);

  const checkServer = async () => {
    const candidate = serverInput.trim().replace(/[./]+$/, '');
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== 'http:' || !parsed.port || parsed.pathname !== '/') throw new Error('Enter the full local URL, including :8787.');
      setLoading(true); setSetupError('');
      const response = await fetch(`${candidate}/api/status`);
      if (!response.ok) throw new Error(`Backend returned HTTP ${response.status}.`);
      setServerUrl(candidate); setConnectedToBackend(true); setRoute('login');
    } catch (error) {
      setSetupError(error.message === 'Failed to fetch' ? 'Could not reach the backend. Check the URL, Wi-Fi, and firewall.' : (error.message || 'Could not reach the backend.'));
    } finally { setLoading(false); }
  };

  const loadProject = async (organisation, project, clientOverride = client) => {
    const result = await clientOverride.getProjectData(organisation, project);
    setActiveOrganisation(organisation); setActiveProject(project); setOrganisations(current => current.length ? current : [organisation]);
    setDevices(result.devices); setModules(result.modules); setSelectedDevice(result.devices[0] || null);
    if (result.devices.length > 0) {
      const dynamicRules = result.devices.slice(0, 4).map((d, i) => ({
        id: `r-${d.id || i}`,
        name: `${d.name} Alert Monitor`,
        trigger: d.chips?.[0]?.label ? `${d.chips[0].label.split(':')[0]} alert` : 'Threshold alert',
        action: 'Push notification',
        active: true,
        icon: d.kind === 'water' ? 'water-alert' : 'robot-outline',
        color: '#38A1C5',
      }));
      setAutoRules(dynamicRules);
    } else {
      setAutoRules([]);
    }
    setDemoMode(false); setTab('devices'); setRoute('devices'); setQuery(''); setLoginError(''); setModal(null);
    setProfile(current => ({ ...current, email: current.email || 'Connected with API token' }));
    if (result.errors.length) showToast(result.errors.join(' '));
    if (!result.devices.length) showToast('No devices were returned for this project.');
    else showToast('Project data loaded from Ginjer.');
  };

  const loadOrganisation = async (organisation, clientOverride = client) => {
    setLoading(true);
    try {
      const orgProjects = await clientOverride.getProjects(organisation);
      if (!orgProjects.length) throw new Error(`No projects were returned for ${organisation.name || 'this organization'}.`);
      setOrganisations(current => current.length ? current : [organisation]);
      setProjects(orgProjects); setActiveOrganisation(organisation);
      const first = orgProjects.find(project => project.active !== false) || orgProjects[0];
      await loadProject(organisation, first, clientOverride);
    } finally { setLoading(false); }
  };

  const loadAccountData = async (clientOverride, defaultId = '', userOrgDetails = null) => {
    let orgs = [];
    try {
      orgs = await clientOverride.getOrganisations(defaultId);
    } catch (e) {
      console.warn('Failed to get organisations:', e);
    }
    if (!orgs.length && defaultId) {
      orgs = [{ organisationId: defaultId, name: userOrgDetails?.name || 'My Organization', isActive: true, isAccepted: true }];
    }
    if (!orgs.length) throw new Error('No accepted organizations were returned for this account.');
    setOrganisations(orgs);

    const preferredOrg = (defaultId && orgs.find(o => o.organisationId === defaultId)) || orgs[0];
    const orderedOrgs = [preferredOrg, ...orgs.filter(o => o.organisationId !== preferredOrg.organisationId)];

    for (const organisation of orderedOrgs) {
      try {
        const orgProjects = await clientOverride.getProjects(organisation);
        if (orgProjects.length > 0) {
          setProjects(orgProjects);
          setActiveOrganisation(organisation);
          const project = orgProjects.find(item => item.active !== false) || orgProjects[0];
          await loadProject(organisation, project, clientOverride);
          return;
        }
      } catch (err) {
        console.warn('Error fetching projects for org:', err);
      }
    }

    // If no projects in any organization, still successfully log user in
    setActiveOrganisation(preferredOrg);
    setProjects([]);
    setActiveProject({ _id: 'none', name: 'No Projects' });
    setDevices([]);
    setModules([]);
    setDemoMode(false);
    setRoute('devices');
    setTab('devices');
    setLoginError('');
    showToast('Signed in. No projects found for this organization.');
  };

  const submitLogin = async () => {
    if (!client) { setLoginError('Connect to the computer backend first.'); return; }
    setLoading(true); setLoginError('');
    try {
      let authToken = token.trim().replace(/^Bearer\s+/i, '');
      if (loginMode === 'password') {
        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password.trim();
        const data = await client.signIn(cleanEmail, cleanPassword);
        const user = data.signIn;
        if (!user?.token) throw new Error('Sign-in returned no token. Check your Ginjer credentials.');
        authToken = user.token;
        const orgName = user.organisationDetails?.name || '';
        const userProfile = {
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || cleanEmail.split('@')[0] || 'Ginjer User',
          email: user.emailId || cleanEmail,
          primaryPhone: '',
          secondaryPhone: '',
          organization: orgName || 'My Organization',
        };
        setProfile(userProfile);
        setProfileDraft(userProfile);
        const defaultId = (typeof user.defaultAccount === 'string' ? user.defaultAccount : user.defaultAccount?.organisationId) || user.organisationId;
        await client.saveToken(authToken);
        await loadAccountData(client, defaultId, user.organisationDetails);
      } else {
        if (!authToken) throw new Error('Paste the token value from your Postman environment.');
        await client.saveToken(authToken);
        setProfile(current => ({ ...current, name: current.name || 'Ginjer user', email: current.email || 'Connected with API token' }));
        await loadAccountData(client);
      }
    } catch (error) {
      await client.clearToken();
      let msg = error.message || 'Could not connect to Ginjer.';
      if (/user details not found/i.test(msg)) {
        msg = 'No user found with this email. Please verify your Ginjer email address.';
      } else if (/invalid password/i.test(msg)) {
        msg = 'Incorrect password. Please verify your password and try again.';
      }
      setLoginError(msg);
    } finally { setLoading(false); }
  };

  const disconnect = async () => {
    await client?.clearToken();
    setDemoMode(true); setDevices(demoDevices); setSelectedDevice(demoDevices[1]);
    setOrganisations([]); setProjects([]); setModules([]); setActiveOrganisation(null); setActiveProject(null);
    setProfile(DEMO_PROFILE); setProfileDraft(DEMO_PROFILE); setProfilePhotoUri(null); setProfilePhotoDraftUri(null); setRoute('login'); setTab('devices'); setModal(null); showToast('Signed out.');
  };

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!client || !activeOrganisation || !activeProject) return;
    if (!silent) setRefreshing(true);
    try {
      const result = await client.getProjectData(activeOrganisation, activeProject);
      setDevices(result.devices);
      setModules(result.modules);
      if (selectedDevice?.apiId) {
        const updated = result.devices.find(d => d.apiId === selectedDevice.apiId);
        if (updated) setSelectedDevice(updated);
      }
      if (!silent) showToast('Data refreshed live from Ginjer.');
    } catch (error) {
      if (!silent) showToast(`Refresh failed: ${error.message}`);
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, [client, activeOrganisation, activeProject, selectedDevice, showToast]);

  const chooseOrganisation = async organisation => {
    try { await loadOrganisation(organisation); }
    catch (error) { showToast(error.message); setModal('organisations'); }
  };

  const chooseProject = async project => {
    setLoading(true);
    try { await loadProject(activeOrganisation, project); }
    catch (error) { showToast(error.message); }
    finally { setLoading(false); }
  };

  const openFullMap = (from = route, device = null) => {
    setPreviousRoute(from); setSelectedMapDevice(device); setRoute('map');
  };

  const filteredDevices = useMemo(() => devices.filter(device => {
    const matchesQuery = !query || `${device.name} ${device.id} ${device.loc} ${device.chips?.map(chip => chip.label).join(' ')}`.toLowerCase().includes(query.toLowerCase());
    const needsAttention = device.chips?.some(chip => ['red', 'amber'].includes(chip.status));
    return matchesQuery && (filter !== 'attention' || needsAttention) && (filter !== 'online' || device.chips?.some(chip => /online|on\b/i.test(chip.label)));
  }), [devices, query, filter]);

  const visibleMarkers = useMemo(() => positionableDevices.filter(device => !query || `${device.name} ${device.id} ${device.loc}`.toLowerCase().includes(query.toLowerCase())), [positionableDevices, query]);

  const showDemo = () => {
    setDemoMode(true); setDevices(demoDevices); setSelectedDevice(demoDevices[1]); setRoute('devices'); setTab('devices'); setLoginError('');
  };

  const onDetailBack = () => {
    if (route === 'detail' && previousRoute === 'map') { setRoute('map'); return; }
    if (route === 'detail' && previousRoute === 'notifications') { setRoute('notifications'); return; }
    if (route === 'notifications') { setRoute(previousRoute || 'devices'); return; }
    if (route === 'map') { setRoute(previousRoute || 'locations'); return; }
    back();
  };

  const renderSetup = () => <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor={C.canvas} />
    <KeyboardAvoidingView style={styles.centerPage} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.setupPanel}>
        <Text style={styles.kicker}>ALUMHACKS MOBILE</Text>
        <Text style={styles.screenHeading}>Connect to your computer</Text>
        <Text style={styles.bodyCopy}>Start the Alumhacks backend on your computer. Enter its “Phone on the same Wi-Fi” address here.</Text>
        <TextInput value={serverInput} onChangeText={setServerInput} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="http://172.22.64.81:8787" placeholderTextColor="#A0A6A1" style={styles.textInput} onSubmitEditing={checkServer} accessibilityLabel="Backend server URL" />
        {setupError ? <Text style={styles.errorText}>{setupError}</Text> : null}
        <ActionButton title={loading ? 'Connecting…' : 'Open Alumhacks'} disabled={loading} onPress={checkServer} />
        <Text style={styles.footnote}>Keep your phone and computer on the same trusted Wi-Fi network.</Text>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;

  const renderLogin = () => <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor={C.white} />
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.loginScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.loginBrand}><Image source={require('./assets/reference/senra-logo.png')} style={styles.ginjerLogo} resizeMode="contain" /></View>
        <Text style={styles.loginTagline}>Monitor and manage your connected devices</Text>
        <Image source={require('./assets/reference/login-illustration.png')} style={styles.loginIllustration} resizeMode="contain" />
        <View style={styles.envSelector}>
          <Pressable hitSlop={6} onPress={() => { setGinjerEnv('dev'); client?.setEnvironment('dev'); setLoginError(''); }} style={({ pressed }) => [styles.envTab, ginjerEnv === 'dev' && styles.envTabActive, pressed && { opacity: 0.8 }]}>
            <Text style={[styles.envTabText, ginjerEnv === 'dev' && styles.envTabTextActive]}>dev.ginjer.io (Dev)</Text>
          </Pressable>
          <Pressable hitSlop={6} onPress={() => { setGinjerEnv('prod'); client?.setEnvironment('prod'); setLoginError(''); }} style={({ pressed }) => [styles.envTab, ginjerEnv === 'prod' && styles.envTabActive, pressed && { opacity: 0.8 }]}>
            <Text style={[styles.envTabText, ginjerEnv === 'prod' && styles.envTabTextActive]}>ginjer.io (Prod)</Text>
          </Pressable>
        </View>
        <View style={styles.authTabs}>
          <Pressable hitSlop={6} onPress={() => { setLoginMode('password'); setLoginError(''); }} style={({ pressed }) => [styles.authTab, loginMode === 'password' && styles.authTabActive, pressed && { opacity: 0.8 }]}><Text style={[styles.authTabText, loginMode === 'password' && styles.authTabTextActive]}>Email and password</Text></Pressable>
          <Pressable hitSlop={6} onPress={() => { setLoginMode('token'); setLoginError(''); }} style={({ pressed }) => [styles.authTab, loginMode === 'token' && styles.authTabActive, pressed && { opacity: 0.8 }]}><Text style={[styles.authTabText, loginMode === 'token' && styles.authTabTextActive]}>API token</Text></Pressable>
        </View>
        {loginMode === 'password' ? <>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" placeholder="Email address" placeholderTextColor="#9EA39F" style={styles.textInput} accessibilityLabel="Email" />
          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Password</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="Password" placeholderTextColor="#9EA39F" style={styles.textInput} accessibilityLabel="Password" />
        </> : <>
          <Text style={styles.fieldLabel}>Ginjer API token</Text>
          <TextInput value={token} onChangeText={setToken} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="Paste your Postman token" placeholderTextColor="#9EA39F" style={styles.textInput} accessibilityLabel="Ginjer API token" />
          <Text style={styles.footnote}>The token is sent to the local backend and held in memory while connected.</Text>
        </>}
        {loginError ? <Text accessibilityRole="alert" style={styles.errorText}>{loginError}</Text> : null}
        <ActionButton title={loading ? 'Connecting…' : 'Connect'} disabled={loading} onPress={submitLogin} style={{ marginTop: 20 }} />
        <Pressable onPress={showDemo} style={styles.textLink}><Text style={styles.linkText}>Preview demo data</Text></Pressable>
        
        <Text style={styles.legalText}>By signing in, you agree to Ginjer's <Text style={styles.legalLinkText}>Terms of Service</Text> and <Text style={styles.legalLinkText}>Privacy Policy</Text>.</Text>
        <Pressable onPress={() => { setRoute('setup'); setConnectedToBackend(false); }} style={styles.changeServer}><Text style={styles.mutedLink}>Change computer connection</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;

  const renderDevices = () => <View style={styles.screen}>
    <View style={styles.listTopBar}>
      <Text style={styles.sectionTitle}>Devices</Text>
      <View style={styles.topActions}>
        <IconButton name={deviceView === 'expanded' ? 'view-list' : 'view-module'} label="Toggle view" onPress={() => setDeviceView(v => v === 'expanded' ? 'compact' : 'expanded')} color={C.ink} />
        <IconButton name="bell-outline" label="Notifications" onPress={() => { setPreviousRoute(route); setRoute('notifications'); }} color={C.ink} />
        <IconButton name="filter-variant" label="Filter devices" onPress={() => setModal('filter')} color={C.ink} />
      </View>
    </View>
    <Pressable style={styles.projectSelector} onPress={() => setModal('projects')} accessibilityRole="button" accessibilityLabel={`Project ${activeProject?.name || (isConnected ? 'No project' : 'SenRa Production')}. Choose project`}>
      <Icon name="view-grid-outline" size={19} color={C.greenDark} />
      <View style={{ flex: 1, marginLeft: 9 }}><Text style={styles.selectorCaption}>PROJECT</Text><Text numberOfLines={1} style={styles.selectorName}>{activeProject?.name || (isConnected ? 'No project' : 'SenRa Production')}</Text></View>
      <Icon name="chevron-down" size={19} color={C.muted} />
    </Pressable>
    <SearchField value={query} onChangeText={setQuery} style={{ marginHorizontal: 16, marginTop: 12 }} />
    <View style={styles.liveBar}>
      <View style={styles.liveIndicator}>
        <View style={[styles.livePulseDot, { backgroundColor: isConnected ? C.green : C.amber }]} />
        <Text style={styles.liveBarText}>
          {isConnected ? `Live Ginjer sync · 20s auto-refresh` : 'Demo preview mode'}
        </Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Sync Ginjer data now" onPress={() => refresh({ silent: false })} hitSlop={10} style={({ pressed }) => [styles.syncButton, pressed && { opacity: 0.6 }]}>
        <Icon name="sync" size={13} color={C.greenDark} />
        <Text style={styles.syncButtonText}>{refreshing ? 'Syncing…' : 'Sync'}</Text>
      </Pressable>
    </View>
    <View style={styles.listSummary}><Text style={styles.summaryText}>{filteredDevices.length} devices</Text><Text style={styles.summaryText}>Updated just now</Text></View>
    <ScrollView
      contentContainerStyle={styles.deviceList}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh({ silent: false })} colors={[C.green]} tintColor={C.green} />}
    >
      {filteredDevices.length ? filteredDevices.map((device, index) => deviceView === 'compact' ? <DeviceCardCompact key={device.apiId || device.id || index} device={device} onPress={() => goToDevice(device)} /> : <DeviceCard key={device.apiId || device.id || index} device={device} onPress={() => goToDevice(device)} />) : <View style={styles.emptyBox}><Icon name="devices" size={28} color="#A4AAA5" /><Text style={styles.emptyText}>{devices.length === 0 ? 'No devices found in this project.' : `No devices match "${query}".`}</Text></View>}
      <Pressable onPress={() => { setPreviousRoute(route); setRoute('notifications'); }} style={styles.notificationsLink}><Icon name="bell-badge-outline" size={17} color={C.greenDark} /><Text style={styles.notificationsLinkText}>View notifications</Text><Icon name="chevron-right" size={18} color={C.muted} /></Pressable>
    </ScrollView>
  </View>;

  const mapSearch = <SearchField value={query} onChangeText={setQuery} onSubmitEditing={handleSearchSubmit} placeholder="Search devices or places (e.g. Jaipur)" style={styles.mapSearch} />;
  const renderMap = full => {
    const selected = full ? selectedMapDevice : null;
    const projectPosition = activeProject?.location;
    const mapDevices = visibleMarkers;
    const coordinates = selected && hasCoordinates(selected)
      ? [{ latitude: Number(selected.position.lat), longitude: Number(selected.position.lng) }]
      : mapDevices
        .map(device => ({ latitude: Number(device.position.lat), longitude: Number(device.position.lng) }));
    const initial = coordinates[0]
      || (hasCoordinates({ position: projectPosition }) ? { latitude: Number(projectPosition.lat), longitude: Number(projectPosition.lng) } : { latitude: 22.9734, longitude: 78.6569 });
    return <View style={styles.mapScreen}>
      <MapView ref={mapRef} key={`${full ? 'full' : 'detail'}-${route}`} style={StyleSheet.absoluteFill} initialRegion={{ ...initial, latitudeDelta: coordinates.length ? 2.5 : 24, longitudeDelta: coordinates.length ? 2.5 : 24 }} showsUserLocation={false} showsCompass userInterfaceStyle="light" customMapStyle={GOOGLE_MAPS_LIGHT_STYLE} onPress={handleMapPress}>
        {mapDevices.map(device => <Marker key={device.apiId || device.id} coordinate={{ latitude: Number(device.position.lat), longitude: Number(device.position.lng) }} title={isFallbackDemo ? `Sample placeholder · ${device.name}` : device.name} description={isFallbackDemo ? 'Example location only · Not a live Ginjer device' : `${device.loc} · Last heard ${device.heard}`} onPress={() => { if (isFallbackDemo) { showToast('Sample placeholder only. No live device is connected at this location.'); return; } setSelectedCustomLocation(null); setSelectedMapDevice(device); if (!full) setSelectedDevice(device); }}>
          <View style={[styles.markerBubble, { backgroundColor: chipColor(device.chips?.[0]?.status) }]}><Icon name={kindIcon(device.kind)} size={17} color={C.white} /></View>
        </Marker>)}
        {selectedCustomLocation ? <Marker coordinate={{ latitude: selectedCustomLocation.latitude, longitude: selectedCustomLocation.longitude }} title={selectedCustomLocation.placeName} description="Selected on map"><View style={[styles.markerBubble, { backgroundColor: C.red }]}><Icon name="map-marker" size={17} color={C.white} /></View></Marker> : null}
        {currentLocation ? <Marker coordinate={currentLocation} title="Your current location" description="Your phone’s location" zIndex={1000} tracksViewChanges={false}>
          <View style={styles.currentLocationMarker}><View style={styles.currentLocationMarkerCenter} /></View>
        </Marker> : null}
      </MapView>
      {full ? <ScreenHeader title="Device Map" onBack={onDetailBack} /> : <View style={styles.mapHeader}><Text style={styles.sectionTitle}>Locations</Text><View style={{ flexDirection: 'row' }}><IconButton name="bell-outline" label="Notifications" color={C.ink} onPress={() => { setPreviousRoute(route); setRoute('notifications'); }} /><IconButton name="crosshairs-gps" label="Show my current location" color={locating ? C.green : C.greenDark} onPress={showCurrentLocation} /></View></View>}
      {full ? <View style={[styles.mapOverlay, { top: 56 }]}>{mapSearch}</View> : <View style={styles.mapOverlay}>{mapSearch}</View>}
      {visibleMarkers.length === 0 ? <View style={styles.mapNotice}><Icon name="map-marker-off-outline" size={17} color={C.greenDark} /><Text style={styles.mapNoticeText}>{devices.length === 0 ? 'No devices found in this project.' : 'No devices in this project have GPS coordinates. Tap map or search a city to view a location.'}</Text></View> : isFallbackDemo ? <View style={styles.mapNotice}><Icon name="information-outline" size={17} color={C.greenDark} /><Text style={styles.mapNoticeText}>Sample placeholders only — these are not live devices or confirmed locations.</Text></View> : null}
      <View style={styles.mapCount}><Icon name="map-marker-multiple-outline" color={C.greenDark} size={15} /><Text style={styles.mapCountText}>{isFallbackDemo ? `${visibleMarkers.length} sample placeholders` : `${visibleMarkers.length} of ${devices.length} devices with coordinates`}</Text></View>
      {selectedMapDevice ? <View style={styles.mapDeviceCard}>
        <DeviceThumb kind={selectedMapDevice.kind} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={styles.mapDeviceName}>{selectedMapDevice.name}</Text><Text numberOfLines={1} style={styles.mapDeviceMeta}>{selectedMapDevice.loc} · {selectedMapDevice.heard}</Text></View>
        <IconButton name="chevron-right" label={`Open ${selectedMapDevice.name}`} color={C.greenDark} onPress={() => goToDevice(selectedMapDevice, route)} />
      </View> : selectedCustomLocation ? <View style={styles.mapDeviceCard}>
        <View style={[styles.avatar, { width: 40, height: 40, borderRadius: 20, backgroundColor: C.redPale }]}><Icon name="map-marker" size={24} color={C.red} /></View>
        <View style={{ flex: 1, minWidth: 0, marginLeft: 8 }}><Text numberOfLines={1} style={styles.mapDeviceName}>{selectedCustomLocation.placeName}</Text><Text numberOfLines={1} style={styles.mapDeviceMeta}>{selectedCustomLocation.latitude.toFixed(4)}, {selectedCustomLocation.longitude.toFixed(4)}</Text></View>
        <IconButton name="close" label="Clear selected location" color={C.muted} size={19} onPress={() => setSelectedCustomLocation(null)} />
      </View> : null}
    </View>;
  };

  const renderLocations = () => renderMap(false);

  const renderAnalytics = () => {
    const liveOutputs = isConnected ? devices.flatMap(device => device.outputs.map((output, index) => ({ device, output, index }))) : [];
    return <ScrollView style={styles.screen} contentContainerStyle={styles.standardScroll}>
      <Text style={styles.dashboardHeading}>Dashboard</Text>
      <Pressable style={styles.projectSelector} onPress={() => setModal('projects')}><Icon name="chart-box-outline" size={19} color={C.greenDark} /><View style={{ flex: 1, marginLeft: 9 }}><Text style={styles.selectorCaption}>PUBLIC DASHBOARD</Text><Text numberOfLines={1} style={styles.selectorName}>{activeProject?.name || 'Device health'}</Text></View><Icon name="chevron-down" size={19} color={C.muted} /></Pressable>
      {isConnected ? <View style={styles.infoNote}><Icon name="information-outline" size={16} color={C.greenDark} /><Text style={styles.infoNoteText}>These are current device outputs. Historical analytics are not included in the Ginjer API collection.</Text></View> : <View style={styles.infoNote}><Icon name="flask-outline" size={16} color={C.greenDark} /><Text style={styles.infoNoteText}>Preview metrics are sample data. Connect to Ginjer to see current outputs.</Text></View>}
      <View style={styles.statsRow}>
        <StatCard label="Devices" value={devices.length} icon="devices" tint={C.green} />
        <StatCard label="Needs attention" value={devices.filter(device => device.chips?.some(chip => chip.status === 'red')).length} icon="alert-circle-outline" tint={C.red} />
      </View>
      <Text style={styles.sectionTitleSmall}>{isConnected ? 'Current outputs' : 'Overview'}</Text>
      {isConnected ? liveOutputs.length ? liveOutputs.map(({ device, output, index }) => <View key={`${device.apiId}-${output.outputId || index}`} style={styles.metricCard}>
        <View style={styles.metricHeader}><View style={{ flex: 1 }}><Text style={styles.metricName}>{output.outputName || output.label || `Output ${index + 1}`}</Text><Text style={styles.metricCaption}>{device.name} · {device.loc}</Text></View><Icon name="dots-horizontal" size={19} color={C.muted} /></View>
        <Text style={styles.metricValue}>{typeof output.value === 'object' ? JSON.stringify(output.value) : String(output.value ?? output.label ?? '—')}</Text>
        <View style={styles.metricFooter}><Text style={styles.metricFooterText}>Last heard · {device.heard}</Text><View style={[styles.onlineDot, { backgroundColor: chipColor(device.chips?.[0]?.status) }]} /></View>
      </View>) : <EmptyState text="No output values were returned for this project." /> : <>
        <View style={styles.metricCard}><View style={styles.metricHeader}><View><Text style={styles.metricName}>Level Sensor</Text><Text style={styles.metricCaption}>Tank 6 · Water level</Text></View><Icon name="dots-horizontal" size={19} color={C.muted} /></View><View style={styles.gauge}><View style={styles.gaugeArc}><View style={styles.gaugeNeedle} /></View><Text style={styles.gaugeValue}>1.00<Text style={styles.gaugeUnit}> m</Text></Text></View><View style={styles.metricFooter}><Text style={styles.metricFooterText}>0.0 m</Text><Text style={styles.metricFooterText}>Range 0.0–1.3 m</Text></View></View>
        <View style={styles.metricCard}><View style={styles.metricHeader}><View><Text style={styles.metricName}>IO Controller</Text><Text style={styles.metricCaption}>Lab Room · Output status</Text></View><Icon name="dots-horizontal" size={19} color={C.muted} /></View><Text style={[styles.metricValue, { color: C.greenDark }]}>ON</Text><View style={styles.metricFooter}><Text style={styles.metricFooterText}>Sample value</Text><View style={[styles.onlineDot, { backgroundColor: C.green }]} /></View></View>
      </>}
    </ScrollView>;
  };

  const renderProfile = () => {
    const curProfile = profile || DEMO_PROFILE;
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.profileScroll}>
        <Text style={styles.profileHeading}>Profile</Text>
        <View style={styles.profileHero}>
          <ProfileAvatar uri={profilePhotoUri} size={78} />
          <View style={styles.profileIdentity}>
            <Text numberOfLines={2} style={styles.profileName}>{curProfile.name || 'Ginjer User'}</Text>
            <Text numberOfLines={2} style={styles.profileEmail}>{curProfile.email || 'Email not available'}</Text>
          </View>
        </View>
        <View style={styles.profileMenu}>
          <ProfileMenuRow icon="account-outline" title="My Profile" onPress={beginProfileEdit} />
          <ProfileMenuRow icon="view-grid-outline" title="Project" value={activeProject?.name || (isConnected ? 'No project' : 'SenRa Production')} onPress={() => setModal('projects')} />
          <ProfileMenuRow icon="domain" title="Organization" value={activeOrganisation?.name || (isConnected ? (curProfile.organization || 'No organization') : 'SenRa IoT')} onPress={() => setModal('organisations')} />
          <ProfileMenuRow icon="bell-outline" title="Notifications" onPress={() => { setPreviousRoute(route); setRoute('notifications'); }} last />
        </View>
        <Pressable accessibilityRole="button" onPress={() => Alert.alert(isConnected ? 'Log out?' : 'Leave preview?', isConnected ? 'Disconnect this app from your Ginjer account?' : 'Return to the connection screen?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: isConnected ? disconnect : () => setRoute('login') }])} style={styles.logoutRow}>
          <Icon name="logout" size={20} color={C.red} /><Text style={styles.logoutText}>{isConnected ? 'Logout' : 'Connect to Ginjer'}</Text><Icon name="chevron-right" size={19} color={C.red} />
        </Pressable>
        <Text style={styles.profileFootnote}>Alumhacks Mobile · {isConnected ? `Connected to ${ginjerEnv === 'dev' ? 'dev.ginjer.io' : 'ginjer.io'}` : 'Demo preview'}</Text>
      </ScrollView>
    );
  };

  const renderDetail = () => {
    const device = selectedDevice;
    if (!device) return <View style={styles.screen}><ScreenHeader title="Device Details" onBack={onDetailBack} /><EmptyState text="Select a device to see its details." /></View>;
    const coords = hasCoordinates(device);
    return <ScrollView style={styles.screen} contentContainerStyle={styles.detailScroll}>
      <ScreenHeader title="Device Details" onBack={onDetailBack} right={<IconButton name="dots-horizontal" label="Device options" onPress={() => showToast('No additional device options are available.')} />} />
      <View style={styles.detailSummary}><DeviceThumb kind={device.kind} size={64} /><View style={{ flex: 1 }}><Text style={styles.detailName}>{device.name}</Text><Text style={styles.detailId}>DevEUI · {device.id}</Text><Text style={styles.detailHeard}>Last heard · {device.heard}</Text></View></View>
      <View style={styles.detailFields}><View style={styles.detailField}><Text style={styles.detailFieldLabel}>Location</Text><Text numberOfLines={2} style={styles.detailFieldValue}>{device.loc}</Text></View><View style={styles.detailField}><Text style={styles.detailFieldLabel}>Main Output</Text><Text numberOfLines={2} style={styles.detailFieldValue}>{device.output}</Text></View></View>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.expandButton}><Text style={styles.expandButtonText}>{expanded ? 'See less' : 'See more'}</Text><Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={C.greenDark} /></Pressable>
      {expanded ? <View style={styles.expandedDetails}><Text style={styles.expandedLine}><Text style={styles.bold}>Device type</Text> · {device.hardwareType || 'Not reported'}</Text><Text style={styles.expandedLine}><Text style={styles.bold}>Network ID</Text> · {device.networkId || 'Not reported'}</Text>{device.attributes?.length ? device.attributes.map((attribute, index) => <Text key={attribute.attributeId || index} style={styles.expandedLine}><Text style={styles.bold}>{attribute.attributeName || 'Attribute'}</Text> · {formatOutput(attribute.value)}</Text>) : <Text style={styles.expandedLine}><Text style={styles.bold}>Attributes</Text> · None returned</Text>}</View> : null}
      <Text style={styles.sectionTitleSmall}>Outputs</Text>
      {device.outputs?.length ? <View style={styles.outputGrid}>{device.outputs.map((output, index) => <View key={output.outputId || index} style={styles.outputCard}><Text numberOfLines={1} style={styles.outputLabel}>{output.outputName || output.label || `Output ${index + 1}`}</Text><Text style={styles.outputValue}>{formatOutput(output.value ?? output.label)}</Text><View style={[styles.outputDot, { backgroundColor: chipColor(device.chips?.[0]?.status) }]} /></View>)}</View> : <View style={styles.emptyInline}><Text style={styles.emptyText}>No output data returned for this device.</Text></View>}
      <View style={styles.detailSectionHeader}><Text style={styles.sectionTitleSmall}>Location</Text><Pressable onPress={() => openFullMap('detail', device)}><Text style={styles.linkText}>View map</Text></Pressable></View>
      <View style={styles.miniMap}>
        <MapView style={StyleSheet.absoluteFill} initialRegion={coords ? { latitude: Number(device.position.lat), longitude: Number(device.position.lng), latitudeDelta: 0.08, longitudeDelta: 0.08 } : { latitude: 22.9734, longitude: 78.6569, latitudeDelta: 24, longitudeDelta: 24 }} scrollEnabled={coords} zoomEnabled={coords} userInterfaceStyle="light" customMapStyle={GOOGLE_MAPS_LIGHT_STYLE}>
          {coords ? <Marker coordinate={{ latitude: Number(device.position.lat), longitude: Number(device.position.lng) }} title={device.name} description={device.loc} /> : null}
        </MapView>
        {!coords ? <View style={styles.miniMapMessage}><Icon name="map-marker-off-outline" size={17} color={C.greenDark} /><Text style={styles.miniMapText}>Coordinates were not returned for this device.</Text></View> : null}
      </View>
      <View style={styles.expandedDetails}><Text style={styles.expandedLine}>{device.loc}{coords ? ` · ${device.position.lat}, ${device.position.lng}` : ''}</Text></View>
      <View style={styles.detailActions}><ActionButton title="Refresh data" secondary onPress={refresh} /><ActionButton title="Send Downlink" onPress={() => { setDownlinkValue('{}'); openDownlinkModal(); }} /></View>
    </ScrollView>;
  };

  const renderNotifications = () => {
    const projectNotices = isConnected ? devices.map((dev, idx) => {
      const redChip = dev.chips?.find(c => c.status === 'red');
      const amberChip = dev.chips?.find(c => c.status === 'amber');
      return {
        id: dev.id || `notif-${idx}`,
        title: dev.name,
        where: dev.loc || 'Location unavailable',
        time: dev.heard || 'Recent',
        color: redChip ? 'red' : amberChip ? 'amber' : 'green',
        count: redChip ? 1 : null,
        icon: dev.kind === 'water' ? 'notice-water-critical' : dev.kind === 'air' ? 'notice-safe' : 'notice-fill-critical',
        device: dev,
      };
    }) : demoNotices;

    const notices = projectNotices
      .filter((notice) => noticeFilter === 'all' || (noticeFilter === 'unread' && notice.count) || (noticeFilter === 'critical' && notice.color === 'red'))
      .filter(notice => !query || `${notice.title} ${notice.where}`.toLowerCase().includes(query.toLowerCase()));

    return <View style={styles.screen}>
      <ScreenHeader title="Notifications" onBack={onDetailBack} right={<View style={{ flexDirection: 'row' }}><IconButton name="filter-variant" label="Filter notifications" onPress={() => setModal('notice-filter')} /><IconButton name="cog-outline" label="Notification settings" onPress={() => showToast('Notification preferences are not provided by the Ginjer API.')} /></View>} />
      <SearchField value={query} onChangeText={setQuery} placeholder="Search notifications" style={{ marginHorizontal: 14, marginTop: 6, marginBottom: 8 }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {notices.map((notice, index) => {
          const imgSource = NOTICE_IMAGES[notice.icon] || (notice.color === 'red' ? NOTICE_IMAGES['notice-fill-critical'] : notice.color === 'amber' ? NOTICE_IMAGES['notice-fill-warning'] : NOTICE_IMAGES['notice-safe']);
          return (
            <View key={`${notice.title}-${notice.id || index}`}>
              {(index === 0 || (index === 4 && notices.length > 4)) ? <Text style={styles.noticeDate}>{index === 0 ? 'Today' : 'Earlier'}</Text> : null}
              <Pressable style={({ pressed }) => [styles.noticeRow, pressed && styles.pressed]} onPress={() => { const dev = notice.device || devices.find(d => (notice.id && d.id === notice.id) || (d.loc && notice.where && (d.loc.toLowerCase().includes(notice.where.toLowerCase()) || notice.where.toLowerCase().includes(d.name.toLowerCase())))); if (dev) goToDevice(dev, 'notifications'); else showToast('No linked device found for this alert.'); }}>
                <Image source={imgSource} style={styles.noticeImage} resizeMode="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.noticeTitle}>{notice.title}</Text>
                  <Text style={styles.noticeLocation}>{notice.where}</Text>
                </View>
                <View style={styles.noticeTime}>
                  {notice.count ? <Text style={styles.unreadCount}>{notice.count}</Text> : null}
                  <Text style={styles.noticeTimeText}>{notice.time}</Text>
                </View>
              </Pressable>
            </View>
          );
        })}
        {!notices.length ? <EmptyState text={isConnected ? "No notifications for this project." : "No notifications match this filter."} /> : null}
      </ScrollView>
    </View>;
  };


  const renderAutomation = () => {
    const alertCount = devices.filter(d => d.chips?.some(c => c.status === 'red')).length;
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.standardScroll}>
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Automation</Text>
        <View style={styles.autoSummaryRow}>
          <View style={[styles.autoSummaryCard, { backgroundColor: '#EAF6FA' }]}>
            <Icon name="devices" size={20} color={C.blue} />
            <Text style={[styles.autoSummaryVal, { color: C.blue }]}>{devices.length}</Text>
            <Text style={styles.autoSummaryLabel}>Devices</Text>
          </View>
          <View style={[styles.autoSummaryCard, { backgroundColor: C.redPale }]}>
            <Icon name="alert-circle-outline" size={20} color={C.red} />
            <Text style={[styles.autoSummaryVal, { color: C.red }]}>{alertCount}</Text>
            <Text style={styles.autoSummaryLabel}>Alerts</Text>
          </View>
          <View style={[styles.autoSummaryCard, { backgroundColor: C.greenPale }]}>
            <Icon name="robot-outline" size={20} color={C.greenDark} />
            <Text style={[styles.autoSummaryVal, { color: C.greenDark }]}>{autoRules.filter(r => r.active).length}</Text>
            <Text style={styles.autoSummaryLabel}>Active Rules</Text>
          </View>
        </View>

        <Text style={styles.sectionTitleSmall}>Automation Rules</Text>
        {autoRules.map(rule => (
          <View key={rule.id} style={styles.autoRuleCard}>
            <View style={[styles.autoRuleIcon, { backgroundColor: rule.color + '22' }]}>
              <Icon name={rule.icon} size={19} color={rule.color} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={styles.autoRuleName}>{rule.name}</Text>
              <Text numberOfLines={1} style={styles.autoRuleMeta}>{rule.trigger} → {rule.action}</Text>
            </View>
            <Switch
              value={rule.active}
              onValueChange={(val) => setAutoRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: val } : r))}
              trackColor={{ false: '#D0D5CF', true: C.green }}
              thumbColor={C.white}
            />
          </View>
        ))}

        <Text style={styles.sectionTitleSmall}>Scheduled Actions</Text>
        {(isConnected ? (devices.length ? [
          { id: 's1', name: `${activeProject?.name || 'Project'} Health Check`, time: '08:00 AM', repeat: 'Every day', icon: 'clock-outline', color: '#38A1C5' },
          { id: 's2', name: 'Off-Hours Downlink Sync', time: '11:00 PM', repeat: 'Mon–Fri', icon: 'sync', color: '#5B8C51' },
        ] : []) : DEMO_SCHEDULES).map(sch => (
          <View key={sch.id} style={styles.autoRuleCard}>
            <View style={[styles.autoRuleIcon, { backgroundColor: sch.color + '22' }]}>
              <Icon name={sch.icon} size={19} color={sch.color} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={styles.autoRuleName}>{sch.name}</Text>
              <Text numberOfLines={1} style={styles.autoRuleMeta}>{sch.time} · {sch.repeat}</Text>
            </View>
            <Icon name="chevron-right" size={18} color={C.muted} />
          </View>
        ))}
        {isConnected && !devices.length ? <Text style={[styles.emptyText, { marginHorizontal: 16, marginVertical: 8 }]}>No scheduled actions for this project.</Text> : null}

        <Pressable style={styles.autoAnalyticsLink} onPress={() => setRoute('analytics')}>
          <Icon name="chart-box-outline" size={18} color={C.greenDark} />
          <Text style={styles.autoAnalyticsText}>View Analytics Dashboard</Text>
          <Icon name="chevron-right" size={18} color={C.muted} />
        </Pressable>
      </ScrollView>
    );
  };

  const renderEdit = () => {
    const draft = profileDraft || profile || DEMO_PROFILE;
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenHeader title="Edit Profile" onBack={() => { setProfileDraft(profile || DEMO_PROFILE); setProfilePhotoDraftUri(profilePhotoUri); setRoute('profile'); }} right={<IconButton name="check" label="Save profile" color={C.greenDark} onPress={saveProfile} />} />
        <ScrollView style={styles.screen} contentContainerStyle={styles.editProfileScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.editAvatarWrap}><ProfileAvatar uri={profilePhotoDraftUri} onEditPress={pickImage} size={112} /></View>
          <ProfileField label="Full name" icon="account-outline" value={draft.name || ''} onChangeText={value => setProfileDraft(current => ({ ...(current || {}), name: value }))} />
          <ProfileField label="Email" icon="email-outline" value={draft.email || ''} keyboardType="email-address" autoCapitalize="none" onChangeText={value => setProfileDraft(current => ({ ...(current || {}), email: value }))} />
          <ProfileField label="Primary Phone Number" icon="phone-outline" value={draft.primaryPhone || ''} keyboardType="phone-pad" onChangeText={value => setProfileDraft(current => ({ ...(current || {}), primaryPhone: value }))} />
          <ProfileField label="Secondary phone Number" icon="phone-outline" value={draft.secondaryPhone || ''} keyboardType="phone-pad" onChangeText={value => setProfileDraft(current => ({ ...(current || {}), secondaryPhone: value }))} />
          <ProfileField label="Organization" icon="domain" value={draft.organization || ''} editable={false} onPress={() => setModal('profile-organisations')} />
          <ActionButton title="Save changes" onPress={saveProfile} style={{ marginTop: 18 }} />
          {isConnected ? <Text style={styles.profileEditNote}>These changes stay in this app session. Ginjer’s supplied API does not support updating account details.</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const renderBody = () => {
    if (route === 'devices') return renderDevices();
    if (route === 'locations') return renderLocations();
    if (route === 'map') return renderMap(true);
    if (route === 'analytics') return renderAnalytics();
    if (route === 'automation') return renderAutomation();
    if (route === 'profile') return renderProfile();
    if (route === 'notifications') return renderNotifications();
    if (route === 'detail') return renderDetail();
    if (route === 'edit') return renderEdit();
    return renderDevices();
  };

  const renderOptions = () => {
    if (modal === 'profile-organisations') {
      const choices = (organisations.length ? organisations : [{ name: 'SenRa' }, { name: 'Individual' }, { name: 'SenRa IoT' }])
        .filter(item => (item.name || item.organisationId || '').toLowerCase().includes(organizationQuery.toLowerCase()));
      return <Sheet visible title="Organization" subtitle="Choose the organization shown on your profile." onClose={() => { setModal(null); setOrganizationQuery(''); }} actions={<ActionButton title="Close" secondary onPress={() => { setModal(null); setOrganizationQuery(''); }} />}>
        <SearchField value={organizationQuery} onChangeText={setOrganizationQuery} placeholder="Search organizations" style={{ marginVertical: 8 }} />
        {choices.map((item, index) => <OptionRow key={item.organisationId || item.name || index} title={item.name || item.organisationId} selected={profileDraft.organization === (item.name || item.organisationId)} onPress={() => { setProfileDraft(current => ({ ...current, organization: item.name || item.organisationId })); setModal(null); setOrganizationQuery(''); }} />)}
        {!choices.length ? <Text style={styles.sheetEmpty}>No organizations match this search.</Text> : null}
      </Sheet>;
    }
    if (modal === 'organisations') return <Sheet visible title="Organizations" subtitle="Choose an accepted Ginjer organization." onClose={() => setModal(null)} actions={<ActionButton title="Close" secondary onPress={() => setModal(null)} />}>
      {organisations.map(organisation => <OptionRow key={organisation.organisationId} title={organisation.name || organisation.organisationId} onPress={() => chooseOrganisation(organisation)} />)}
    </Sheet>;
    if (modal === 'projects') return <Sheet visible title="Projects" subtitle="Switch the project shown in the app." onClose={() => setModal(null)} actions={<ActionButton title="Close" secondary onPress={() => setModal(null)} />}>
      {projects.map(project => <OptionRow key={project._id} title={project.name || project._id} subtitle={`${project.deviceCount?.[0]?.deviceCount ?? '—'} devices`} selected={activeProject?._id === project._id} onPress={() => chooseProject(project)} />)}
      {!projects.length ? <Text style={styles.sheetEmpty}>Connect to Ginjer to select a project.</Text> : null}
    </Sheet>;
    if (modal === 'filter' || modal === 'notice-filter') {
      const noticeMode = modal === 'notice-filter';
      const value = noticeMode ? noticeFilter : filter;
      const options = noticeMode ? [['all', 'All notifications'], ['unread', 'Unread only'], ['critical', 'Critical alerts']] : [['all', 'All devices'], ['attention', 'Needs attention'], ['online', 'Online']];
      return <Sheet visible title={noticeMode ? 'Notification filter' : 'Filter devices'} subtitle={noticeMode ? 'Choose which alerts appear in your feed.' : 'Narrow the device list by current status.'} onClose={() => setModal(null)} actions={<><ActionButton title="Cancel" secondary onPress={() => setModal(null)} /><ActionButton title="Apply" onPress={() => setModal(null)} /></>}>
        {options.map(([id, label]) => <OptionRow key={id} title={label} selected={value === id} onPress={() => noticeMode ? setNoticeFilter(id) : setFilter(id)} radio />)}
      </Sheet>;
    }
    if (modal === 'downlink') {
      const pulseOpacity = sendAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
      const pulseScale = sendAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });
      const availableDlModules = modules.filter(m => m.moduleType === 'DOWNLINK_INTERFACE' || /downlink/i.test(m.label || '') || /downlink/i.test(m.moduleType || ''));
      const activeDlMod = modules.find(m => m._id === downlinkModule) || availableDlModules[0] || modules[0];
      const hasNoDownlinkModule = isConnected && !activeDlMod;

      return (
        <Sheet visible title="Send Downlink" subtitle={`2-tap quick commands for ${selectedDevice?.name || 'this device'}`} onClose={() => { if (!downlinkSending) { setDownlinkSent(false); setModal(null); } }}>
          {downlinkSent ? (
            <View style={styles.downlinkSuccessBox}>
              <Icon name="check-circle" size={48} color={C.green} />
              <Text style={styles.downlinkSuccessText}>{downlinkResultMsg || 'Command Dispatched!'}</Text>
            </View>
          ) : downlinkSending ? (
            <View style={styles.downlinkSuccessBox}>
              <Animated.View style={{ opacity: pulseOpacity, transform: [{ scale: pulseScale }] }}>
                <Icon name="radio-tower" size={50} color={C.greenDark} />
              </Animated.View>
              <Text style={[styles.downlinkSuccessText, { color: C.muted }]}>Sending command…</Text>
            </View>
          ) : (
            <>
              {hasNoDownlinkModule ? (
                <View style={styles.downlinkWarningCard}>
                  <Icon name="alert-circle" size={22} color="#E5AE37" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.downlinkWarningTitle}>No Downlink Interface Configured</Text>
                    <Text style={styles.downlinkWarningBody}>
                      This Ginjer organization has no Downlink Interface module. To dispatch instructions to physical hardware, create a Downlink Interface module in your Ginjer console.
                    </Text>
                  </View>
                </View>
              ) : activeDlMod ? (
                <View style={styles.downlinkInterfaceCard}>
                  <Icon name="lan-connect" size={16} color={C.greenDark} />
                  <Text style={styles.downlinkInterfaceLabel} numberOfLines={1}>
                    Interface: <Text style={{ fontWeight: '700' }}>{activeDlMod.label || activeDlMod.moduleType}</Text>
                  </Text>
                  {availableDlModules.length > 1 ? (
                    <Pressable onPress={() => {
                      const nextIdx = (availableDlModules.findIndex(m => m._id === activeDlMod._id) + 1) % availableDlModules.length;
                      setDownlinkModule(availableDlModules[nextIdx]._id);
                    }}>
                      <Text style={styles.downlinkSwitchText}>Switch</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>Quick Presets (Tap to send)</Text>
              <View style={styles.quickCmdGrid}>
                {QUICK_COMMANDS.map(cmd => (
                  <Pressable key={cmd.label} onPress={() => sendQuickDownlink(cmd)} style={({ pressed }) => [styles.quickCmdButton, pressed && styles.pressed, { borderColor: cmd.color + '55' }]}>
                    <View style={[styles.quickCmdIcon, { backgroundColor: cmd.color + '18' }]}>
                      <Icon name={cmd.icon} size={24} color={cmd.color} />
                    </View>
                    <Text style={[styles.quickCmdLabel, { color: cmd.color }]}>{cmd.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.sectionTitleSmall, { marginTop: 14 }]}>Advanced (Raw JSON)</Text>
              <TextInput value={downlinkValue} onChangeText={setDownlinkValue} multiline autoCapitalize="none" autoCorrect={false} style={[styles.textInput, styles.jsonInput, { marginBottom: 8 }]} accessibilityLabel="JSON downlink value" />
              
              <View style={styles.sheetActions}>
                <ActionButton title="Cancel" secondary onPress={() => setModal(null)} />
                <ActionButton title="Send JSON" onPress={() => {
                  let v;
                  try {
                    v = JSON.parse(downlinkValue);
                  } catch {
                    showToast('Invalid JSON. Must be format {"command": "..."}');
                    return;
                  }
                  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
                    showToast('Downlink payload must be a JSON object, e.g. {"command": "reset"}');
                    return;
                  }
                  sendQuickDownlink({ label: 'JSON', icon: 'code-json', value: v, color: C.blue });
                }} />
              </View>
            </>
          )}
        </Sheet>
      );
    }
    return null;
  };

  if (route === 'setup') return renderSetup();
  if (route === 'login') return renderLogin();

  return <SafeAreaView edges={hasTabs ? ['top'] : ['top', 'bottom']} style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor={route === 'locations' || route === 'map' ? '#F8FAF5' : C.canvas} />
    {bannerNotice && hasTabs ? (
      <Pressable style={[styles.banner, { backgroundColor: bannerNotice.color === 'red' ? C.red : C.amber }]} onPress={() => { setBannerNotice(null); const dev = devices.find(d => (bannerNotice.deviceId && d.id === bannerNotice.deviceId) || (d.loc && (d.loc.toLowerCase().includes((bannerNotice.where || '').toLowerCase()) || (bannerNotice.where || '').toLowerCase().includes(d.name.toLowerCase())))); if (dev) goToDevice(dev, tab); }}>
        <Icon name="alert-circle-outline" size={20} color={C.white} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.bannerTitle} numberOfLines={1}>{bannerNotice.title}</Text>
          <Text style={styles.bannerSub} numberOfLines={1}>{bannerNotice.where} · Tap to route to device</Text>
        </View>
        <Pressable onPress={() => setBannerNotice(null)} hitSlop={12} style={styles.bannerClose}>
          <Icon name="close" size={17} color={C.white} />
        </Pressable>
      </Pressable>
    ) : null}
    <View style={styles.appBody}>{renderBody()}</View>
    {hasTabs ? <BottomTabs current={tab} onChange={changeTab} /> : null}
    {toast ? <View pointerEvents="none" style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}
    {loading && route !== 'login' ? <View style={styles.loadingOverlay}><ActivityIndicator color={C.green} size="large" /></View> : null}
    {renderOptions()}
  </SafeAreaView>;
}

function OptionRow({ title, subtitle, selected, radio, onPress }) {
  return <Pressable onPress={onPress} style={styles.optionRow}>
    <View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.optionTitle}>{title}</Text>{subtitle ? <Text style={styles.optionSubtitle}>{subtitle}</Text> : null}</View>
    {radio ? <Icon name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={21} color={selected ? C.greenDark : '#A0A6A1'} /> : <Icon name={selected ? 'check-circle' : 'chevron-right'} size={19} color={selected ? C.greenDark : '#A0A6A1'} />}
  </Pressable>;
}

function EmptyState({ text }) {
  return <View style={styles.emptyBox}><Icon name="inbox-outline" size={28} color="#A4AAA5" /><Text style={styles.emptyText}>{text}</Text></View>;
}

function kindIcon(kind) {
  return kind === 'snow' ? 'snowflake' : kind === 'water' ? 'water-outline' : kind === 'alert' ? 'alert-outline' : kind === 'air' ? 'weather-windy' : 'tune-variant';
}

function chipColor(status) { return status === 'red' ? C.red : status === 'amber' ? C.amber : status === 'blue' ? C.blue : C.green; }
function formatOutput(value) { return typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '—'); }

const styles = StyleSheet.create({
  flex: { flex: 1 }, safeArea: { flex: 1, backgroundColor: C.canvas }, appBody: { flex: 1, minHeight: 0 }, screen: { flex: 1, backgroundColor: C.canvas },
  centerPage: { flex: 1, justifyContent: 'center', padding: 22 }, setupPanel: { width: '100%', maxWidth: 440, alignSelf: 'center', padding: 22, borderRadius: 20, backgroundColor: C.white, elevation: 3, shadowColor: '#15220E', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  kicker: { color: C.green, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: 11 }, screenHeading: { color: C.ink, fontSize: 24, fontWeight: '700', marginBottom: 9 }, bodyCopy: { color: '#6F7771', fontSize: 14, lineHeight: 21, marginBottom: 18 },
  textInput: { width: '100%', minHeight: 51, paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1.2, borderColor: '#C9CDC9', borderRadius: 11, backgroundColor: C.white, color: C.ink, fontSize: 15 }, errorText: { color: C.red, fontSize: 13, lineHeight: 19, marginTop: 9 },
  primaryButton: { minHeight: 50, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: C.green, elevation: 2, shadowColor: '#5F8523', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }, primaryButtonText: { color: C.white, fontSize: 15, fontWeight: '700', letterSpacing: 0.2 }, secondaryButton: { minHeight: 46, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#DCE4D6', borderRadius: 14, backgroundColor: C.white }, secondaryButtonText: { color: C.greenDark, fontSize: 14, fontWeight: '600' }, disabledButton: { backgroundColor: '#E9EEE3', borderColor: '#E9EEE3' }, pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] }, footnote: { color: '#969D97', fontSize: 12, lineHeight: 18, marginTop: 12 },
  loginScroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 22, backgroundColor: C.white }, loginBrand: { height: 76, alignItems: 'center', justifyContent: 'center' }, ginjerLogo: { width: 235, height: 68 }, loginTagline: { marginTop: 5, color: '#969D98', fontSize: 16, textAlign: 'center' }, loginIllustration: { width: '100%', height: 190, marginTop: 14, marginBottom: 14 }, authTabs: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: 11, backgroundColor: '#F2F4EF', marginBottom: 14 }, authTab: { minHeight: 38, flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 }, authTabActive: { backgroundColor: C.white, elevation: 1, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }, authTabText: { color: C.muted, fontSize: 12, fontWeight: '500' }, authTabTextActive: { color: C.greenDark, fontWeight: '700' }, fieldLabel: { color: C.greenDark, fontSize: 13, fontWeight: '600', marginBottom: 7 }, textLink: { alignSelf: 'center', marginTop: 12, padding: 6 }, linkText: { color: C.greenDark, fontSize: 14, fontWeight: '600' }, legalText: { color: '#969D98', textAlign: 'center', fontSize: 11, lineHeight: 17, marginTop: 16 }, legalLinkText: { color: C.greenDark, fontSize: 11, fontWeight: '600' }, mutedLink: { color: '#929A94', fontSize: 12 }, changeServer: { alignSelf: 'center', marginTop: 7, padding: 5 },
  listTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17, paddingTop: 10, paddingBottom: 5 }, sectionTitle: { color: C.ink, fontSize: 19, lineHeight: 26, fontWeight: '700' }, topActions: { flexDirection: 'row', gap: 2 }, iconButton: { minWidth: 38, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, pageHeader: { height: 52, zIndex: 4, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, backgroundColor: '#FFFFFFF2' }, pageTitle: { flex: 1, textAlign: 'center', color: C.ink, fontSize: 16, fontWeight: '700' }, pageRight: { minWidth: 38, alignItems: 'flex-end' },
  projectSelector: { minHeight: 56, marginHorizontal: 16, marginTop: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E9E4', borderRadius: 14, backgroundColor: C.white, shadowColor: '#1A211D', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, selectorCaption: { color: '#A1A7A2', fontSize: 9, lineHeight: 12, fontWeight: '700', letterSpacing: 0.7 }, selectorName: { color: C.ink, fontSize: 13, fontWeight: '600', marginTop: 2 },
  searchField: { minHeight: 46, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#E3E7E1', borderRadius: 14, backgroundColor: C.white, shadowColor: '#1A211D', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }, searchInput: { flex: 1, minWidth: 0, height: 44, padding: 0, color: C.ink, fontSize: 13 },
  listSummary: { paddingHorizontal: 18, paddingTop: 13, paddingBottom: 7, flexDirection: 'row', justifyContent: 'space-between' }, summaryText: { color: '#929A94', fontSize: 10, fontWeight: '500' },
  liveBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#F2F7EC', borderWidth: 1, borderColor: '#E3ECD6' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  livePulseDot: { width: 7, height: 7, borderRadius: 4 },
  liveBarText: { fontSize: 11, fontWeight: '600', color: C.greenDark },
  syncButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: C.white, borderWidth: 1, borderColor: '#D7E5C7' },
  syncButtonText: { fontSize: 11, fontWeight: '700', color: C.greenDark }, deviceList: { gap: 10, paddingHorizontal: 14, paddingTop: 4, paddingBottom: 16 }, deviceCard: { minHeight: 114, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: '#EDF0EB', elevation: 2, shadowColor: '#1A211D', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } }, deviceThumb: { alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#F3F6ED', borderWidth: 1, borderColor: '#E8EFE0' }, deviceCardBody: { flex: 1, minWidth: 0, alignSelf: 'stretch', justifyContent: 'center' }, deviceName: { color: C.ink, fontSize: 13, fontWeight: '700' }, deviceId: { color: '#929A94', fontSize: 9, marginTop: 2 }, deviceLocation: { color: '#7C857E', fontSize: 10, marginTop: 4 }, chipRow: { flexDirection: 'row', gap: 5, marginTop: 7 }, statusChip: { maxWidth: 100, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 }, statusChipText: { fontSize: 9, fontWeight: '600' }, deviceCardMeta: { width: 63, alignItems: 'flex-end', alignSelf: 'stretch', justifyContent: 'center' }, onlineDot: { width: 8, height: 8, borderRadius: 5, marginBottom: 4 }, lastLabel: { color: '#A1A7A2', fontSize: 8 }, lastTime: { maxWidth: '100%', marginTop: 2, color: '#626B64', fontSize: 8, lineHeight: 11, textAlign: 'right' },
  tabSafeArea: { backgroundColor: C.white }, bottomTabs: { minHeight: 60, height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#EEF1EC', backgroundColor: C.white, shadowColor: '#000000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: -3 }, elevation: 10, zIndex: 10 }, tabButton: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 4, gap: 2 }, tabButtonPressed: { opacity: 0.6 }, tabLabel: { color: '#999F9A', fontSize: 9, lineHeight: 12, fontWeight: '500' }, tabLabelActive: { color: C.greenDark, fontWeight: '700' }, notificationsLink: { minHeight: 44, marginTop: 5, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, backgroundColor: '#F1F6E9' }, notificationsLinkText: { flex: 1, color: C.greenDark, fontSize: 12, fontWeight: '600' },
  emptyBox: { minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 }, emptyInline: { minHeight: 56, justifyContent: 'center' }, emptyText: { color: '#929A94', fontSize: 13, textAlign: 'center' },
  mapScreen: { flex: 1, backgroundColor: '#FFFFFF' }, mapHeader: { height: 48, zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 8, backgroundColor: '#FFFFFFF0' }, mapOverlay: { position: 'absolute', zIndex: 2, top: 58, left: 12, right: 12 }, mapSearch: { borderColor: '#E5EAE2' }, mapNotice: { position: 'absolute', zIndex: 1, top: 120, left: 12, right: 12, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, backgroundColor: '#FFFFFFEE' }, mapNoticeText: { flex: 1, color: '#6E786F', fontSize: 9, lineHeight: 13 }, mapCount: { position: 'absolute', bottom: 12, left: 12, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, backgroundColor: '#FFFFFFF2', elevation: 2 }, mapCountText: { color: '#6F7970', fontSize: 10 }, currentLocationMarker: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.white, borderRadius: 12, backgroundColor: '#D94343', elevation: 5, shadowColor: '#641717', shadowOpacity: 0.25, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } }, currentLocationMarkerCenter: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.white }, markerBubble: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.white, borderRadius: 19, borderBottomLeftRadius: 5, elevation: 4 }, mapDeviceCard: { position: 'absolute', bottom: 12, left: 12, right: 12, minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, borderRadius: 13, backgroundColor: C.white, elevation: 5, shadowColor: '#162015', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } }, mapDeviceName: { color: C.ink, fontSize: 13, fontWeight: '700' }, mapDeviceMeta: { color: C.muted, fontSize: 10, marginTop: 3 },
  standardScroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 22 }, dashboardHeading: { marginTop: 5, marginBottom: 8, color: C.ink, fontSize: 19, fontWeight: '700' }, infoNote: { marginTop: 11, padding: 10, flexDirection: 'row', gap: 7, alignItems: 'center', borderWidth: 1, borderColor: '#E7EDDE', borderRadius: 10, backgroundColor: '#F4F8EE' }, infoNoteText: { flex: 1, color: '#6F7A6E', fontSize: 10, lineHeight: 15 }, statsRow: { flexDirection: 'row', gap: 10, marginTop: 12 }, statCard: { flex: 1, minHeight: 102, padding: 11, borderRadius: 12, backgroundColor: C.white, elevation: 1 }, statIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 9 }, statValue: { marginTop: 8, color: C.ink, fontSize: 19, fontWeight: '700' }, statLabel: { marginTop: 1, color: C.muted, fontSize: 10 }, sectionTitleSmall: { color: C.ink, fontSize: 13, fontWeight: '700', marginTop: 16, marginBottom: 8 }, metricCard: { marginTop: 10, padding: 13, borderRadius: 13, backgroundColor: C.white, elevation: 2, shadowColor: '#192512', shadowOpacity: 0.04, shadowRadius: 7, shadowOffset: { width: 0, height: 2 } }, metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }, metricName: { color: C.ink, fontSize: 12, fontWeight: '700' }, metricCaption: { color: '#999F9A', fontSize: 9, marginTop: 2 }, metricValue: { marginTop: 12, color: C.greenDark, fontSize: 25, fontWeight: '700', textAlign: 'center' }, metricFooter: { minHeight: 27, marginTop: 10, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line }, metricFooterText: { color: '#9CA39D', fontSize: 9 }, gauge: { height: 106, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }, gaugeArc: { position: 'absolute', bottom: 0, width: 160, height: 80, borderWidth: 12, borderBottomWidth: 0, borderColor: '#C8E0E8', borderTopLeftRadius: 100, borderTopRightRadius: 100 }, gaugeNeedle: { position: 'absolute', left: 70, top: 46, width: 45, height: 2, backgroundColor: C.blue, transform: [{ rotate: '-37deg' }] }, gaugeValue: { marginBottom: 7, color: '#347F9B', fontSize: 22, fontWeight: '700' }, gaugeUnit: { fontSize: 13, fontWeight: '500' },
  profileScroll: { paddingHorizontal: 17, paddingTop: 8, paddingBottom: 24 }, profileHeading: { marginTop: 2, color: C.ink, fontSize: 19, fontWeight: '700', textAlign: 'center' }, profileHero: { minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 12, paddingBottom: 18, paddingHorizontal: 10 }, profileIdentity: { flex: 1, minWidth: 0 }, avatar: { width: 82, height: 82, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 3, borderColor: C.white, borderRadius: 42, backgroundColor: '#E8F0DF', elevation: 2 }, avatarWrap: { position: 'relative' }, editPhotoButton: { position: 'absolute', bottom: -7, right: -7, width: 32, height: 32, borderRadius: 16, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.white, elevation: 4, shadowColor: '#15220E', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, avatarImage: { width: '100%', height: '100%' }, profileName: { color: C.ink, fontSize: 16, lineHeight: 21, fontWeight: '700' }, profileEmail: { color: '#969D98', fontSize: 11, lineHeight: 16, marginTop: 3 }, profileMenu: { overflow: 'hidden', borderRadius: 13, backgroundColor: C.white, elevation: 2 }, menuRow: { minHeight: 62, paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EBEEEA' }, menuRowLast: { borderBottomWidth: 0 }, menuIconSlot: { width: 26, alignItems: 'center', justifyContent: 'center' }, menuCopy: { flex: 1, minWidth: 0, justifyContent: 'center' }, menuTitle: { color: C.ink, fontSize: 13, lineHeight: 18, fontWeight: '600' }, menuValue: { color: '#969D98', fontSize: 11, lineHeight: 15, marginTop: 2 }, logoutRow: { minHeight: 54, marginTop: 14, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: '#F1D9D6', borderRadius: 12, backgroundColor: C.white }, logoutText: { flex: 1, color: C.red, fontSize: 14, fontWeight: '600' }, profileFootnote: { marginTop: 14, color: '#A2A8A3', fontSize: 10, textAlign: 'center' },
  editProfileScroll: { paddingHorizontal: 18, paddingTop: 15, paddingBottom: 28 }, editAvatarWrap: { alignItems: 'center', paddingTop: 3, paddingBottom: 27 }, profileFieldGroup: { marginBottom: 14 }, profileFieldLabel: { marginBottom: 6, color: C.greenDark, fontSize: 14, fontWeight: '600' }, profileField: { minHeight: 54, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1.3, borderColor: '#D4D9D3', borderRadius: 13, backgroundColor: C.white }, profileFieldInput: { flex: 1, minWidth: 0, minHeight: 50, color: C.ink, fontSize: 15 }, profileEditNote: { marginTop: 12, color: C.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  detailScroll: { paddingBottom: 18 }, detailSummary: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 15, paddingBottom: 12 }, detailName: { color: C.ink, fontSize: 16, fontWeight: '700' }, detailId: { color: '#7E8780', fontSize: 10, marginTop: 3 }, detailHeard: { color: '#969D98', fontSize: 9, marginTop: 3 }, detailFields: { flexDirection: 'row', gap: 9, paddingHorizontal: 16 }, detailField: { minHeight: 58, flex: 1, padding: 10, borderRadius: 10, backgroundColor: C.white, elevation: 1 }, detailFieldLabel: { color: '#A1A7A2', fontSize: 9 }, detailFieldValue: { color: C.ink, fontSize: 11, fontWeight: '600', marginTop: 5 }, expandButton: { minHeight: 35, marginHorizontal: 16, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 9, backgroundColor: C.greenPale }, expandButtonText: { color: C.greenDark, fontSize: 11, fontWeight: '600' }, expandedDetails: { marginHorizontal: 16, marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: C.white }, expandedLine: { color: '#727B74', fontSize: 10, lineHeight: 16 }, bold: { color: '#465047', fontWeight: '700' }, outputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingHorizontal: 16 }, outputCard: { position: 'relative', width: '48%', minHeight: 74, padding: 10, borderRadius: 11, backgroundColor: C.white, elevation: 1 }, outputLabel: { color: C.muted, fontSize: 9 }, outputValue: { color: C.ink, fontSize: 14, fontWeight: '700', marginTop: 6, paddingRight: 12 }, outputDot: { position: 'absolute', right: 9, bottom: 10, width: 10, height: 10, borderRadius: 6 }, detailSectionHeader: { marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, miniMap: { height: 170, marginHorizontal: 16, overflow: 'hidden', borderRadius: 11, backgroundColor: '#FFFFFF' }, miniMapMessage: { position: 'absolute', left: 10, right: 10, top: 10, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, backgroundColor: '#FFFFFFEE' }, miniMapText: { flex: 1, color: '#70796F', fontSize: 10 }, detailActions: { flexDirection: 'row', gap: 9, marginHorizontal: 16, marginTop: 11 },
  profileFootnote: { marginTop: 14, color: '#A2A8A3', fontSize: 10, textAlign: 'center' },
  noticeDate: { marginHorizontal: 16, marginTop: 14, marginBottom: 7, color: '#8B938D', fontSize: 10, fontWeight: '700' }, noticeRow: { minHeight: 69, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECE7', backgroundColor: C.white }, noticeImage: { width: 38, height: 38, borderRadius: 20 }, noticeTitle: { color: C.ink, fontSize: 11, fontWeight: '700' }, noticeLocation: { color: '#969D98', fontSize: 9, marginTop: 3 }, noticeTime: { alignItems: 'flex-end', gap: 4 }, noticeTimeText: { color: '#9AA19B', fontSize: 9 }, unreadCount: { minWidth: 17, height: 17, paddingHorizontal: 4, overflow: 'hidden', borderRadius: 9, backgroundColor: C.green, color: C.white, fontSize: 9, textAlign: 'center', textAlignVertical: 'center' },
  modalScrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#10171299' }, sheet: { maxHeight: '84%', paddingTop: 8, paddingHorizontal: 18, paddingBottom: Platform.OS === 'ios' ? 25 : 14, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: C.white }, sheetGrabber: { width: 36, height: 4, alignSelf: 'center', marginBottom: 13, borderRadius: 4, backgroundColor: '#D9DED8' }, sheetTitle: { color: C.ink, fontSize: 17, fontWeight: '700', textAlign: 'center' }, sheetSubtitle: { alignSelf: 'center', maxWidth: 300, marginTop: 5, marginBottom: 12, color: '#969D98', fontSize: 11, lineHeight: 16, textAlign: 'center' }, sheetContent: { flexShrink: 1 }, sheetActions: { flexDirection: 'row', gap: 9, marginTop: 12 }, optionRow: { minHeight: 49, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EEF0EC' }, optionTitle: { color: C.ink, fontSize: 12, fontWeight: '500' }, optionSubtitle: { color: C.muted, fontSize: 10, marginTop: 3 }, sheetEmpty: { padding: 15, color: C.muted, fontSize: 12, textAlign: 'center' }, jsonInput: { minHeight: 96, marginTop: 6, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 },
  envSelector: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: 11, backgroundColor: '#EAEFE6', marginBottom: 10 },
  envTab: { minHeight: 34, flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  envTabActive: { backgroundColor: C.greenDark, elevation: 1 },
  envTabText: { color: C.muted, fontSize: 11, fontWeight: '600' },
  envTabTextActive: { color: C.white, fontWeight: '700' },
  toast: { position: 'absolute', left: 20, right: 20, bottom: 74, zIndex: 20, minHeight: 38, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#26312B', elevation: 5 }, toastText: { color: C.white, fontSize: 11, textAlign: 'center' }, loadingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9F7AA' },

  banner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, zIndex: 30 },
  bannerTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  bannerSub: { color: '#FFFFFFCC', fontSize: 11, marginTop: 1 },
  bannerClose: { padding: 4, marginLeft: 6 },
  quickCmdGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  quickCmdButton: { width: '30%', flexGrow: 1, minWidth: '28%', minHeight: 76, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, borderRadius: 12, borderWidth: 1.5, backgroundColor: C.white },
  quickCmdIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  quickCmdLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  downlinkSuccessBox: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 12 },
  downlinkSuccessText: { fontSize: 16, fontWeight: '700', color: C.green },
  autoSummaryRow: { flexDirection: 'row', gap: 9, marginBottom: 6 },
  autoSummaryCard: { flex: 1, minHeight: 78, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 12, padding: 10 },
  autoSummaryVal: { fontSize: 20, fontWeight: '800' },
  autoSummaryLabel: { fontSize: 10, color: C.muted, fontWeight: '600' },
  autoRuleCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, marginBottom: 8, borderRadius: 12, backgroundColor: C.white, elevation: 1, shadowColor: '#192512', shadowOpacity: 0.04, shadowRadius: 5, shadowOffset: { width: 0, height: 1 } },
  autoRuleIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  autoRuleName: { color: C.ink, fontSize: 13, fontWeight: '700' },
  autoRuleMeta: { color: C.muted, fontSize: 11, marginTop: 2 },
  autoAnalyticsLink: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12, padding: 13, borderRadius: 12, backgroundColor: C.greenPale, borderWidth: 1, borderColor: '#D6E8B7' },
  autoAnalyticsText: { flex: 1, color: C.greenDark, fontSize: 13, fontWeight: '600' },
  downlinkWarningCard: { flexDirection: 'row', gap: 10, backgroundColor: '#FFFBEA', borderWidth: 1, borderColor: '#F1D27C', borderRadius: 10, padding: 10, marginBottom: 12 },
  downlinkWarningTitle: { fontSize: 13, fontWeight: '700', color: '#946600', marginBottom: 2 },
  downlinkWarningBody: { fontSize: 11, color: '#745200', lineHeight: 16 },
  downlinkInterfaceCard: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.greenPale, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10 },
  downlinkInterfaceLabel: { flex: 1, fontSize: 11, color: C.greenDark },
  downlinkSwitchText: { fontSize: 11, fontWeight: '700', color: C.green, paddingHorizontal: 4 },
  deviceCardCompact: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: C.white, elevation: 1 },
  compactDot: { width: 8, height: 8, borderRadius: 4 },
});

