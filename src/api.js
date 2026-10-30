const queries = {
  signIn: `query SignIn($auth: SignInInput!) { signIn(auth: $auth) { _id firstName lastName emailId token defaultAccount organisationId organisationDetails { _id name } } }`,
  organisations: `query OrgList { accounts { organisationId name isActive isAccepted isAdmin } }`,
  projects: `query ProjectList($params: ParamInput!) { projectOverview(params: $params) { _id name description active organisationId location { placeName lat lng } userCount { _id userCount } deviceCount { _id deviceCount } clusterCount { _id clusterCount } nonLoRaWANDeviceCount { _id nonLoRaWANDeviceCount } } }`,
  devices: `query DeviceList($params: ParamInput!) { projects(params: $params) { _id name clusters { _id name devices { _id name devEui hardwareId timestamp } } } }`,
  details: `query DeviceDetails($params: ParamInput!) { projects(params: $params) { _id name clusters { _id name devices { _id name description devEui organisationId projectId clusterId hardwareId networkId hardwareType timestamp deleted position { placeName lat lng } outputs { outputId outputName value label color } attributes { attributeId attributeName value } } } } }`,
  modules: `query ModuleList($params: ParamInput!) { modules(params: $params) { _id label moduleType organisationId } }`,
  downlink: `query SendDownlink($action: SendDownlinkInput!) { sendDownlink(action: $action) { timestamp type message } }`,
};

const asArray = value => Array.isArray(value) ? value : value ? [value] : [];
const flattenDevices = projects => asArray(projects).flatMap(project => {
  const fromClusters = asArray(project.clusters).flatMap(cluster =>
    asArray(cluster.devices).map(device => ({ ...device, clusterName: cluster?.name })),
  );
  const direct = asArray(project.devices).map(device => ({ ...device, clusterName: project?.name }));
  return [...fromClusters, ...direct];
});
const displayDate = value => {
  if (!value) return 'Not reported';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};
const selectDeviceType = name => /panic|alert|button|sos/i.test(name) ? 'alert'
  : /water|level|fill/i.test(name) ? 'water'
    : /air|quality/i.test(name) ? 'air'
      : /cold|chain|temperature/i.test(name) ? 'snow' : 'controller';
const formatValue = value => typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '—');
const outputColor = (value, supplied) => {
  const explicit = String(supplied || '').toLowerCase();
  if (['red', 'amber', 'green', 'blue'].includes(explicit)) return explicit;
  const text = String(value ?? '').toLowerCase();
  if (/alert|off|low|poor|empty|false|error/.test(text)) return 'red';
  if (/moderate|warning|medium/.test(text)) return 'amber';
  return 'green';
};

export function normalizeDevice(device) {
  const outputs = asArray(device.outputs);
  const chips = outputs.slice(0, 2).map(output => {
    const value = formatValue(output.value ?? output.label);
    return { label: `${output.outputName || output.label || 'Output'}: ${value}`, status: outputColor(value, output.color) };
  });
  if (!chips.length) chips.push({ label: 'Output data unavailable', status: 'blue' });
  if (chips.length === 1) chips.push({ label: `Last heard: ${device.timestamp ? displayDate(device.timestamp) : 'Unknown'}`, status: 'blue' });
  const position = device.position || {};
  return {
    ...device,
    apiId: device._id,
    id: device.devEui || device.hardwareId || device._id,
    name: device.name || 'Unnamed device',
    heard: displayDate(device.timestamp),
    chips,
    kind: selectDeviceType(device.name || device.hardwareType || 'device'),
    loc: position.placeName || device.clusterName || 'Location unavailable',
    output: formatValue(outputs[0]?.value ?? outputs[0]?.label ?? '—'),
    outputs,
    attributes: asArray(device.attributes),
    position,
    networkId: device.networkId || '',
    hardwareType: device.hardwareType || '',
  };
}

