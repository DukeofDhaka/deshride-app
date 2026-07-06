import { haversineKm } from "../lib/geo";
import { ADMIN_AREAS_BY_DISTRICT } from "./adminAreas";

export interface Place {
  name: string;
  division: string;
  lat: number;
  lng: number;
  kind?: "district" | "area";
  district?: string;
  aliases?: string[];
}

// All 64 districts of Bangladesh, coordinates at the district headquarters.
export const DISTRICTS: Place[] = [
  // Dhaka division
  { name: "Dhaka", division: "Dhaka", lat: 23.81, lng: 90.41 },
  { name: "Gazipur", division: "Dhaka", lat: 23.99, lng: 90.42 },
  { name: "Narayanganj", division: "Dhaka", lat: 23.62, lng: 90.5 },
  { name: "Tangail", division: "Dhaka", lat: 24.25, lng: 89.92 },
  { name: "Kishoreganj", division: "Dhaka", lat: 24.44, lng: 90.78 },
  { name: "Manikganj", division: "Dhaka", lat: 23.86, lng: 90.0 },
  { name: "Munshiganj", division: "Dhaka", lat: 23.55, lng: 90.53 },
  { name: "Faridpur", division: "Dhaka", lat: 23.61, lng: 89.84 },
  { name: "Rajbari", division: "Dhaka", lat: 23.76, lng: 89.64 },
  { name: "Gopalganj", division: "Dhaka", lat: 23.01, lng: 89.82 },
  { name: "Madaripur", division: "Dhaka", lat: 23.17, lng: 90.21 },
  { name: "Shariatpur", division: "Dhaka", lat: 23.24, lng: 90.43 },
  { name: "Narsingdi", division: "Dhaka", lat: 23.92, lng: 90.72 },
  // Chattogram division
  { name: "Chattogram", aliases: ["Chittagong"], division: "Chattogram", lat: 22.36, lng: 91.83 },
  { name: "Cox's Bazar", division: "Chattogram", lat: 21.44, lng: 91.97 },
  { name: "Cumilla", aliases: ["Comilla"], division: "Chattogram", lat: 23.46, lng: 91.18 },
  { name: "Brahmanbaria", division: "Chattogram", lat: 23.96, lng: 91.11 },
  { name: "Chandpur", division: "Chattogram", lat: 23.23, lng: 90.67 },
  { name: "Lakshmipur", division: "Chattogram", lat: 22.94, lng: 90.83 },
  { name: "Noakhali", division: "Chattogram", lat: 22.87, lng: 91.1 },
  { name: "Feni", division: "Chattogram", lat: 23.02, lng: 91.4 },
  { name: "Khagrachhari", division: "Chattogram", lat: 23.1, lng: 91.98 },
  { name: "Rangamati", division: "Chattogram", lat: 22.65, lng: 92.17 },
  { name: "Bandarban", division: "Chattogram", lat: 22.2, lng: 92.22 },
  // Rajshahi division
  { name: "Rajshahi", division: "Rajshahi", lat: 24.37, lng: 88.6 },
  { name: "Natore", division: "Rajshahi", lat: 24.41, lng: 89.0 },
  { name: "Naogaon", division: "Rajshahi", lat: 24.79, lng: 88.93 },
  { name: "Chapainawabganj", division: "Rajshahi", lat: 24.6, lng: 88.27 },
  { name: "Pabna", division: "Rajshahi", lat: 24.0, lng: 89.24 },
  { name: "Sirajganj", division: "Rajshahi", lat: 24.45, lng: 89.71 },
  { name: "Bogura", aliases: ["Bogra"], division: "Rajshahi", lat: 24.85, lng: 89.37 },
  { name: "Joypurhat", division: "Rajshahi", lat: 25.1, lng: 89.02 },
  // Khulna division
  { name: "Khulna", division: "Khulna", lat: 22.82, lng: 89.55 },
  { name: "Jashore", aliases: ["Jessore"], division: "Khulna", lat: 23.17, lng: 89.21 },
  { name: "Satkhira", division: "Khulna", lat: 22.72, lng: 89.07 },
  { name: "Bagerhat", division: "Khulna", lat: 22.65, lng: 89.79 },
  { name: "Narail", division: "Khulna", lat: 23.17, lng: 89.5 },
  { name: "Magura", division: "Khulna", lat: 23.49, lng: 89.42 },
  { name: "Jhenaidah", division: "Khulna", lat: 23.54, lng: 89.15 },
  { name: "Kushtia", division: "Khulna", lat: 23.9, lng: 89.12 },
  { name: "Chuadanga", division: "Khulna", lat: 23.64, lng: 88.86 },
  { name: "Meherpur", division: "Khulna", lat: 23.76, lng: 88.63 },
  // Barishal division
  { name: "Barishal", aliases: ["Barisal"], division: "Barishal", lat: 22.7, lng: 90.37 },
  { name: "Bhola", division: "Barishal", lat: 22.69, lng: 90.64 },
  { name: "Patuakhali", division: "Barishal", lat: 22.36, lng: 90.33 },
  { name: "Pirojpur", division: "Barishal", lat: 22.58, lng: 89.97 },
  { name: "Jhalokati", division: "Barishal", lat: 22.64, lng: 90.2 },
  { name: "Barguna", division: "Barishal", lat: 22.16, lng: 90.13 },
  // Sylhet division
  { name: "Sylhet", division: "Sylhet", lat: 24.9, lng: 91.87 },
  { name: "Moulvibazar", division: "Sylhet", lat: 24.48, lng: 91.78 },
  { name: "Habiganj", division: "Sylhet", lat: 24.38, lng: 91.41 },
  { name: "Sunamganj", division: "Sylhet", lat: 25.07, lng: 91.4 },
  // Rangpur division
  { name: "Rangpur", division: "Rangpur", lat: 25.75, lng: 89.25 },
  { name: "Dinajpur", division: "Rangpur", lat: 25.63, lng: 88.64 },
  { name: "Thakurgaon", division: "Rangpur", lat: 26.03, lng: 88.47 },
  { name: "Panchagarh", division: "Rangpur", lat: 26.34, lng: 88.55 },
  { name: "Nilphamari", division: "Rangpur", lat: 25.93, lng: 88.86 },
  { name: "Lalmonirhat", division: "Rangpur", lat: 25.92, lng: 89.45 },
  { name: "Kurigram", division: "Rangpur", lat: 25.81, lng: 89.65 },
  { name: "Gaibandha", division: "Rangpur", lat: 25.33, lng: 89.53 },
  // Mymensingh division
  { name: "Mymensingh", division: "Mymensingh", lat: 24.75, lng: 90.4 },
  { name: "Jamalpur", division: "Mymensingh", lat: 24.94, lng: 89.94 },
  { name: "Sherpur", division: "Mymensingh", lat: 25.02, lng: 90.02 },
  { name: "Netrokona", division: "Mymensingh", lat: 24.88, lng: 90.73 }
];

