import * as XLSX from 'xlsx';
import { getCachedPincodeInfo } from './pincode-lookup';
export { lookupPincode, getCachedPincodeInfo } from './pincode-lookup';

export interface DocketShipment {
  Id?: number;
  Length?: string | number;
  Width?: string | number;
  Height?: string | number;
  ActualWeight?: string | number;
  NoOfBox?: number;
  BoxType?: string;
  EntryDateTime?: string;
}

export interface FullDocket {
  Id?: number;
  DocketNo: string;
  ConsignorName?: string;
  ConsignorAddress?: string;
  ConsignorDistrict?: string;
  ConsignorState?: string;
  ConsignorPinCode?: string;
  ConsignorMobile?: string;
  ConsigneeName?: string;
  ConsigneeAddress?: string;
  ConsigneeDistrict?: string;
  ConsigneeState?: string;
  ConsigneePinCode?: string;
  ConsigneeMobile?: string;
  ShipDate: string;
  Origin?: string;
  Destination?: string;
  ModeOfTransport?: string;
  InvoiceRequired?: string;
  InvoiceNumber?: string;
  InvoiceValue?: string;
  Declaration?: string | null;
  ShipmentType?: string;
  PickupDate?: string;
  DeliveryDate?: string;
  PickupEmployee?: string;
  EwayBillNo?: string;
  LocationId?: number;
  CreatedAt?: string;
  Status?: string;
  status?: number;
  shipments?: DocketShipment[];
  ShipmentCount?: number;
  image_url?: string | null;
}

export interface MasterSheetRow {
  srNo: number;
  through: string;
  date: string;
  docketNo: string;
  consignor: string;
  consignee: string;
  mode: string;
  roadAir: string;
  origin: string;
  destination: string;
  district: string;
  state: string;
  pincode: string;
  oda: string;
  charges: string;
  billedPaid: string;
  odaCharges?: string;
  boxes: number;
  weight: number;
  length: number;
  breadth: number;
  height: number;
  dimension: string;
  volWeight: number;
  chargedWeight: number;
  invoiceNo: string;
  invoiceValue: string;
  contactNo: string;
  totalBox: number;
  fwAwbNo: string;
  fwName: string;
  fw?: string;
  awbNo?: string;
  status: string;
  deliveryDate: string;
  remarks: string;
  rawDocket: FullDocket;
}

/**
 * Formats a date string to DD/MM/YYYY or DD-MM-YYYY
 */