export function hasCoordinates(device) {
  const position = device?.position;
  if (position?.lat == null || position?.lng == null || position.lat === '' || position.lng === '') return false;
  const latitude = Number(position.lat), longitude = Number(position.lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

export class GinjerClient {
  constructor(baseUrl, environment = 'dev') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.environment = environment;
  }

  setEnvironment(env) {
    this.environment = env;
  }

  async saveToken(token, environment = this.environment) {
    const response = await fetch(`${this.baseUrl}/api/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Backend rejected the token (${response.status}).`);
  }

  clearToken() {
    return fetch(`${this.baseUrl}/api/token`, { method: 'DELETE' }).catch(() => {});
  }

  async request(query, variables = {}, authenticated = true) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Ginjer-Env': this.environment,
      'X-Ginjer-Url': this.environment === 'prod' ? 'https://prodapi.ginjer.io/graphql' : 'https://devapi.ginjer.io/graphql',
    };
    if (authenticated) headers['X-Ginjer-Authenticated'] = 'true';
    let response;
    try {
      response = await fetch(`${this.baseUrl}/api/graphql`, {
        method: 'POST', headers, body: JSON.stringify({ query, variables }),
      });
    } catch {
      throw new Error('Cannot reach the computer backend. Check the server URL, Wi-Fi, and firewall.');
    }
    let body;
    try { body = await response.json(); } catch { throw new Error(`Backend returned an unreadable response (${response.status}).`); }
    if (!response.ok) throw new Error(body?.errors?.map(error => error.message).join('; ') || body?.error || `Ginjer request failed (${response.status}).`);
    if (body.errors?.length) throw new Error(body.errors.map(error => error.message).join('; '));
    return body.data || {};
  }

  async signIn(email, password) {
    return this.request(queries.signIn, { auth: { emailId: email, password, application: 'Ginjer', forever: true } }, false);
  }

  async getOrganisations(defaultId = '') {
    const result = await this.request(queries.organisations);
    const organisations = asArray(result.accounts).filter(item => item.isAccepted !== false && item.isActive !== false);
    const preferred = organisations.find(item => item.organisationId === defaultId);
    return preferred ? [preferred, ...organisations.filter(item => item !== preferred)] : organisations;
  }

  async getProjects(organisation) {
    const orgId = organisation?.organisationId || organisation?._id;
    try {
      const result = await this.request(queries.projects, { params: { organisationId: orgId } });
      const list = asArray(result.projectOverview);
      if (list.length) return list;
    } catch (e) {
      console.warn('projectOverview query failed, falling back:', e.message);
    }
    try {
      const result = await this.request(`query ProjectListFallback($params: ParamInput!) { projects(params: $params) { _id name description } }`, { params: { organisationId: orgId } });
      return asArray(result.projects);
    } catch {
      return [];
    }
  }

  async getModules(organisation) {
    const orgId = organisation?.organisationId || organisation?._id;
    if (!orgId) return [];
    try {
      const res = await this.request(queries.modules, { params: { organisationId: orgId } });
      return asArray(res.modules);
    } catch {
      return [];
    }
  }

  async getProjectData(organisation, project) {
    if (!project || project._id === 'none') {
      return { devices: [], modules: [], errors: [] };
    }
    const orgId = organisation?.organisationId || organisation?._id;
    const params = { organisationId: orgId, projectId: project._id };
    const [deviceResult, detailResult, moduleResult] = await Promise.allSettled([
      this.request(queries.devices, { params }),
      this.request(queries.details, { params }),
      this.request(queries.modules, { params: { organisationId: orgId } }),
    ]);
    const listed = deviceResult.status === 'fulfilled' ? flattenDevices(deviceResult.value?.projects) : [];
    const detailed = detailResult.status === 'fulfilled' ? flattenDevices(detailResult.value?.projects) : [];
    const allRaw = new Map();
    detailed.forEach(d => { if (d._id) allRaw.set(d._id, d); });
    listed.forEach(d => {
      if (d._id) {
        allRaw.set(d._id, { ...(allRaw.get(d._id) || {}), ...d });
      }
    });
    const devices = Array.from(allRaw.values()).map(device => normalizeDevice(device));
    const errors = [];
    if (deviceResult.status === 'rejected') errors.push(`Device list note: ${deviceResult.reason.message}`);
    if (detailResult.status === 'rejected') errors.push(`Device details note: ${detailResult.reason.message}`);
    if (moduleResult.status === 'rejected') errors.push(`Downlink modules note: ${moduleResult.reason.message}`);
    return { devices, modules: moduleResult.status === 'fulfilled' ? asArray(moduleResult.value.modules) : [], errors };
  }

  async sendDownlink(organisation, device, moduleId, value) {
    const orgId = organisation?.organisationId || organisation?._id;
    const devId = device?.apiId || device?._id;
    if (!orgId) throw new Error('Downlink failed: Missing organization ID.');
    if (!devId) throw new Error('Downlink failed: Missing device ID.');
    if (!moduleId) throw new Error('Downlink failed: No Downlink Interface module configured in this organization.');
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Downlink payload must be a JSON object, e.g. {"command": "reset"}');
    }
    const action = {
      organisationId: orgId,
      deviceId: devId,
      downlinkInterfaceId: moduleId,
      value,
    };
    if (device?.networkId) action.networkId = device.networkId;
    return this.request(queries.downlink, { action });
  }
}