// Neighbourhood-level pickup points inside the biggest cities, so drivers can
// post from their locality and riders can meet nearby instead of "Dhaka".
export const AREAS: Place[] = [
  // Dhaka
  { name: "Mohammadpur", district: "Dhaka", division: "Dhaka", lat: 23.7654, lng: 90.3563, kind: "area" },
  { name: "Uttara", district: "Dhaka", division: "Dhaka", lat: 23.8759, lng: 90.3795, kind: "area" },
  { name: "Gulshan", district: "Dhaka", division: "Dhaka", lat: 23.7925, lng: 90.4078, kind: "area" },
  { name: "Banani", district: "Dhaka", division: "Dhaka", lat: 23.7937, lng: 90.4007, kind: "area" },
  { name: "Mirpur", district: "Dhaka", division: "Dhaka", lat: 23.8223, lng: 90.3654, kind: "area" },
  { name: "Dhanmondi", district: "Dhaka", division: "Dhaka", lat: 23.7461, lng: 90.3742, kind: "area" },
  { name: "Bashundhara", district: "Dhaka", division: "Dhaka", lat: 23.8195, lng: 90.4232, kind: "area" },
  { name: "Mohakhali", district: "Dhaka", division: "Dhaka", lat: 23.7778, lng: 90.4057, kind: "area" },
  { name: "Farmgate", district: "Dhaka", division: "Dhaka", lat: 23.7576, lng: 90.3897, kind: "area" },
  { name: "Motijheel", district: "Dhaka", division: "Dhaka", lat: 23.7331, lng: 90.4172, kind: "area" },
  { name: "Badda", district: "Dhaka", division: "Dhaka", lat: 23.7807, lng: 90.4265, kind: "area" },
  { name: "Khilgaon", district: "Dhaka", division: "Dhaka", lat: 23.7519, lng: 90.4254, kind: "area" },
  { name: "Jatrabari", district: "Dhaka", division: "Dhaka", lat: 23.7104, lng: 90.4349, kind: "area" },
  { name: "Gabtoli", district: "Dhaka", division: "Dhaka", lat: 23.7831, lng: 90.3455, kind: "area" },
  { name: "Savar", district: "Dhaka", division: "Dhaka", lat: 23.8583, lng: 90.2667, kind: "area" },
  { name: "Malibagh", district: "Dhaka", division: "Dhaka", lat: 23.7490, lng: 90.4168, kind: "area" },
  { name: "Moghbazar", district: "Dhaka", division: "Dhaka", lat: 23.7494, lng: 90.4046, kind: "area" },
  { name: "Shyamoli", district: "Dhaka", division: "Dhaka", lat: 23.7725, lng: 90.3666, kind: "area" },
  { name: "Kalyanpur", district: "Dhaka", division: "Dhaka", lat: 23.7813, lng: 90.3621, kind: "area" },
  { name: "Keraniganj", district: "Dhaka", division: "Dhaka", lat: 23.6896, lng: 90.3854, kind: "area" },
  { name: "Demra", district: "Dhaka", division: "Dhaka", lat: 23.7224, lng: 90.4636, kind: "area" },
  { name: "Tongi", district: "Gazipur", division: "Dhaka", lat: 23.8864, lng: 90.3995, kind: "area" },
  // Chattogram
  { name: "GEC Circle", district: "Chattogram", division: "Chattogram", lat: 22.3595, lng: 91.8213, kind: "area" },
  { name: "Agrabad", district: "Chattogram", division: "Chattogram", lat: 22.3253, lng: 91.8131, kind: "area" },
  { name: "Muradpur", district: "Chattogram", division: "Chattogram", lat: 22.3684, lng: 91.8397, kind: "area" },
  { name: "Halishahar", district: "Chattogram", division: "Chattogram", lat: 22.3223, lng: 91.7719, kind: "area" },
  { name: "Pahartali", district: "Chattogram", division: "Chattogram", lat: 22.3646, lng: 91.7802, kind: "area" },
  { name: "New Market", district: "Chattogram", division: "Chattogram", lat: 22.3333, lng: 91.8333, kind: "area" },
  { name: "Chawkbazar", district: "Chattogram", division: "Chattogram", lat: 22.3569, lng: 91.8361, kind: "area" },
  { name: "Bahaddarhat", district: "Chattogram", division: "Chattogram", lat: 22.3789, lng: 91.8496, kind: "area" },
  { name: "Kotwali", district: "Chattogram", division: "Chattogram", lat: 22.3364, lng: 91.8415, kind: "area" },
  // Sylhet
  { name: "Amberkhana", district: "Sylhet", division: "Sylhet", lat: 24.9057, lng: 91.8672, kind: "area" },
  { name: "Zindabazar", district: "Sylhet", division: "Sylhet", lat: 24.8951, lng: 91.8687, kind: "area" },
  { name: "Bandar Bazar", district: "Sylhet", division: "Sylhet", lat: 24.8911, lng: 91.8683, kind: "area" },
  { name: "Shibganj", district: "Sylhet", division: "Sylhet", lat: 24.9038, lng: 91.8845, kind: "area" },
  { name: "Upashahar", district: "Sylhet", division: "Sylhet", lat: 24.8878, lng: 91.8885, kind: "area" },
  { name: "Subidbazar", district: "Sylhet", division: "Sylhet", lat: 24.9031, lng: 91.8546, kind: "area" },
  // Khulna
  { name: "Sonadanga", district: "Khulna", division: "Khulna", lat: 22.8202, lng: 89.5403, kind: "area" },
  { name: "Shibbari", district: "Khulna", division: "Khulna", lat: 22.8265, lng: 89.5532, kind: "area" },
  { name: "Dakbangla", district: "Khulna", division: "Khulna", lat: 22.8155, lng: 89.5651, kind: "area" },
  { name: "Boyra", district: "Khulna", division: "Khulna", lat: 22.8364, lng: 89.5398, kind: "area" },
  { name: "Khalishpur", district: "Khulna", division: "Khulna", lat: 22.8465, lng: 89.5376, kind: "area" },
  { name: "Nirala", district: "Khulna", division: "Khulna", lat: 22.8091, lng: 89.5484, kind: "area" },
  // Rajshahi
  { name: "Shaheb Bazar", district: "Rajshahi", division: "Rajshahi", lat: 24.3658, lng: 88.5983, kind: "area" },
  { name: "Kazla", district: "Rajshahi", division: "Rajshahi", lat: 24.3685, lng: 88.6276, kind: "area" },
  { name: "Motihar", district: "Rajshahi", division: "Rajshahi", lat: 24.3639, lng: 88.6288, kind: "area" },
  { name: "Baharampur", district: "Rajshahi", division: "Rajshahi", lat: 24.3803, lng: 88.5866, kind: "area" },
  { name: "Talaimari", district: "Rajshahi", division: "Rajshahi", lat: 24.3642, lng: 88.6186, kind: "area" },
  { name: "Binodpur", district: "Rajshahi", division: "Rajshahi", lat: 24.3663, lng: 88.6366, kind: "area" },
  // Barishal
  { name: "Nathullabad", district: "Barishal", division: "Barishal", lat: 22.7153, lng: 90.3524, kind: "area" },
  { name: "Rupatali", district: "Barishal", division: "Barishal", lat: 22.6826, lng: 90.3473, kind: "area" },
  { name: "Sadar Road", district: "Barishal", division: "Barishal", lat: 22.7010, lng: 90.3662, kind: "area" },
  { name: "Chawkbazar", district: "Barishal", division: "Barishal", lat: 22.6983, lng: 90.3680, kind: "area" },
  { name: "Amtala", district: "Barishal", division: "Barishal", lat: 22.6925, lng: 90.3592, kind: "area" },
  // Rangpur
  { name: "Dhap", district: "Rangpur", division: "Rangpur", lat: 25.7533, lng: 89.2458, kind: "area" },
  { name: "Carmichael College Area", district: "Rangpur", division: "Rangpur", lat: 25.7267, lng: 89.2552, kind: "area" },
  { name: "Modern More", district: "Rangpur", division: "Rangpur", lat: 25.7196, lng: 89.2526, kind: "area" },
  { name: "Jahaj Company More", district: "Rangpur", division: "Rangpur", lat: 25.7483, lng: 89.2520, kind: "area" },
  { name: "Lalbagh", district: "Rangpur", division: "Rangpur", lat: 25.7369, lng: 89.2536, kind: "area" },
  // Mymensingh
  { name: "Ganginarpar", district: "Mymensingh", division: "Mymensingh", lat: 24.7570, lng: 90.4042, kind: "area" },
  { name: "Kewatkhali", district: "Mymensingh", division: "Mymensingh", lat: 24.7431, lng: 90.4158, kind: "area" },
  { name: "Bhaluka", district: "Mymensingh", division: "Mymensingh", lat: 24.3800, lng: 90.3800, kind: "area" },
  { name: "Town Hall", district: "Mymensingh", division: "Mymensingh", lat: 24.7610, lng: 90.4025, kind: "area" },
  { name: "Notun Bazar", district: "Mymensingh", division: "Mymensingh", lat: 24.7554, lng: 90.4031, kind: "area" },
  { name: "Charpara", district: "Mymensingh", division: "Mymensingh", lat: 24.7475, lng: 90.4061, kind: "area" },
  // Cumilla
  { name: "Kandirpar", district: "Cumilla", division: "Chattogram", lat: 23.4589, lng: 91.1818, kind: "area" },
  { name: "Paduar Bazar", district: "Cumilla", division: "Chattogram", lat: 23.4277, lng: 91.1396, kind: "area" },
  { name: "Cantonment", district: "Cumilla", division: "Chattogram", lat: 23.4735, lng: 91.1252, kind: "area" },
  { name: "Chawkbazar", district: "Cumilla", division: "Chattogram", lat: 23.4542, lng: 91.1920, kind: "area" },
  { name: "Tomcham Bridge", district: "Cumilla", division: "Chattogram", lat: 23.4475, lng: 91.1788, kind: "area" },
  { name: "Police Line", district: "Cumilla", division: "Chattogram", lat: 23.4619, lng: 91.1772, kind: "area" }
];

