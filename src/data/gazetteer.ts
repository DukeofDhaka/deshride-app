import { haversineKm } from "../lib/geo";

export interface Place {
  name: string;
  division: string;
  lat: number;
  lng: number;
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
  { name: "Chattogram", division: "Chattogram", lat: 22.36, lng: 91.83 },
  { name: "Cox's Bazar", division: "Chattogram", lat: 21.44, lng: 91.97 },
  { name: "Cumilla", division: "Chattogram", lat: 23.46, lng: 91.18 },
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
  { name: "Bogura", division: "Rajshahi", lat: 24.85, lng: 89.37 },
  { name: "Joypurhat", division: "Rajshahi", lat: 25.1, lng: 89.02 },
  // Khulna division
  { name: "Khulna", division: "Khulna", lat: 22.82, lng: 89.55 },
  { name: "Jashore", division: "Khulna", lat: 23.17, lng: 89.21 },
  { name: "Satkhira", division: "Khulna", lat: 22.72, lng: 89.07 },
  { name: "Bagerhat", division: "Khulna", lat: 22.65, lng: 89.79 },
  { name: "Narail", division: "Khulna", lat: 23.17, lng: 89.5 },
  { name: "Magura", division: "Khulna", lat: 23.49, lng: 89.42 },
  { name: "Jhenaidah", division: "Khulna", lat: 23.54, lng: 89.15 },
  { name: "Kushtia", division: "Khulna", lat: 23.9, lng: 89.12 },
  { name: "Chuadanga", division: "Khulna", lat: 23.64, lng: 88.86 },
  { name: "Meherpur", division: "Khulna", lat: 23.76, lng: 88.63 },
  // Barishal division
  { name: "Barishal", division: "Barishal", lat: 22.7, lng: 90.37 },
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

export function searchPlaces(query: string, limit = 7): Place[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts = DISTRICTS.filter((d) => d.name.toLowerCase().startsWith(q));
  const contains = DISTRICTS.filter(
    (d) => !d.name.toLowerCase().startsWith(q) && d.name.toLowerCase().includes(q)
  );
  return [...starts, ...contains].slice(0, limit);
}

export function findNearest(lat: number, lng: number): { place: Place; km: number } {
  let best = DISTRICTS[0];
  let bestKm = Infinity;
  for (const d of DISTRICTS) {
    const km = haversineKm({ lat, lng }, d);
    if (km < bestKm) {
      bestKm = km;
      best = d;
    }
  }
  return { place: best, km: bestKm };
}