export const demoDevices = [
  { name: 'Cold Chain', id: 'ECFAF446947298', heard: '50 Mins', chips: [{ label: 'Moderate', status: 'amber' }, { label: 'Humid', status: 'blue' }], kind: 'snow', loc: 'Green park', output: 'Cold Room', outputs: [], position: { lat: 28.5584, lng: 77.2028, placeName: 'Green park' } },
  { name: 'Level Sensor', id: 'ECFAF4469472DD', heard: '50 Mins', chips: [{ label: 'Empty', status: 'red' }, { label: 'Full', status: 'green' }], kind: 'water', loc: 'Tank 6', output: 'Reservoir A', outputs: [], position: { lat: 28.5494, lng: 77.2001, placeName: 'Tank 6' } },
  { name: 'IO Controller', id: 'ECFAF44694729A', heard: '02 Feb 2024 02:25', chips: [{ label: 'ON', status: 'green' }, { label: 'Full', status: 'green' }], kind: 'controller', loc: 'Lab Room', output: 'Lab Room', outputs: [], position: { lat: 28.5492, lng: 77.2528, placeName: 'Lab Room' } },
  { name: 'Panic Button', id: 'ECFAF44694729B', heard: '02 Feb 2024 02:15', chips: [{ label: 'SOS', status: 'red' }, { label: 'Low', status: 'amber' }], kind: 'alert', loc: 'John Doe · Block B', output: 'Block B, level 2', outputs: [], position: { lat: 28.5244, lng: 77.2167, placeName: 'John Doe · Block B' } },
  { name: 'Air Quality Sensor', id: 'ECFAF4469472CC', heard: '02 Feb 2024 01:43', chips: [{ label: 'Poor', status: 'red' }, { label: 'Full', status: 'green' }], kind: 'air', loc: 'Saket', output: 'Saket Office', outputs: [], position: { lat: 28.6315, lng: 77.2167, placeName: 'Saket' } },
  { name: 'Tektelic Sensor', id: 'T0005983-D01', heard: '12 Mins', chips: [{ label: 'LoRaWAN', status: 'green' }, { label: 'Online', status: 'green' }], kind: 'tektelic', loc: 'Tower A · Roof', output: 'Telemetry Feed', outputs: [], position: { lat: 28.5601, lng: 77.2105, placeName: 'Tower A · Roof' } },
  { name: 'Agriculture Node', id: 'AGRI-SEN-089', heard: '5 Mins', chips: [{ label: 'Moisture: 42%', status: 'green' }, { label: 'Battery: 91%', status: 'green' }], kind: 'agriculture', loc: 'Agri Zone 3', output: 'Soil Probe', outputs: [], position: { lat: 28.5350, lng: 77.2250, placeName: 'Agri Zone 3' } },
];

export const demoNotices = [
  { title: 'Fill level - 80%', where: 'Green park', time: '8:15 AM', color: 'red', icon: 'notice-fill-critical', count: '1' },
  { title: 'Fill Level - 85%', where: 'Saket', time: '7:20 AM', color: 'amber', icon: 'notice-fill-warning', count: '1' },
  { title: 'Alert - SOS', where: 'John Doe', time: '7:10 AM', color: 'red', icon: 'notice-sos', count: '3' },
  { title: 'Alert - Safe', where: 'John Smith', time: '7:05 AM', color: 'green', icon: 'notice-safe', count: '1' },
  { title: 'Water Level - 80%', where: 'Tank 6', time: '6:50 AM', color: 'red', icon: 'notice-water-critical', count: '3' },
  { title: 'Water Level - 50%', where: 'Tank 2', time: '6:32 AM', color: 'amber', icon: 'notice-water-safe', count: '1' },
  { title: 'Light - On', where: 'Lab Room', time: '6:15 AM', color: 'green', icon: 'notice-light' },
];