export const EXTRA_AREAS: Place[] = [
  { name: "Kalabagan", aliases: ["Kolabagan", "Kalabagan Bus Stand"], district: "Dhaka", division: "Dhaka", lat: 23.7481, lng: 90.3812, kind: "area" },
  { name: "Science Lab", aliases: ["Science Laboratory"], district: "Dhaka", division: "Dhaka", lat: 23.7386, lng: 90.3831, kind: "area" },
  { name: "Shahbagh", aliases: ["Dhaka University", "DU"], district: "Dhaka", division: "Dhaka", lat: 23.7381, lng: 90.3950, kind: "area" },
  { name: "New Market", aliases: ["Nilkhet"], district: "Dhaka", division: "Dhaka", lat: 23.7332, lng: 90.3841, kind: "area" },
  { name: "Sayedabad", aliases: ["Saydabad Bus Terminal"], district: "Dhaka", division: "Dhaka", lat: 23.7101, lng: 90.4286, kind: "area" },
  { name: "Arambagh", aliases: ["Arambag"], district: "Dhaka", division: "Dhaka", lat: 23.7316, lng: 90.4193, kind: "area" },
  { name: "Hazrat Shahjalal Airport", aliases: ["Dhaka Airport", "Airport"], district: "Dhaka", division: "Dhaka", lat: 23.8433, lng: 90.3978, kind: "area" },
  { name: "Kuril", aliases: ["Kuril Bishwa Road", "Kuril Bishwaroad"], district: "Dhaka", division: "Dhaka", lat: 23.8214, lng: 90.4221, kind: "area" },
  { name: "Rampura", district: "Dhaka", division: "Dhaka", lat: 23.7637, lng: 90.4255, kind: "area" },
  { name: "Paltan", aliases: ["Purana Paltan"], district: "Dhaka", division: "Dhaka", lat: 23.7346, lng: 90.4124, kind: "area" },
  { name: "Wari", district: "Dhaka", division: "Dhaka", lat: 23.7118, lng: 90.4161, kind: "area" },
  { name: "Sadarghat", aliases: ["Old Dhaka", "Launch Terminal"], district: "Dhaka", division: "Dhaka", lat: 23.7104, lng: 90.4064, kind: "area" },
  { name: "Basabo", district: "Dhaka", division: "Dhaka", lat: 23.7389, lng: 90.4351, kind: "area" },
  { name: "Tejgaon", district: "Dhaka", division: "Dhaka", lat: 23.7638, lng: 90.3915, kind: "area" },
  { name: "Nabinagar", aliases: ["Savar Nabinagar"], district: "Dhaka", division: "Dhaka", lat: 23.8893, lng: 90.2533, kind: "area" },
  { name: "Board Bazar", district: "Gazipur", division: "Dhaka", lat: 23.9616, lng: 90.3800, kind: "area" },
  { name: "Gazipur Chowrasta", aliases: ["Chowrasta"], district: "Gazipur", division: "Dhaka", lat: 23.9999, lng: 90.4203, kind: "area" },
  { name: "Mawna", aliases: ["Mawna Chowrasta"], district: "Gazipur", division: "Dhaka", lat: 24.2110, lng: 90.4217, kind: "area" },
  { name: "Kaliakair", district: "Gazipur", division: "Dhaka", lat: 24.0710, lng: 90.2158, kind: "area" },
  { name: "Joydebpur", district: "Gazipur", division: "Dhaka", lat: 23.9990, lng: 90.4207, kind: "area" },
  { name: "Chashara", district: "Narayanganj", division: "Dhaka", lat: 23.6234, lng: 90.4996, kind: "area" },
  { name: "Signboard", district: "Narayanganj", division: "Dhaka", lat: 23.6824, lng: 90.4925, kind: "area" },
  { name: "Kanchpur", district: "Narayanganj", division: "Dhaka", lat: 23.7041, lng: 90.5226, kind: "area" },
  { name: "Mawa", aliases: ["Mawa Ghat", "Padma Bridge North"], district: "Munshiganj", division: "Dhaka", lat: 23.4697, lng: 90.2561, kind: "area" },
  { name: "Shimulia", aliases: ["Shimulia Ghat"], district: "Munshiganj", division: "Dhaka", lat: 23.4637, lng: 90.2360, kind: "area" },
  { name: "Elenga", district: "Tangail", division: "Dhaka", lat: 24.3384, lng: 89.9211, kind: "area" },
  { name: "Gorai", district: "Tangail", division: "Dhaka", lat: 24.0835, lng: 90.0980, kind: "area" },
  { name: "Bhairab", district: "Kishoreganj", division: "Dhaka", lat: 24.0524, lng: 90.9764, kind: "area" },
  { name: "AK Khan", aliases: ["A K Khan"], district: "Chattogram", division: "Chattogram", lat: 22.3679, lng: 91.7836, kind: "area" },
  { name: "Oxygen", aliases: ["Oxygen Mor"], district: "Chattogram", division: "Chattogram", lat: 22.3946, lng: 91.8234, kind: "area" },
  { name: "Patenga", district: "Chattogram", division: "Chattogram", lat: 22.2359, lng: 91.7918, kind: "area" },
  { name: "Chattogram Railway Station", aliases: ["Chittagong Railway Station"], district: "Chattogram", division: "Chattogram", lat: 22.3375, lng: 91.8316, kind: "area" },
  { name: "Mohipal", district: "Feni", division: "Chattogram", lat: 23.0238, lng: 91.3909, kind: "area" },
  { name: "Daudkandi", district: "Cumilla", division: "Chattogram", lat: 23.5305, lng: 90.7242, kind: "area" },
  { name: "Kolatoli", aliases: ["Kolatoli Beach"], district: "Cox's Bazar", division: "Chattogram", lat: 21.4214, lng: 91.9833, kind: "area" },
  { name: "Teknaf", district: "Cox's Bazar", division: "Chattogram", lat: 20.8624, lng: 92.3058, kind: "area" },
  { name: "Kadamtali", aliases: ["Sylhet Bus Terminal"], district: "Sylhet", division: "Sylhet", lat: 24.8790, lng: 91.8728, kind: "area" },
  { name: "Osmani Airport", aliases: ["Sylhet Airport"], district: "Sylhet", division: "Sylhet", lat: 24.9632, lng: 91.8679, kind: "area" },
  { name: "Royal More", district: "Khulna", division: "Khulna", lat: 22.8172, lng: 89.5530, kind: "area" },
  { name: "Khulna Railway Station", district: "Khulna", division: "Khulna", lat: 22.8169, lng: 89.5627, kind: "area" },
  { name: "Railgate", district: "Rajshahi", division: "Rajshahi", lat: 24.3747, lng: 88.5981, kind: "area" },
  { name: "Rajshahi Railway Station", district: "Rajshahi", division: "Rajshahi", lat: 24.3741, lng: 88.6041, kind: "area" },
  { name: "Launch Ghat", aliases: ["Barishal Launch Terminal"], district: "Barishal", division: "Barishal", lat: 22.6998, lng: 90.3718, kind: "area" },
  { name: "Medical More", aliases: ["Rangpur Medical"], district: "Rangpur", division: "Rangpur", lat: 25.7449, lng: 89.2516, kind: "area" },
  { name: "Bridge Mor", aliases: ["Mymensingh Bridge"], district: "Mymensingh", division: "Mymensingh", lat: 24.7358, lng: 90.4234, kind: "area" }
];