export const formatDateDisplay = (dateStr?: string | null, separator: '/' | '-' = '/'): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}${separator}${month}${separator}${year}`;
  } catch {
    return String(dateStr || '');
  }
};

/**
 * State abbreviations and aliases to full state name
 */
const STATE_ALIASES: Record<string, string> = {
  'up': 'Uttar Pradesh',
  'u.p.': 'Uttar Pradesh',
  'uttar pradesh': 'Uttar Pradesh',
  'mp': 'Madhya Pradesh',
  'm.p.': 'Madhya Pradesh',
  'madhya pradesh': 'Madhya Pradesh',
  'uk': 'Uttarakhand',
  'u.k.': 'Uttarakhand',
  'uttarakhand': 'Uttarakhand',
  'uttaranchal': 'Uttarakhand',
  'pb': 'Punjab',
  'punjab': 'Punjab',
  'hr': 'Haryana',
  'haryana': 'Haryana',
  'dl': 'Delhi',
  'delhi': 'Delhi',
  'new delhi': 'Delhi',
  'delh': 'Delhi',
  'chd': 'Chandigarh',
  'chandigarh': 'Chandigarh',
  'mh': 'Maharashtra',
  'maharashtra': 'Maharashtra',
  'rj': 'Rajasthan',
  'raj': 'Rajasthan',
  'rajasthan': 'Rajasthan',
  'gj': 'Gujarat',
  'gujarat': 'Gujarat',
  'br': 'Bihar',
  'bihar': 'Bihar',
  'jh': 'Jharkhand',
  'jharkhand': 'Jharkhand',
  'wb': 'West Bengal',
  'w bengal': 'West Bengal',
  'w bangal': 'West Bengal',
  'west bengal': 'West Bengal',
  'cg': 'Chhattisgarh',
  'chhattisgarh': 'Chhattisgarh',
  'chattisgarh': 'Chhattisgarh',
  'odisha': 'Odisha',
  'orissa': 'Odisha',
  'as': 'Assam',
  'assam': 'Assam',
  'tn': 'Tamil Nadu',
  'tamil nadu': 'Tamil Nadu',
  'tamilnadu': 'Tamil Nadu',
  'ka': 'Karnataka',
  'karnataka': 'Karnataka',
  'kl': 'Kerala',
  'kerala': 'Kerala',
  'ap': 'Andhra Pradesh',
  'andhra pradesh': 'Andhra Pradesh',
  'ts': 'Telangana',
  'telangana': 'Telangana',
  'hp': 'Himachal Pradesh',
  'himachal pradesh': 'Himachal Pradesh',
  'jk': 'Jammu & Kashmir',
  'jammu and kashmir': 'Jammu & Kashmir',
  'goa': 'Goa',
  'tripura': 'Tripura',
  'meghalaya': 'Meghalaya',
  'manipur': 'Manipur',
  'nagaland': 'Nagaland',
  'mizoram': 'Mizoram',
  'arunachal pradesh': 'Arunachal Pradesh',
  'sikkim': 'Sikkim',
  'puducherry': 'Puducherry',
  'pondicherry': 'Puducherry'
};

/**
 * 3-digit pincode prefix to District and State
 */
const PIN3_MAP: Record<string, { d: string; s: string }> = {
  '110': { d: 'Delhi', s: 'Delhi' },
  '121': { d: 'Faridabad', s: 'Haryana' },
  '122': { d: 'Gurugram', s: 'Haryana' },
  '123': { d: 'Rewari', s: 'Haryana' },
  '124': { d: 'Rohtak', s: 'Haryana' },
  '125': { d: 'Hisar', s: 'Haryana' },
  '126': { d: 'Jind', s: 'Haryana' },
  '127': { d: 'Bhiwani', s: 'Haryana' },
  '131': { d: 'Sonipat', s: 'Haryana' },
  '132': { d: 'Karnal', s: 'Haryana' },
  '133': { d: 'Ambala', s: 'Haryana' },
  '134': { d: 'Panchkula', s: 'Haryana' },
  '135': { d: 'Yamunanagar', s: 'Haryana' },
  '136': { d: 'Kurukshetra', s: 'Haryana' },
  '140': { d: 'Mohali', s: 'Punjab' },
  '141': { d: 'Ludhiana', s: 'Punjab' },
  '142': { d: 'Moga', s: 'Punjab' },
  '143': { d: 'Amritsar', s: 'Punjab' },
  '144': { d: 'Jalandhar', s: 'Punjab' },
  '145': { d: 'Pathankot', s: 'Punjab' },
  '146': { d: 'Hoshiarpur', s: 'Punjab' },
  '147': { d: 'Patiala', s: 'Punjab' },
  '148': { d: 'Sangrur', s: 'Punjab' },
  '151': { d: 'Bathinda', s: 'Punjab' },
  '152': { d: 'Firozpur', s: 'Punjab' },
  '160': { d: 'Chandigarh', s: 'Chandigarh' },
  '201': { d: 'Ghaziabad', s: 'Uttar Pradesh' },
  '202': { d: 'Aligarh', s: 'Uttar Pradesh' },
  '203': { d: 'Bulandshahr', s: 'Uttar Pradesh' },
  '204': { d: 'Hathras', s: 'Uttar Pradesh' },
  '205': { d: 'Etah', s: 'Uttar Pradesh' },
  '208': { d: 'Kanpur', s: 'Uttar Pradesh' },
  '209': { d: 'Kanpur Dehat', s: 'Uttar Pradesh' },
  '211': { d: 'Prayagraj', s: 'Uttar Pradesh' },
  '221': { d: 'Varanasi', s: 'Uttar Pradesh' },
  '224': { d: 'Ayodhya', s: 'Uttar Pradesh' },
  '226': { d: 'Lucknow', s: 'Uttar Pradesh' },
  '231': { d: 'Mirzapur', s: 'Uttar Pradesh' },
  '241': { d: 'Hardoi', s: 'Uttar Pradesh' },
  '242': { d: 'Shahjahanpur', s: 'Uttar Pradesh' },
  '243': { d: 'Bareilly', s: 'Uttar Pradesh' },
  '244': { d: 'Moradabad', s: 'Uttar Pradesh' },
  '245': { d: 'Hapur', s: 'Uttar Pradesh' },
  '247': { d: 'Saharanpur', s: 'Uttar Pradesh' },
  '248': { d: 'Dehradun', s: 'Uttarakhand' },
  '249': { d: 'Haridwar', s: 'Uttarakhand' },
  '250': { d: 'Meerut', s: 'Uttar Pradesh' },
  '251': { d: 'Muzaffarnagar', s: 'Uttar Pradesh' },
  '262': { d: 'Pilibhit', s: 'Uttar Pradesh' },
  '263': { d: 'Nainital', s: 'Uttarakhand' },
  '273': { d: 'Gorakhpur', s: 'Uttar Pradesh' },
  '275': { d: 'Mau', s: 'Uttar Pradesh' },
  '276': { d: 'Azamgarh', s: 'Uttar Pradesh' },
  '281': { d: 'Mathura', s: 'Uttar Pradesh' },
  '282': { d: 'Agra', s: 'Uttar Pradesh' },
  '283': { d: 'Firozabad', s: 'Uttar Pradesh' },
  '284': { d: 'Jhansi', s: 'Uttar Pradesh' },
  '302': { d: 'Jaipur', s: 'Rajasthan' },
  '303': { d: 'Jaipur Rural', s: 'Rajasthan' },
  '305': { d: 'Ajmer', s: 'Rajasthan' },
  '311': { d: 'Bhilwara', s: 'Rajasthan' },
  '313': { d: 'Udaipur', s: 'Rajasthan' },
  '324': { d: 'Kota', s: 'Rajasthan' },
  '334': { d: 'Bikaner', s: 'Rajasthan' },
  '342': { d: 'Jodhpur', s: 'Rajasthan' },
  '380': { d: 'Ahmedabad', s: 'Gujarat' },
  '390': { d: 'Vadodara', s: 'Gujarat' },
  '395': { d: 'Surat', s: 'Gujarat' },
  '400': { d: 'Mumbai', s: 'Maharashtra' },
  '401': { d: 'Palghar', s: 'Maharashtra' },
  '403': { d: 'North Goa', s: 'Goa' },
  '411': { d: 'Pune', s: 'Maharashtra' },
  '413': { d: 'Solapur', s: 'Maharashtra' },
  '414': { d: 'Ahmednagar', s: 'Maharashtra' },
  '416': { d: 'Kolhapur', s: 'Maharashtra' },
  '421': { d: 'Thane', s: 'Maharashtra' },
  '422': { d: 'Nashik', s: 'Maharashtra' },
  '431': { d: 'Chhatrapati Sambhajinagar', s: 'Maharashtra' },
  '440': { d: 'Nagpur', s: 'Maharashtra' },
  '441': { d: 'Nagpur', s: 'Maharashtra' },
  '452': { d: 'Indore', s: 'Madhya Pradesh' },
  '462': { d: 'Bhopal', s: 'Madhya Pradesh' },
  '474': { d: 'Gwalior', s: 'Madhya Pradesh' },
  '482': { d: 'Jabalpur', s: 'Madhya Pradesh' },
  '486': { d: 'Rewa', s: 'Madhya Pradesh' },
  '492': { d: 'Raipur', s: 'Chhattisgarh' },
  '495': { d: 'Bilaspur', s: 'Chhattisgarh' },
  '500': { d: 'Hyderabad', s: 'Telangana' },
  '530': { d: 'Visakhapatnam', s: 'Andhra Pradesh' },
  '560': { d: 'Bengaluru', s: 'Karnataka' },
  '600': { d: 'Chennai', s: 'Tamil Nadu' },
  '641': { d: 'Coimbatore', s: 'Tamil Nadu' },
  '682': { d: 'Ernakulam', s: 'Kerala' },
  '695': { d: 'Thiruvananthapuram', s: 'Kerala' },
  '700': { d: 'Kolkata', s: 'West Bengal' },
  '711': { d: 'Howrah', s: 'West Bengal' },
  '751': { d: 'Bhubaneswar', s: 'Odisha' },
  '781': { d: 'Guwahati', s: 'Assam' },
  '800': { d: 'Patna', s: 'Bihar' },
  '834': { d: 'Ranchi', s: 'Jharkhand' }
};

/**
 * Key logistics cities & district mapping
 */
const DISTRICT_CITIES = [
  // Delhi NCR
  { d: 'Delhi', s: 'Delhi', keys: ['delhi', 'new delhi', 'delh', 'okhla', 'rohini', 'dwarka', 'karol bagh'] },
  { d: 'Gurugram', s: 'Haryana', keys: ['gurgaon', 'gurugram', 'ggn', 'sohna', 'manesar', 'pataudi'] },
  { d: 'Faridabad', s: 'Haryana', keys: ['faridabad', 'fbd', 'ballabgarh'] },
  { d: 'Ghaziabad', s: 'Uttar Pradesh', keys: ['ghaziabad', 'gzb', 'modinagar', 'sahibabad', 'loni'] },
  { d: 'Gautam Buddha Nagar', s: 'Uttar Pradesh', keys: ['noida', 'greater noida', 'g noida', 'dadri', 'jewar'] },
  // Haryana
  { d: 'Ambala', s: 'Haryana', keys: ['ambala', 'ambala cantt'] },
  { d: 'Panchkula', s: 'Haryana', keys: ['panchkula'] },
  { d: 'Sonipat', s: 'Haryana', keys: ['sonipat', 'sonepat', 'kundli', 'rai', 'murthal'] },
  { d: 'Panipat', s: 'Haryana', keys: ['panipat', 'samalkha'] },
  { d: 'Karnal', s: 'Haryana', keys: ['karnal', 'gharaunda'] },
  { d: 'Rohtak', s: 'Haryana', keys: ['rohtak'] },
  { d: 'Rewari', s: 'Haryana', keys: ['rewari', 'bawal', 'dharuhera'] },
  { d: 'Hisar', s: 'Haryana', keys: ['hisar', 'hissar', 'hansi'] },
  { d: 'Sirsa', s: 'Haryana', keys: ['sirsa'] },
  { d: 'Jhajjar', s: 'Haryana', keys: ['jhajjar', 'bahadurgarh'] },
  { d: 'Yamunanagar', s: 'Haryana', keys: ['yamunanagar', 'jagadhri'] },
  { d: 'Kurukshetra', s: 'Haryana', keys: ['kurukshetra', 'thanesar'] },
  // Punjab & Chandigarh
  { d: 'Chandigarh', s: 'Chandigarh', keys: ['chandigarh', 'chd'] },
  { d: 'Mohali', s: 'Punjab', keys: ['mohali', 'zirakpur', 'derabassi', 'kharar', 'sas nagar'] },
  { d: 'Ludhiana', s: 'Punjab', keys: ['ludhiana', 'khanna'] },
  { d: 'Amritsar', s: 'Punjab', keys: ['amritsar'] },
  { d: 'Jalandhar', s: 'Punjab', keys: ['jalandhar'] },
  { d: 'Pathankot', s: 'Punjab', keys: ['pathankot'] },
  { d: 'Patiala', s: 'Punjab', keys: ['patiala'] },
  { d: 'Bathinda', s: 'Punjab', keys: ['bathinda', 'bhatinda'] },
  // Uttar Pradesh
  { d: 'Agra', s: 'Uttar Pradesh', keys: ['agra', 'fatehabad'] },
  { d: 'Aligarh', s: 'Uttar Pradesh', keys: ['aligarh'] },
  { d: 'Bareilly', s: 'Uttar Pradesh', keys: ['bareilly'] },
  { d: 'Etah', s: 'Uttar Pradesh', keys: ['etah'] },
  { d: 'Gorakhpur', s: 'Uttar Pradesh', keys: ['gorakhpur'] },
  { d: 'Hapur', s: 'Uttar Pradesh', keys: ['hapur'] },
  { d: 'Jhansi', s: 'Uttar Pradesh', keys: ['jhansi'] },
  { d: 'Kanpur', s: 'Uttar Pradesh', keys: ['kanpur'] },
  { d: 'Lucknow', s: 'Uttar Pradesh', keys: ['lucknow'] },
  { d: 'Mathura', s: 'Uttar Pradesh', keys: ['mathura', 'vrindavan'] },
  { d: 'Mau', s: 'Uttar Pradesh', keys: ['mau'] },
  { d: 'Meerut', s: 'Uttar Pradesh', keys: ['meerut'] },
  { d: 'Moradabad', s: 'Uttar Pradesh', keys: ['moradabad'] },
  { d: 'Muzaffarnagar', s: 'Uttar Pradesh', keys: ['muzaffarnagar'] },
  { d: 'Prayagraj', s: 'Uttar Pradesh', keys: ['allahabad', 'prayagraj'] },
  { d: 'Saharanpur', s: 'Uttar Pradesh', keys: ['saharanpur'] },
  { d: 'Varanasi', s: 'Uttar Pradesh', keys: ['varanasi', 'banaras', 'kashi'] },
  // Uttarakhand
  { d: 'Dehradun', s: 'Uttarakhand', keys: ['dehradun', 'ddn', 'rishikesh', 'mussoorie'] },
  { d: 'Haridwar', s: 'Uttarakhand', keys: ['haridwar', 'roorkee', 'laksar'] },
  { d: 'Nainital', s: 'Uttarakhand', keys: ['haldwani', 'nainital', 'kaladhungi', 'rudrapur', 'pantnagar', 'kashipur', 'ramnagar'] },
  // Rajasthan
  { d: 'Jaipur', s: 'Rajasthan', keys: ['jaipur'] },
  { d: 'Jodhpur', s: 'Rajasthan', keys: ['jodhpur'] },
  { d: 'Kota', s: 'Rajasthan', keys: ['kota'] },
  { d: 'Ajmer', s: 'Rajasthan', keys: ['ajmer', 'kishangarh'] },
  { d: 'Bhilwara', s: 'Rajasthan', keys: ['bhilwara'] },
  { d: 'Udaipur', s: 'Rajasthan', keys: ['udaipur'] },
  { d: 'Jhunjhunu', s: 'Rajasthan', keys: ['jhunjhunu'] },
  { d: 'Bikaner', s: 'Rajasthan', keys: ['bikaner'] },
  // Gujarat
  { d: 'Ahmedabad', s: 'Gujarat', keys: ['ahmedabad', 'amd', 'sanand', 'changodar'] },
  { d: 'Surat', s: 'Gujarat', keys: ['surat', 'khatodara'] },
  { d: 'Vadodara', s: 'Gujarat', keys: ['vadodara', 'baroda', 'vaodadara'] },
  { d: 'Rajkot', s: 'Gujarat', keys: ['rajkot'] },
  { d: 'Jamnagar', s: 'Gujarat', keys: ['jamnagar'] },
  // Maharashtra
  { d: 'Mumbai', s: 'Maharashtra', keys: ['mumbai', 'bombay', 'andheri', 'bandra', 'borivali', 'dadar'] },
  { d: 'Thane', s: 'Maharashtra', keys: ['thane', 'kalyan', 'dombivli', 'mira bhayandar', 'navi mumbai'] },
  { d: 'Pune', s: 'Maharashtra', keys: ['pune', 'ravet', 'pcmc', 'pimpri', 'chinchwad', 'hadapsar', 'hinjawadi'] },
  { d: 'Nagpur', s: 'Maharashtra', keys: ['nagpur'] },
  { d: 'Nashik', s: 'Maharashtra', keys: ['nashik'] },
  { d: 'Chhatrapati Sambhajinagar', s: 'Maharashtra', keys: ['aurangabad', 'sambhaji nagar'] },
  { d: 'Nanded', s: 'Maharashtra', keys: ['nanded'] },
  { d: 'Dhule', s: 'Maharashtra', keys: ['dhule'] },
  { d: 'Ahmednagar', s: 'Maharashtra', keys: ['ahmednagar'] },
  { d: 'Kolhapur', s: 'Maharashtra', keys: ['kolhapur', 'phulewadi'] },
  // Madhya Pradesh
  { d: 'Indore', s: 'Madhya Pradesh', keys: ['indore', 'pithampur'] },
  { d: 'Bhopal', s: 'Madhya Pradesh', keys: ['bhopal', 'mandideep'] },
  { d: 'Gwalior', s: 'Madhya Pradesh', keys: ['gwalior'] },
  { d: 'Jabalpur', s: 'Madhya Pradesh', keys: ['jabalpur'] },
  { d: 'Rewa', s: 'Madhya Pradesh', keys: ['rewa'] },
  { d: 'Dewas', s: 'Madhya Pradesh', keys: ['dewas'] },
  { d: 'Ujjain', s: 'Madhya Pradesh', keys: ['ujjain'] },
  // Chhattisgarh
  { d: 'Raipur', s: 'Chhattisgarh', keys: ['raipur'] },
  { d: 'Bilaspur', s: 'Chhattisgarh', keys: ['bilaspur'] },
  { d: 'Baloda Bazar', s: 'Chhattisgarh', keys: ['baloda bazar'] },
  { d: 'Durg', s: 'Chhattisgarh', keys: ['bhilai', 'durg'] },
  // Bihar & Jharkhand
  { d: 'Patna', s: 'Bihar', keys: ['patna', 'kankarbagh', 'danapur'] },
  { d: 'Gaya', s: 'Bihar', keys: ['gaya'] },
  { d: 'Bhagalpur', s: 'Bihar', keys: ['bhagalpur'] },
  { d: 'Muzaffarpur', s: 'Bihar', keys: ['muzaffarpur'] },
  { d: 'Ranchi', s: 'Jharkhand', keys: ['ranchi'] },
  { d: 'Jamshedpur', s: 'Jharkhand', keys: ['jamshedpur', 'tatanagar'] },
  { d: 'Dhanbad', s: 'Jharkhand', keys: ['dhanbad'] },
  // West Bengal & Odisha
  { d: 'Kolkata', s: 'West Bengal', keys: ['kolkata', 'calcutta'] },
  { d: 'Howrah', s: 'West Bengal', keys: ['howrah'] },
  { d: 'Asansol', s: 'West Bengal', keys: ['asansol'] },
  { d: 'Siliguri', s: 'West Bengal', keys: ['siliguri'] },
  { d: 'Cuttack', s: 'Odisha', keys: ['cuttack'] },
  { d: 'Bhubaneswar', s: 'Odisha', keys: ['bhubaneswar'] },
  { d: 'Sundargarh', s: 'Odisha', keys: ['bahal', 'rourkela'] },
  // North East
  { d: 'Imphal', s: 'Manipur', keys: ['imphal', 'manipur'] },
  { d: 'Agartala', s: 'Tripura', keys: ['agartala', 'tripura'] },
  // South
  { d: 'Bengaluru', s: 'Karnataka', keys: ['bengaluru', 'bangalore', 'blr', 'whitefield', 'electronic city'] },
  { d: 'Hyderabad', s: 'Telangana', keys: ['hyderabad', 'hyd', 'secunderabad'] },
  { d: 'Chennai', s: 'Tamil Nadu', keys: ['chennai', 'madras'] },
  { d: 'Coimbatore', s: 'Tamil Nadu', keys: ['coimbatore', 'cjb'] },
  { d: 'Salem', s: 'Tamil Nadu', keys: ['salem'] },
  { d: 'Ernakulam', s: 'Kerala', keys: ['kochi', 'cochin', 'ernakulam'] },
  { d: 'Thiruvananthapuram', s: 'Kerala', keys: ['trivandrum', 'thiruvananthapuram'] },
  { d: 'Palakkad', s: 'Kerala', keys: ['palakkad', 'pathiripala'] },
  { d: 'Alappuzha', s: 'Kerala', keys: ['alappuzha', 'alleppey'] },
  { d: 'Kollam', s: 'Kerala', keys: ['kollam', 'quilon'] }
];

/**
 * Resolves District and State for a docket using stored data, address, destination, and pincode
 */
export const resolveDistrictAndState = (
  docket: FullDocket
): { district: string; state: string; pincode: string } => {
  let district = (docket.ConsigneeDistrict || '').trim();
  let state = (docket.ConsigneeState || '').trim();
  let pincode = (docket.ConsigneePinCode || '').trim();

  // If district is mistakenly stored as full address / long sentence, reset it
  if (district.length >= 35) {
    district = '';
  }

  // Normalize state if it matches abbreviation (e.g. "UK" -> "Uttarakhand", "HR" -> "Haryana")
  const stateLower = state.toLowerCase();
  if (state && STATE_ALIASES[stateLower]) {
    state = STATE_ALIASES[stateLower];
  }

  // Extract pincode from address if missing
  if (!pincode && docket.ConsigneeAddress) {
    const pinMatch = docket.ConsigneeAddress.match(/\b[1-9][0-9]{5}\b/);
    if (pinMatch) {
      pincode = pinMatch[0];
    }
  }

  // If both district and state already present and clean, return directly
  if (district && state) {
    return { district, state, pincode };
  }

  // 0. Check exact 6-digit Pincode mapping / cache
  if (pincode && pincode.length === 6) {
    const pinInfo = getCachedPincodeInfo(pincode);
    if (pinInfo) {
      if (!district && pinInfo.district) district = pinInfo.district;
      if (!state && pinInfo.state) state = pinInfo.state;
      if (district && state) {
        return { district, state, pincode };
      }
    }
  }

  const destStr = (docket.Destination || '').trim();
  const destLower = destStr.toLowerCase();
  const addrStr = (docket.ConsigneeAddress || '').trim();
  const fullText = `${destLower} ${addrStr.toLowerCase()}`;

  // 1. Match from DISTRICT_CITIES dictionary
  for (const item of DISTRICT_CITIES) {
    for (const key of item.keys) {
      const regex = new RegExp(`(?:^|[^a-z0-9])${key}(?:$|[^a-z0-9])`, 'i');
      if (regex.test(fullText)) {
        if (!district) district = item.d;
        if (!state) state = item.s;
        break;
      }
    }
    if (district && state) break;
  }

  // 2. Check 3-digit pincode map
  if (pincode && pincode.length >= 3) {
    const p3 = pincode.slice(0, 3);
    if (PIN3_MAP[p3]) {
      if (!district) district = PIN3_MAP[p3].d;
      if (!state) state = PIN3_MAP[p3].s;
    }
  }

  // 3. Fallback state from 2-digit pincode postal circle
  if (!state && pincode && pincode.length >= 2) {
    const p2 = parseInt(pincode.slice(0, 2), 10);
    const p3 = parseInt(pincode.slice(0, 3), 10);

    if (p3 === 160) state = 'Chandigarh';
    else if ((p3 >= 246 && p3 <= 249) || (p3 >= 262 && p3 <= 263)) state = 'Uttarakhand';
    else if (p3 === 403) state = 'Goa';
    else if (p3 >= 500 && p3 <= 509) state = 'Telangana';
    else if (p3 >= 515 && p3 <= 535) state = 'Andhra Pradesh';
    else if (p3 === 737) state = 'Sikkim';
    else if (p3 === 744) state = 'Andaman & Nicobar Islands';
    else if (p2 === 11) state = 'Delhi';
    else if (p2 >= 12 && p2 <= 13) state = 'Haryana';
    else if (p2 >= 14 && p2 <= 16) state = 'Punjab';
    else if (p2 === 17) state = 'Himachal Pradesh';
    else if (p2 >= 18 && p2 <= 19) state = 'Jammu & Kashmir';
    else if (p2 >= 20 && p2 <= 28) state = 'Uttar Pradesh';
    else if (p2 >= 30 && p2 <= 34) state = 'Rajasthan';
    else if (p2 >= 36 && p2 <= 39) state = 'Gujarat';
    else if (p2 >= 40 && p2 <= 44) state = 'Maharashtra';
    else if (p2 >= 45 && p2 <= 48) state = 'Madhya Pradesh';
    else if (p2 === 49) state = 'Chhattisgarh';
    else if (p2 >= 50 && p2 <= 53) state = 'Andhra Pradesh';
    else if (p2 >= 56 && p2 <= 59) state = 'Karnataka';
    else if (p2 >= 60 && p2 <= 64) state = 'Tamil Nadu';
    else if (p2 >= 67 && p2 <= 69) state = 'Kerala';
    else if (p2 >= 70 && p2 <= 74) state = 'West Bengal';
    else if (p2 >= 75 && p2 <= 77) state = 'Odisha';
    else if (p2 === 78) state = 'Assam';
    else if (p2 >= 80 && p2 <= 85) state = 'Bihar';
  }

  // 4. Fallback state from destination if destination was state code
  if (!state && STATE_ALIASES[destLower]) {
    state = STATE_ALIASES[destLower];
  }

  // 5. Fallback district from destination if reasonable short name
  if (!district && destStr && destStr.length < 25 && !STATE_ALIASES[destLower]) {
    // Capitalize destination name
    district = destStr
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  // If still no district, fallback to state
  if (!district && state) {
    district = state;
  }

  return { district, state, pincode };
};

/**
 * Helper to parse any date string into a numeric timestamp
 */
export const parseDateToTimestamp = (dateStr?: string | null): number => {
  if (!dateStr) return 0;
  // If DD/MM/YYYY or DD-MM-YYYY format
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(dateStr)) {
    const parts = dateStr.split(/[\/-]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  const timestamp = new Date(dateStr).getTime();
  return isNaN(timestamp) ? 0 : timestamp;
};

/**
 * Compare two dockets chronologically (Oldest -> Newest)
 */
export const compareDockets = (a: FullDocket, b: FullDocket): number => {
  const timeA = parseDateToTimestamp(a.ShipDate) || parseDateToTimestamp(a.CreatedAt);
  const timeB = parseDateToTimestamp(b.ShipDate) || parseDateToTimestamp(b.CreatedAt);
  if (timeA !== timeB) {
    return timeA - timeB;
  }
  const createdA = parseDateToTimestamp(a.CreatedAt);
  const createdB = parseDateToTimestamp(b.CreatedAt);
  if (createdA !== createdB) {
    return createdA - createdB;
  }
  const idA = a.Id || (a as any).DocketId || 0;
  const idB = b.Id || (b as any).DocketId || 0;
  if (idA !== idB) {
    return idA - idB;
  }
  return (a.DocketNo || '').localeCompare(b.DocketNo || '');
};

/**
 * Formats full destination address including Consignee Address and Pin Code
 * e.g. "SHOP NO. 3, MOTIA HUES, OPPOSITE CHINAR HOMES, PEERMUCHALLA ROAD, ZIRAKPUR, PUNJAB – 160104"
 */
export const formatFullDestinationAddress = (
  address?: string,
  pincode?: string,
  fallbackDestination?: string
): string => {
  let rawAddr = (address || '').trim().replace(/,\s*,/g, ',').replace(/[\s,\-]+$/, '');
  const pin = (pincode || '').trim();

  // If no ConsigneeAddress, fallback to Destination
  if (!rawAddr) {
    rawAddr = (fallbackDestination || '').trim().replace(/[\s,\-]+$/, '');
  }

  if (!rawAddr) {
    return pin ? pin : '';
  }

  // If pincode is already included in rawAddr, avoid duplicating it
  if (pin && rawAddr.includes(pin)) {
    return rawAddr;
  }

  // Append Pin Code with ' – '
  if (pin) {
    return `${rawAddr} – ${pin}`;
  }

  return rawAddr;
};

/**
 * Transforms an array of FullDockets into flattened MasterSheetRows matching the Google Sheet / PDF.
 * sortOrder: 'desc' = latest docket first on top (for UI dashboard view)
 * sortOrder: 'asc'  = oldest docket first, latest at bottom (for Excel & CSV download)
 */
export const transformDocketsToMasterRows = (
  dockets: FullDocket[], 
  sortOrder: 'asc' | 'desc' = 'desc'
): MasterSheetRow[] => {
  const rows: MasterSheetRow[] = [];
  let srCounter = 1;

  // 'desc' => Latest at top (UI view)
  // 'asc'  => Oldest at top -> Latest at bottom (Excel export)
  const sortedDockets = [...dockets].sort((a, b) => {
    return sortOrder === 'desc' ? compareDockets(b, a) : compareDockets(a, b);
  });

  // Calculate how many rows / entries exist for each same DOCKET
  const docketCounts: Record<string, number> = {};
  sortedDockets.forEach((docket) => {
    const dNo = (docket.DocketNo || '').toUpperCase();
    const count = (docket.shipments && docket.shipments.length > 0) ? docket.shipments.length : 1;
    docketCounts[dNo] = (docketCounts[dNo] || 0) + count;
  });

  sortedDockets.forEach((docket) => {
    const docketNoUpper = (docket.DocketNo || '').toUpperCase();
    const sameDocketCount = docketCounts[docketNoUpper] || (docket.shipments?.length || 1);
    const formattedDate = formatDateDisplay(docket.ShipDate, '/');
    const formattedDeliveryDate = docket.DeliveryDate ? formatDateDisplay(docket.DeliveryDate, '-') : '';

    // Status formatting: Agar pending hai toh Excel me PENDING nahi aayega (blank rahega)
    let statusText = '';
    if (docket.status === 1 || docket.Status?.toLowerCase() === 'completed') {
      statusText = 'DELIVERED';
    } else if (docket.Status && docket.Status.toLowerCase() !== 'pending') {
      statusText = docket.Status.toUpperCase();
    }

    // Auto-resolve District, State, and Pincode
    const resolved = resolveDistrictAndState(docket);

    const shipments = (docket.shipments && docket.shipments.length > 0)
      ? docket.shipments
      : [{
          NoOfBox: 1,
          ActualWeight: 0,
          Length: 0,
          Width: 0,
          Height: 0
        }];

    shipments.forEach((shipment) => {
      const boxes = Number(shipment.NoOfBox) || 1;
      const weight = Number(shipment.ActualWeight) || 0;
      const length = Number(shipment.Length) || 0;
      const breadth = Number(shipment.Width) || 0;
      const height = Number(shipment.Height) || 0;

      // Volumetric weight formula: R2*S2*T2/5000 (Length * Breadth * Height / 5000)
      let volWeight = 0;
      let dimension = '';
      if (length > 0 && breadth > 0 && height > 0) {
        dimension = `${length}×${breadth}×${height}=${boxes}`;
        volWeight = Number(((length * breadth * height) / 5000).toFixed(4));
      }

      // Charged weight formula: =MAX(R2, V2) (i.e. MAX of Length and Vol. Weight)
      // When dimensions are present: MAX(length, volWeight)
      // When dimensions are 0 / absent: fallback to actual weight
      const chargedWeight = (length > 0 && breadth > 0 && height > 0)
        ? Math.max(length, volWeight)
        : (weight || 0);

      const modeUpper = (docket.ModeOfTransport || 'ROAD').toUpperCase();
      const resolvedPin = (docket.ConsigneePinCode || resolved.pincode || '').trim();

      const fullDestination = formatFullDestinationAddress(
        docket.ConsigneeAddress,
        resolvedPin,
        docket.Destination
      ).toUpperCase();

      const emp = (docket.PickupEmployee || '').trim().toUpperCase();
      const isKnownForwarder = ['DTDC', 'BLUEDART', 'TRACKON', 'DELHIVERY', 'FEDEX', 'MARUTI', 'TIRUPATI', 'PROFESSIONAL'].includes(emp);
      const forwarder = isKnownForwarder ? emp : '-';
      const awb = (docket.EwayBillNo || '').trim().toUpperCase();
      const trackingNo = awb || '-';

      rows.push({
        srNo: srCounter++,
        through: 'VIN WORLD EXPRESS PVT LTD',
        date: formattedDate,
        docketNo: (docket.DocketNo || '').toUpperCase(),
        consignor: (docket.ConsignorName || '').replace(/\s*\([^)]*\)/g, '').trim().toUpperCase(),
        consignee: (docket.ConsigneeName || '').toUpperCase(),
        mode: modeUpper,
        roadAir: modeUpper === 'AIR' ? 'AIR' : 'ROAD',
        origin: (docket.Origin || '').toUpperCase(),
        destination: fullDestination,
        district: (resolved.district || '').toUpperCase(),
        state: (resolved.state || '').toUpperCase(),
        pincode: resolvedPin.toUpperCase(),
        oda: 'NA',
        charges: 'NIL',
        odaCharges: 'NA',
        billedPaid: 'NIL',
        boxes,
        weight,
        length,
        breadth,
        height,
        dimension,
        volWeight,
        chargedWeight,
        invoiceNo: (docket.InvoiceNumber || '').toUpperCase(),
        invoiceValue: docket.InvoiceValue ? String(docket.InvoiceValue).toUpperCase() : '',
        contactNo: (docket.ConsigneeMobile || docket.ConsignorMobile || '').toUpperCase(),
        totalBox: sameDocketCount,
        fwAwbNo: forwarder,
        fwName: trackingNo,
        fw: forwarder,
        awbNo: awb || '-',
        status: statusText.toUpperCase(),
        deliveryDate: formattedDeliveryDate.toUpperCase(),
        remarks: (docket.Declaration || '').toUpperCase(),
        rawDocket: docket,
      });
    });
  });

  return rows;
};

/**
 * Export rows to real Microsoft Excel (.xlsx) file (Oldest at top -> Latest at bottom)
 */
export const exportToExcel = (rows: MasterSheetRow[], filename = 'Master_Pickup_Delivery_data.xlsx') => {
  // Ensure rows are sorted chronologically: Oldest at top -> Latest at bottom
  const exportRows = [...rows].sort((a, b) => {
    if (a.rawDocket && b.rawDocket) {
      return compareDockets(a.rawDocket, b.rawDocket);
    }
    return 0;
  });

  const exportData = exportRows.map((r, idx) => ({
    'Sr.No': idx + 1,
    'THROUGH': (r.through || '').toUpperCase(),
    'DATE': (r.date || '').toUpperCase(),
    'DOCKET': (r.docketNo || '').toUpperCase(),
    'CONSIGNOR': (r.consignor || '').replace(/\s*\([^)]*\)/g, '').trim().toUpperCase(),
    'CONSIGNEE': (r.consignee || '').toUpperCase(),
    'MODE\nRoad/Air': (r.roadAir || r.mode || 'ROAD').toUpperCase(),
    'ORIGIN': (r.origin || '').toUpperCase(),
    'DESTINATION': (r.destination || '').toUpperCase(),
    'DISTRICT': (r.district || '').toUpperCase(),
    'STATE': (r.state || '').toUpperCase(),
    'Pin Code': (r.pincode || '').toUpperCase(),
    'ODA': (r.oda || 'NA').toUpperCase(),
    'CHARGES': (r.charges || 'NIL').toUpperCase(),
    'BILLED/PAID': (r.billedPaid || 'NIL').toUpperCase(),
    'BOXES': r.boxes,
    'Weight': r.weight,
    'Length': r.length,
    'Breadth': r.breadth,
    'Height': r.height,
    'Dimension': (r.dimension || '').toUpperCase(),
    'Vol. Weight': r.volWeight,
    'Charged weight': r.chargedWeight,
    'Invoice No': (r.invoiceNo || '').toUpperCase(),
    'Invoice value': (r.invoiceValue || '').toUpperCase(),
    'Contact No': (r.contactNo || '').toUpperCase(),
    'total BOX': r.totalBox,
    'F/W\nAWB NO.': (r.fwAwbNo || '-').toUpperCase(),
    'F/W NAME': (r.fwName || '-').toUpperCase(),
    'STATUS': (r.status || '').toUpperCase(),
    'DELIVERY DATE': (r.deliveryDate || '').toUpperCase(),
    'REMARKS': (r.remarks || '').toUpperCase(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Apply exact Excel formula:
  // Vol. Weight (Col V): =R2*S2*T2/5000 (Length * Breadth * Height / 5000)
  // Charged weight (Col W): =MAX(Q2,V2) (MAX of Weight and Vol. Weight)
  exportRows.forEach((r, idx) => {
    const rowNum = idx + 2; // Data starts at row 2 in Excel
    if (r.length > 0 && r.breadth > 0 && r.height > 0) {
      worksheet[`V${rowNum}`] = {
        t: 'n',
        v: r.volWeight,
        f: `R${rowNum}*S${rowNum}*T${rowNum}/5000`
      };
      worksheet[`W${rowNum}`] = {
        t: 'n',
        v: r.chargedWeight,
        f: `MAX(Q${rowNum},V${rowNum})`
      };
    } else {
      worksheet[`W${rowNum}`] = {
        t: 'n',
        v: r.chargedWeight
      };
    }
  });

  // Set nice column widths (31 columns matching Master Google Sheet)
  worksheet['!cols'] = [
    { wch: 6 },  // Sr.No (A)
    { wch: 25 }, // THROUGH (B)
    { wch: 12 }, // DATE (C)
    { wch: 16 }, // DOCKET (D)
    { wch: 20 }, // CONSIGNOR (E)
    { wch: 20 }, // CONSIGNEE (F)
    { wch: 12 }, // MODE Road/Air (G)
    { wch: 12 }, // ORIGIN (H)
    { wch: 35 }, // DESTINATION (I)
    { wch: 15 }, // DISTRICT (J)
    { wch: 15 }, // STATE (K)
    { wch: 10 }, // Pin Code (L)
    { wch: 10 }, // ODA (M)
    { wch: 10 }, // CHARGES (N)
    { wch: 12 }, // BILLED/PAID (O)
    { wch: 8 },  // BOXES (P)
    { wch: 10 }, // Weight (Q)
    { wch: 8 },  // Length (R)
    { wch: 8 },  // Breadth (S)
    { wch: 8 },  // Height (T)
    { wch: 16 }, // Dimension (U)
    { wch: 12 }, // Vol. Weight (V)
    { wch: 14 }, // Charged weight (W)
    { wch: 14 }, // Invoice No (X)
    { wch: 14 }, // Invoice value (Y)
    { wch: 14 }, // Contact No (Z)
    { wch: 10 }, // total BOX (AA)
    { wch: 14 }, // F/W AWB NO. (AB)
    { wch: 16 }, // F/W NAME (AC)
    { wch: 14 }, // STATUS (AD)
    { wch: 14 }, // DELIVERY DATE (AE)
    { wch: 20 }, // REMARKS (AF)
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Pickup Delivery');
  XLSX.writeFile(workbook, filename);
};

/**
 * Export rows to CSV format (Oldest at top -> Latest at bottom)
 */
export const exportToCSV = (rows: MasterSheetRow[], filename = 'Master_Pickup_Delivery_data.csv') => {
  // Ensure rows are sorted chronologically: Oldest at top -> Latest at bottom
  const exportRows = [...rows].sort((a, b) => {
    if (a.rawDocket && b.rawDocket) {
      return compareDockets(a.rawDocket, b.rawDocket);
    }
    return 0;
  });

  const headers = [
    'Sr.No', 'THROUGH', 'DATE', 'DOCKET', 'CONSIGNOR', 'CONSIGNEE',
    'MODE Road/Air', 'ORIGIN', 'DESTINATION', 'DISTRICT', 'STATE', 'Pin Code',
    'ODA', 'CHARGES', 'BILLED/PAID', 'BOXES', 'Weight', 'Length', 'Breadth', 'Height',
    'Dimension', 'Vol. Weight', 'Charged weight', 'Invoice No', 'Invoice value',
    'Contact No', 'total BOX', 'F/W AWB NO.', 'F/W NAME', 'STATUS', 'DELIVERY DATE', 'REMARKS'
  ];

  const csvRows = [headers.join(',')];

  exportRows.forEach((r, idx) => {
    const values = [
      idx + 1,
      `"${(r.through || '').toUpperCase().replace(/"/g, '""')}"`,
      `"${(r.date || '').toUpperCase()}"`,
      `"${(r.docketNo || '').toUpperCase()}"`,
      `"${(r.consignor || '').replace(/\s*\([^)]*\)/g, '').trim().toUpperCase().replace(/"/g, '""')}"`,
      `"${(r.consignee || '').toUpperCase().replace(/"/g, '""')}"`,
      `"${(r.roadAir || r.mode || 'ROAD').toUpperCase()}"`,
      `"${(r.origin || '').toUpperCase().replace(/"/g, '""')}"`,
      `"${(r.destination || '').toUpperCase().replace(/"/g, '""')}"`,
      `"${(r.district || '').toUpperCase().replace(/"/g, '""')}"`,
      `"${(r.state || '').toUpperCase().replace(/"/g, '""')}"`,
      `"${(r.pincode || '').toUpperCase()}"`,
      `"${(r.oda || 'NA').toUpperCase()}"`,
      `"${(r.charges || 'NIL').toUpperCase()}"`,
      `"${(r.billedPaid || 'NIL').toUpperCase()}"`,
      r.boxes,
      r.weight,
      r.length,
      r.breadth,
      r.height,
      `"${(r.dimension || '').toUpperCase()}"`,
      r.volWeight,
      r.chargedWeight,
      `"${(r.invoiceNo || '').toUpperCase()}"`,
      `"${(r.invoiceValue || '').toUpperCase()}"`,
      `"${(r.contactNo || '').toUpperCase()}"`,
      r.totalBox,
      `"${(r.fwAwbNo || '-').toUpperCase()}"`,
      `"${(r.fwName || '-').toUpperCase()}"`,
      `"${(r.status || '').toUpperCase()}"`,
      `"${(r.deliveryDate || '').toUpperCase()}"`,
      `"${(r.remarks || '').toUpperCase().replace(/"/g, '""')}"`
    ];
    csvRows.push(values.join(','));
  });

  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