const exactAreaKey = (place: Place) =>
  `${place.district ?? place.name}:${place.name}`.toLowerCase();

const EXACT_AREAS: Place[] = [...AREAS, ...EXTRA_AREAS];
const EXACT_AREA_KEYS = new Set(EXACT_AREAS.map(exactAreaKey));

function adminAreaAliases(name: string): string[] {
  const aliases = [`${name} Upazila`, `${name} Thana`];
  if (name.endsWith("Sadar")) {
    aliases.push(name.replace(/ Sadar$/, " Town"));
  }
  if (name === "Nesarabad") aliases.push("Swarupkati", "Nesarabad Swarupkati");
  return aliases;
}

export const ADMIN_AREAS: Place[] = Object.entries(ADMIN_AREAS_BY_DISTRICT).flatMap(
  ([districtName, names]) => {
    const district = DISTRICTS.find((place) => place.name === districtName);
    if (!district) return [];
    return names.map((name) => ({
      name,
      district: district.name,
      division: district.division,
      lat: district.lat,
      lng: district.lng,
      kind: "area" as const,
      aliases: adminAreaAliases(name)
    }));
  }
);

export const ALL_AREAS: Place[] = [
  ...EXACT_AREAS,
  ...ADMIN_AREAS.filter((place) => !EXACT_AREA_KEYS.has(exactAreaKey(place)))
];

export function areasOf(district: string): Place[] {
  return EXACT_AREAS.filter((a) => a.district === district);
}

// Division headquarters shown as reference dots on the map.
export const MAJOR_CITIES = [
  "Dhaka",
  "Chattogram",
  "Khulna",
  "Rajshahi",
  "Sylhet",
  "Barishal",
  "Rangpur",
  "Mymensingh"
].map((name) => DISTRICTS.find((d) => d.name === name)!);

const ALL_PLACES: Place[] = [
  ...DISTRICTS.map((d) => ({ ...d, kind: "district" as const })),
  ...ALL_AREAS
];

export interface SearchOrigin {
  lat: number;
  lng: number;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/['.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function searchTerms(place: Place): string[] {
  return [
    place.name,
    place.district ?? "",
    place.division,
    ...(place.aliases ?? [])
  ]
    .map(normalize)
    .filter(Boolean);
}

export function inferDistrictFromText(text: string): Place | undefined {
  const query = normalize(text);
  if (!query) return undefined;
  return DISTRICTS.find((district) =>
    searchTerms(district).some((term) => query.includes(term))
  );
}

function matchRank(place: Place, query: string): number | null {
  const name = normalize(place.name);
  const terms = searchTerms(place);
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (terms.some((term) => term === query)) return 2;
  if (terms.some((term) => term.startsWith(query))) return 3;
  if (name.includes(query)) return 4;
  if (terms.some((term) => term.includes(query))) return 5;
  return null;
}

function distanceKm(place: Place, origin?: SearchOrigin): number {
  return origin ? haversineKm(origin, place) : 0;
}

export function searchPlaces(query: string, limit = 8, origin?: SearchOrigin): Place[] {
  const q = normalize(query);
  if (!q) {
    return origin
      ? nearestPlaces(origin.lat, origin.lng, limit).map(({ place }) => place)
      : [
          "Dhaka",
          "Chattogram",
          "Sylhet",
          "Khulna",
          "Rajshahi",
          "Barishal",
          "Rangpur",
          "Mymensingh"
        ]
          .map((name) => DISTRICTS.find((d) => d.name === name)!)
          .slice(0, limit);
  }

  return ALL_PLACES.map((place) => {
    const rank = matchRank(place, q);
    if (rank === null) return null;
    return { place, rank, km: distanceKm(place, origin) };
  })
    .filter((item): item is { place: Place; rank: number; km: number } => Boolean(item))
    .sort((a, b) => a.rank - b.rank || a.km - b.km || a.place.name.localeCompare(b.place.name))
    .map(({ place }) => place)
    .slice(0, limit);
}

export function nearestPlaces(lat: number, lng: number, limit = 5): { place: Place; km: number }[] {
  return ALL_PLACES.map((place) => ({ place, km: haversineKm({ lat, lng }, place) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

export function findNearest(lat: number, lng: number): { place: Place; km: number } {
  let best = ALL_PLACES[0];
  let bestKm = Infinity;
  for (const d of ALL_PLACES) {
    const km = haversineKm({ lat, lng }, d);
    if (km < bestKm) {
      bestKm = km;
      best = d;
    }
  }
  return { place: best, km: bestKm };
}
