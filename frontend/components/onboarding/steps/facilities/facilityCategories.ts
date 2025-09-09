import { 
  Home, Bed, Bath, ChefHat, Users, Sofa, 
  TreePine, Gamepad2, Accessibility, Shield, 
  Baby, LucideIcon, Sparkles, Zap, Camera,
  Wifi, Smartphone, Car, Plane, Ship, Train,
  Briefcase
} from 'lucide-react';

export interface FacilityItem {
  id: string;
  name: string;
  dataType: 'BOOLEAN' | 'INTEGER' | 'TEXT' | 'VARCHAR';
  available: boolean;
  quantity?: number;
  condition?: 'new' | 'good' | 'fair' | 'poor';
  itemNotes?: string;
  photoUrl?: string;
  specifications?: string;
  productLink?: string;
}

export interface FacilityCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  items: FacilityItem[];
  completed: number;
  total: number;
  photoLimit: number;
  photoUploadedCount?: number;
}

export const FACILITY_CATEGORIES: Record<string, FacilityCategory> = {
  'property-layout-spaces': {
    id: 'property-layout-spaces',
    name: 'Property Layout & Spaces',
    icon: Home,
    completed: 0,
    total: 25,
    photoLimit: 10, // Floor plans, room layouts
    items: [
      // Main Living Areas
      { id: 'living-room', name: 'Living room', dataType: 'INTEGER', available: false },
      { id: 'dining-room', name: 'Dining room', dataType: 'INTEGER', available: false },
      { id: 'kitchen', name: 'Kitchen', dataType: 'INTEGER', available: false },
      { id: 'family-room', name: 'Family room', dataType: 'INTEGER', available: false },
      { id: 'lounge-area', name: 'Lounge area', dataType: 'INTEGER', available: false },
      
      // Entertainment & Recreation Rooms
      { id: 'home-cinema', name: 'Home cinema / Movie room', dataType: 'INTEGER', available: false },
      { id: 'games-room', name: 'Games / Recreation room', dataType: 'INTEGER', available: false },
      { id: 'karaoke-room', name: 'Karaoke room', dataType: 'INTEGER', available: false },
      { id: 'music-room', name: 'Music room', dataType: 'INTEGER', available: false },
      { id: 'entertainment-room', name: 'Entertainment room', dataType: 'INTEGER', available: false },
      
      // Wellness & Fitness
      { id: 'gym-fitness', name: 'Gym / Fitness room', dataType: 'INTEGER', available: false },
      { id: 'yoga-studio', name: 'Yoga / Meditation room', dataType: 'INTEGER', available: false },
      { id: 'spa-treatment-room', name: 'Spa / Treatment room', dataType: 'INTEGER', available: false },
      { id: 'sauna-room', name: 'Sauna room', dataType: 'INTEGER', available: false },
      { id: 'steam-room', name: 'Steam room', dataType: 'INTEGER', available: false },
      { id: 'massage-room', name: 'Massage room', dataType: 'INTEGER', available: false },
      
      // Work & Study Spaces
      { id: 'home-office', name: 'Home office / Study', dataType: 'INTEGER', available: false },
      { id: 'library-reading', name: 'Library / Reading room', dataType: 'INTEGER', available: false },
      { id: 'business-center', name: 'Business center', dataType: 'INTEGER', available: false },
      
      // Specialty Rooms
      { id: 'wine-cellar', name: 'Wine cellar / Wine room', dataType: 'INTEGER', available: false },
      { id: 'bar-room', name: 'Bar room', dataType: 'INTEGER', available: false },
      { id: 'maid-quarters', name: 'Maid quarters / Staff room', dataType: 'INTEGER', available: false },
      { id: 'storage-room', name: 'Storage room', dataType: 'INTEGER', available: false },
      { id: 'laundry-room', name: 'Laundry room', dataType: 'INTEGER', available: false },
      
      // Outdoor Spaces
      { id: 'outdoor-sala', name: 'Thai sala / Pavilion', dataType: 'INTEGER', available: false },
    ]
  },
  'occupancy-sleeping': {
    id: 'occupancy-sleeping',
    name: 'Occupancy & Sleeping',
    icon: Bed,
    completed: 0,
    total: 28,
    photoLimit: 20, // Bedroom photos, bed configurations
    items: [
      // Occupancy Configuration
      { id: 'standard-occupancy', name: 'Standard occupancy', dataType: 'INTEGER', available: false },
      { id: 'max-occupancy', name: 'Maximum occupancy with extra beds', dataType: 'INTEGER', available: false },
      { id: 'total-bedrooms', name: 'Total number of bedrooms', dataType: 'INTEGER', available: false },
      { id: 'master-bedrooms', name: 'Master bedrooms', dataType: 'INTEGER', available: false },
      { id: 'guest-bedrooms', name: 'Guest bedrooms', dataType: 'INTEGER', available: false },
      { id: 'children-bedrooms', name: 'Children bedrooms', dataType: 'INTEGER', available: false },
      
      // Bed Types & Quantities
      { id: 'king-bed', name: 'King size beds', dataType: 'INTEGER', available: false },
      { id: 'super-king-bed', name: 'Super king size beds', dataType: 'INTEGER', available: false },
      { id: 'queen-bed', name: 'Queen size beds', dataType: 'INTEGER', available: false },
      { id: 'double-bed', name: 'Double beds', dataType: 'INTEGER', available: false },
      { id: 'twin-bed', name: 'Twin beds', dataType: 'INTEGER', available: false },
      { id: 'single-bed', name: 'Single beds', dataType: 'INTEGER', available: false },
      { id: 'day-bed', name: 'Day beds', dataType: 'INTEGER', available: false },
      { id: 'sofa-bed', name: 'Sofa beds', dataType: 'INTEGER', available: false },
      { id: 'bunk-bed', name: 'Bunk beds', dataType: 'INTEGER', available: false },
      { id: 'thai-style-bed', name: 'Thai-style platform beds', dataType: 'INTEGER', available: false },
      { id: 'four-poster-bed', name: 'Four-poster beds', dataType: 'INTEGER', available: false },
      { id: 'murphy-bed', name: 'Murphy/wall beds', dataType: 'INTEGER', available: false },
      
      // Additional Sleeping Options
      { id: 'extra-bed', name: 'Extra beds available', dataType: 'INTEGER', available: false },
      { id: 'rollaway-bed', name: 'Rollaway beds', dataType: 'INTEGER', available: false },
      { id: 'baby-cot', name: 'Baby cots/cribs', dataType: 'INTEGER', available: false },
      { id: 'toddler-bed', name: 'Toddler beds', dataType: 'INTEGER', available: false },
      
      // Bedroom Amenities
      { id: 'ceiling-fans', name: 'Ceiling fans in bedrooms', dataType: 'BOOLEAN', available: false },
      { id: 'bedroom-fireplace', name: 'Bedroom fireplaces', dataType: 'INTEGER', available: false },
      { id: 'bedroom-balcony', name: 'Bedrooms with private balcony/terrace', dataType: 'INTEGER', available: false },
      { id: 'ensuite-bathroom', name: 'Bedrooms with ensuite bathroom', dataType: 'INTEGER', available: false },
      { id: 'walk-in-closet', name: 'Bedrooms with walk-in closet', dataType: 'INTEGER', available: false },
      { id: 'ocean-view-bedrooms', name: 'Bedrooms with ocean/sea view', dataType: 'INTEGER', available: false },
    ]
  },
  'bathrooms': {
    id: 'bathrooms',
    name: 'Bathrooms',
    icon: Bath,
    completed: 0,
    total: 22,
    photoLimit: 15, // Bathroom photos, fixtures
    items: [
      // Bathroom Configuration
      { id: 'total-bathrooms', name: 'Total number of bathrooms', dataType: 'INTEGER', available: false },
      { id: 'ensuite-bathrooms', name: 'Ensuite bathrooms', dataType: 'INTEGER', available: false },
      { id: 'guest-bathrooms', name: 'Guest/shared bathrooms', dataType: 'INTEGER', available: false },
      { id: 'powder-rooms', name: 'Powder rooms/half baths', dataType: 'INTEGER', available: false },
      { id: 'outdoor-bathrooms', name: 'Outdoor/semi-outdoor bathrooms', dataType: 'INTEGER', available: false },
      
      // Bathing Features
      { id: 'freestanding-tub', name: 'Freestanding bathtubs', dataType: 'INTEGER', available: false },
      { id: 'built-in-tub', name: 'Built-in bathtubs', dataType: 'INTEGER', available: false },
      { id: 'jacuzzi-tub', name: 'Jacuzzi/jet tubs', dataType: 'INTEGER', available: false },
      { id: 'stone-tub', name: 'Natural stone bathtubs', dataType: 'INTEGER', available: false },
      { id: 'infinity-tub', name: 'Infinity-edge bathtubs', dataType: 'INTEGER', available: false },
      
      // Shower Features
      { id: 'rain-shower', name: 'Rain showers', dataType: 'INTEGER', available: false },
      { id: 'walk-in-shower', name: 'Walk-in showers', dataType: 'INTEGER', available: false },
      { id: 'steam-shower', name: 'Steam showers', dataType: 'INTEGER', available: false },
      { id: 'his-her-shower', name: 'His & her double showers', dataType: 'INTEGER', available: false },
      { id: 'outdoor-shower', name: 'Outdoor showers', dataType: 'INTEGER', available: false },
      { id: 'waterfall-shower', name: 'Waterfall showers', dataType: 'INTEGER', available: false },
      
      // Fixtures & Features
      { id: 'double-vanity', name: 'Double vanity/sinks', dataType: 'INTEGER', available: false },
      { id: 'floating-vanity', name: 'Floating vanities', dataType: 'INTEGER', available: false },
      { id: 'separate-toilet', name: 'Separate toilet rooms', dataType: 'INTEGER', available: false },
      { id: 'bidet', name: 'Bidets', dataType: 'INTEGER', available: false },
      { id: 'smart-toilet', name: 'Smart/electronic toilets', dataType: 'INTEGER', available: false },
      { id: 'skylight-bathroom', name: 'Bathrooms with skylights', dataType: 'INTEGER', available: false },
    ]
  },
  'kitchen-dining': {
    id: 'kitchen-dining',
    name: 'Kitchen & Dining',
    icon: ChefHat,
    completed: 0,
    total: 25,
    photoLimit: 18, // Kitchen equipment, dining areas
    items: [
      // Kitchen Configuration
      { id: 'main-kitchen', name: 'Main kitchen (fully equipped)', dataType: 'BOOLEAN', available: false },
      { id: 'outdoor-kitchen', name: 'Outdoor kitchen/BBQ area', dataType: 'BOOLEAN', available: false },
      { id: 'kitchenette', name: 'Additional kitchenettes', dataType: 'INTEGER', available: false },
      { id: 'thai-kitchen', name: 'Traditional Thai cooking area', dataType: 'BOOLEAN', available: false },
      
      // Major Appliances
      { id: 'refrigerator-type', name: 'Large refrigerator with freezer', dataType: 'BOOLEAN', available: false },
      { id: 'wine-fridge', name: 'Wine cooler/fridge', dataType: 'BOOLEAN', available: false },
      { id: 'dishwasher', name: 'Dishwasher', dataType: 'BOOLEAN', available: false },
      { id: 'cooking-range', name: 'Full cooking range (gas/electric/induction)', dataType: 'BOOLEAN', available: false },
      { id: 'built-in-oven', name: 'Built-in oven', dataType: 'BOOLEAN', available: false },
      { id: 'microwave', name: 'Microwave oven', dataType: 'BOOLEAN', available: false },
      
      // Specialty Cooking Equipment
      { id: 'wok-burner', name: 'High-heat wok burner', dataType: 'BOOLEAN', available: false },
      { id: 'steamer', name: 'Bamboo/electric steamer', dataType: 'BOOLEAN', available: false },
      { id: 'rice-cooker', name: 'Rice cooker', dataType: 'BOOLEAN', available: false },
      { id: 'pizza-oven', name: 'Wood-fired pizza oven', dataType: 'BOOLEAN', available: false },
      { id: 'teppanyaki-grill', name: 'Teppanyaki grill', dataType: 'BOOLEAN', available: false },
      
      // Kitchen Equipment Package
      { id: 'complete-cookware', name: 'Complete cookware set (pots, pans, woks)', dataType: 'BOOLEAN', available: false },
      { id: 'small-appliances', name: 'Small appliances package (blender, juicer, etc.)', dataType: 'BOOLEAN', available: false },
      { id: 'coffee-station', name: 'Complete coffee station (espresso, grinder, etc.)', dataType: 'BOOLEAN', available: false },
      
      // Dining Areas
      { id: 'formal-dining', name: 'Formal dining room', dataType: 'BOOLEAN', available: false },
      { id: 'casual-dining', name: 'Casual dining area', dataType: 'BOOLEAN', available: false },
      { id: 'breakfast-bar', name: 'Kitchen breakfast bar', dataType: 'INTEGER', available: false },
      { id: 'outdoor-dining', name: 'Outdoor dining area', dataType: 'BOOLEAN', available: false },
      { id: 'poolside-dining', name: 'Poolside dining/bar area', dataType: 'BOOLEAN', available: false },
      
      // Service & Storage
      { id: 'pantry', name: 'Walk-in pantry', dataType: 'BOOLEAN', available: false },
      { id: 'wine-cellar', name: 'Wine cellar/storage', dataType: 'BOOLEAN', available: false },
    ]
  },
  'service-staff': {
    id: 'service-staff',
    name: 'Service & Staff Areas',
    icon: Users,
    completed: 0,
    total: 20,
    photoLimit: 12, // Service areas, staff facilities
    items: [
      // Operational Services
      { id: 'event-terms', name: 'Wedding and Event T&Cs', dataType: 'TEXT', available: false },
      { id: 'rate-inclusions', name: 'Rate inclusions', dataType: 'TEXT', available: false },
      { id: 'wine-cellar-process', name: 'Wine cellar process', dataType: 'TEXT', available: false },
      { id: 'baby-cot-cost', name: 'Baby cot cost', dataType: 'TEXT', available: false },
      { id: 'babysitting-cost', name: 'Babysitting cost', dataType: 'TEXT', available: false },
      { id: 'laundry-service', name: 'Laundry service', dataType: 'TEXT', available: false },
      { id: 'checkin-times', name: 'Check-in/out times', dataType: 'TEXT', available: false },
      { id: 'included-services', name: 'Included services', dataType: 'TEXT', available: false },
      { id: 'extra-services', name: 'Extra charge services', dataType: 'TEXT', available: false },
      { id: 'security-deposit', name: 'Security deposit info', dataType: 'TEXT', available: false },
      { id: 'laundry-facilities', name: 'Laundry facilities', dataType: 'BOOLEAN', available: false },
      { id: 'butler-service', name: 'Butler service', dataType: 'BOOLEAN', available: false },
      
      // Service Areas
      { id: 'laundry-room', name: 'Main laundry room', dataType: 'BOOLEAN', available: false },
      { id: 'utility-room', name: 'Utility/service room', dataType: 'BOOLEAN', available: false },
      { id: 'storage-rooms', name: 'Storage rooms', dataType: 'INTEGER', available: false },
      { id: 'housekeeping-storage', name: 'Housekeeping supply storage', dataType: 'BOOLEAN', available: false },
      
      // Service Infrastructure
      { id: 'service-entrance', name: 'Separate service entrance', dataType: 'BOOLEAN', available: false },
      { id: 'delivery-area', name: 'Delivery/service area', dataType: 'BOOLEAN', available: false },
      { id: 'waste-management', name: 'Waste management area', dataType: 'BOOLEAN', available: false },
      { id: 'generator-room', name: 'Generator/electrical room', dataType: 'BOOLEAN', available: false },
    ]
  },
  'living-spaces': {
    id: 'living-spaces',
    name: 'Living Spaces',
    icon: Sofa,
    completed: 0,
    total: 18,
    photoLimit: 15, // Living room, entertainment areas
    items: [
      // Climate Control
      { id: 'central-air-conditioning', name: 'Central air conditioning system', dataType: 'BOOLEAN', available: false },
      { id: 'split-ac-units', name: 'Individual AC units per room', dataType: 'INTEGER', available: false },
      { id: 'ceiling-fans', name: 'Ceiling fans throughout', dataType: 'BOOLEAN', available: false },
      { id: 'central-heating', name: 'Central heating system', dataType: 'BOOLEAN', available: false },
      
      // Entertainment Areas
      { id: 'main-living-room', name: 'Main living room', dataType: 'BOOLEAN', available: false },
      { id: 'family-room', name: 'Family/TV room', dataType: 'BOOLEAN', available: false },
      { id: 'formal-lounge', name: 'Formal lounge/sitting room', dataType: 'BOOLEAN', available: false },
      { id: 'home-theater', name: 'Dedicated home theater room', dataType: 'BOOLEAN', available: false },
      { id: 'games-room', name: 'Games room', dataType: 'BOOLEAN', available: false },
      { id: 'bar-lounge', name: 'Bar/cocktail lounge area', dataType: 'BOOLEAN', available: false },
      
      // Specialty Rooms
      { id: 'kids-playroom', name: 'Children\'s playroom', dataType: 'BOOLEAN', available: false },
      { id: 'reading-room', name: 'Reading room/library', dataType: 'BOOLEAN', available: false },
      { id: 'meditation-room', name: 'Meditation/yoga room', dataType: 'BOOLEAN', available: false },
      
      // Luxury Amenities
      { id: 'elevator', name: 'Elevator/lift', dataType: 'BOOLEAN', available: false },
      { id: 'whole-house-audio', name: 'Whole house audio system', dataType: 'BOOLEAN', available: false },
      { id: 'smart-home-system', name: 'Smart home automation', dataType: 'BOOLEAN', available: false },
      
      // Utility
      { id: 'laundry-access', name: 'In-villa laundry facilities', dataType: 'BOOLEAN', available: false },
      { id: 'staff-call-system', name: 'Staff call/intercom system', dataType: 'BOOLEAN', available: false },
    ]
  },
  'outdoor-facilities': {
    id: 'outdoor-facilities',
    name: 'Outdoor Facilities',
    icon: TreePine,
    completed: 0,
    total: 25,
    photoLimit: 20, // Pool, garden, outdoor areas
    items: [
      // Pool & Water Features
      { id: 'infinity-pool', name: 'Infinity edge pool', dataType: 'BOOLEAN', available: false },
      { id: 'lap-pool', name: 'Lap pool', dataType: 'BOOLEAN', available: false },
      { id: 'jacuzzi-outdoor', name: 'Outdoor jacuzzi/hot tub', dataType: 'BOOLEAN', available: false },
      { id: 'water-features', name: 'Water features/fountains', dataType: 'INTEGER', available: false },
      { id: 'koi-pond', name: 'Koi pond/ornamental pond', dataType: 'BOOLEAN', available: false },
      
      // Outdoor Living Areas
      { id: 'thai-sala', name: 'Traditional Thai sala/pavilion', dataType: 'INTEGER', available: false },
      { id: 'outdoor-dining', name: 'Outdoor dining areas', dataType: 'INTEGER', available: false },
      { id: 'poolside-bar', name: 'Poolside bar area', dataType: 'BOOLEAN', available: false },
      { id: 'outdoor-lounge', name: 'Outdoor lounge/seating areas', dataType: 'INTEGER', available: false },
      { id: 'gazebo-pergola', name: 'Gazebo/pergola structures', dataType: 'INTEGER', available: false },
      { id: 'outdoor-kitchen', name: 'Outdoor kitchen/BBQ area', dataType: 'BOOLEAN', available: false },
      
      // Gardens & Landscaping
      { id: 'tropical-garden', name: 'Tropical landscaped gardens', dataType: 'BOOLEAN', available: false },
      { id: 'palm-trees', name: 'Mature palm trees', dataType: 'BOOLEAN', available: false },
      { id: 'fruit-trees', name: 'Fruit trees/orchard area', dataType: 'BOOLEAN', available: false },
      { id: 'herb-garden', name: 'Herb/vegetable garden', dataType: 'BOOLEAN', available: false },
      
      // Recreation & Wellness
      { id: 'outdoor-gym', name: 'Outdoor fitness area', dataType: 'BOOLEAN', available: false },
      { id: 'yoga-deck', name: 'Yoga/meditation deck', dataType: 'BOOLEAN', available: false },
      { id: 'beach-access', name: 'Private beach access', dataType: 'BOOLEAN', available: false },
      { id: 'boat-dock', name: 'Private boat dock/jetty', dataType: 'BOOLEAN', available: false },
      
      // Practical Facilities
      { id: 'covered-parking', name: 'Covered parking spaces', dataType: 'INTEGER', available: false },
      { id: 'outdoor-shower', name: 'Outdoor shower areas', dataType: 'INTEGER', available: false },
      { id: 'outdoor-lighting', name: 'Landscape/mood lighting', dataType: 'BOOLEAN', available: false },
      { id: 'irrigation-system', name: 'Automated irrigation system', dataType: 'BOOLEAN', available: false },
      
      // Entertainment
      { id: 'outdoor-speakers', name: 'Outdoor sound system', dataType: 'BOOLEAN', available: false },
      { id: 'outdoor-tv', name: 'Outdoor TV/entertainment area', dataType: 'BOOLEAN', available: false },
    ]
  },
  'home-office': {
    id: 'home-office',
    name: 'Home Office & Business',
    icon: Briefcase,
    completed: 0,
    total: 8,
    photoLimit: 8, // Office equipment, workspaces
    items: [
      { id: 'dedicated-office', name: 'Dedicated home office room', dataType: 'BOOLEAN', available: false },
      { id: 'work-desks', name: 'Work desks/study areas', dataType: 'INTEGER', available: false },
      { id: 'office-chairs', name: 'Ergonomic office chairs', dataType: 'INTEGER', available: false },
      { id: 'business-internet', name: 'High-speed business internet', dataType: 'BOOLEAN', available: false },
      { id: 'printer-scanner', name: 'Printer/scanner/copier', dataType: 'BOOLEAN', available: false },
      { id: 'video-conference', name: 'Video conferencing setup', dataType: 'BOOLEAN', available: false },
      { id: 'landline-phone', name: 'Landline telephone', dataType: 'BOOLEAN', available: false },
      { id: 'office-supplies', name: 'Basic office supplies', dataType: 'BOOLEAN', available: false },
    ]
  },
  'entertainment-gaming': {
    id: 'entertainment-gaming',
    name: 'Entertainment & Gaming',
    icon: Gamepad2,
    completed: 0,
    total: 20,
    photoLimit: 15, // Entertainment systems, gaming areas
    items: [
      // Audio Visual Entertainment
      { id: 'smart-tvs', name: 'Smart TVs throughout villa', dataType: 'INTEGER', available: false },
      { id: 'home-theater', name: 'Dedicated home theater system', dataType: 'BOOLEAN', available: false },
      { id: 'surround-sound', name: 'Surround sound system', dataType: 'BOOLEAN', available: false },
      { id: 'streaming-services', name: 'Streaming services (Netflix, etc.)', dataType: 'BOOLEAN', available: false },
      { id: 'satellite-cable', name: 'Satellite/cable TV', dataType: 'BOOLEAN', available: false },
      { id: 'bluetooth-speakers', name: 'Bluetooth speaker system', dataType: 'BOOLEAN', available: false },
      
      // Gaming & Recreation
      { id: 'games-console', name: 'Gaming consoles (PlayStation/Xbox)', dataType: 'INTEGER', available: false },
      { id: 'pool-table', name: 'Pool/billiards table', dataType: 'BOOLEAN', available: false },
      { id: 'table-tennis', name: 'Table tennis/ping pong', dataType: 'BOOLEAN', available: false },
      { id: 'foosball-table', name: 'Foosball table', dataType: 'BOOLEAN', available: false },
      { id: 'dart-board', name: 'Dart board area', dataType: 'BOOLEAN', available: false },
      { id: 'board-games', name: 'Board games collection', dataType: 'BOOLEAN', available: false },
      { id: 'karaoke-system', name: 'Karaoke system', dataType: 'BOOLEAN', available: false },
      
      // Outdoor Entertainment
      { id: 'outdoor-projector', name: 'Outdoor movie projector', dataType: 'BOOLEAN', available: false },
      { id: 'pool-games', name: 'Pool games/floating equipment', dataType: 'BOOLEAN', available: false },
      { id: 'water-sports', name: 'Water sports equipment', dataType: 'BOOLEAN', available: false },
      
      // Reading & Relaxation
      { id: 'book-library', name: 'Book library/reading collection', dataType: 'BOOLEAN', available: false },
      { id: 'magazine-selection', name: 'Magazine/periodical selection', dataType: 'BOOLEAN', available: false },
      { id: 'music-collection', name: 'Music collection/streaming', dataType: 'BOOLEAN', available: false },
      { id: 'intercom-system', name: 'Villa-wide intercom system', dataType: 'BOOLEAN', available: false },
    ]
  },
  'technology': {
    id: 'technology',
    name: 'Technology & Connectivity',
    icon: Wifi,
    completed: 0,
    total: 16,
    photoLimit: 12, // Tech installations, smart systems
    items: [
      // Connectivity Infrastructure
      { id: 'fiber-optic-internet', name: 'Fiber optic high-speed internet', dataType: 'BOOLEAN', available: false },
      { id: 'satellite-backup', name: 'Satellite internet backup', dataType: 'BOOLEAN', available: false },
      { id: 'wifi-coverage', name: 'Villa-wide WiFi coverage', dataType: 'BOOLEAN', available: false },
      { id: 'mesh-network', name: 'Mesh network system', dataType: 'BOOLEAN', available: false },
      
      // Smart Home Integration
      { id: 'home-automation-hub', name: 'Central home automation hub', dataType: 'BOOLEAN', available: false },
      { id: 'smart-lighting-zones', name: 'Smart lighting with zones/scenes', dataType: 'BOOLEAN', available: false },
      { id: 'smart-climate-control', name: 'Smart climate control system', dataType: 'BOOLEAN', available: false },
      { id: 'voice-assistant', name: 'Voice assistant integration (Alexa/Google)', dataType: 'BOOLEAN', available: false },
      { id: 'smart-locks-keyless', name: 'Smart locks with keyless entry', dataType: 'BOOLEAN', available: false },
      
      // Modern Amenities
      { id: 'ev-charging-station', name: 'Electric vehicle charging station', dataType: 'BOOLEAN', available: false },
      { id: 'solar-smart-monitoring', name: 'Solar panels with smart monitoring', dataType: 'BOOLEAN', available: false },
      { id: 'smart-pool-system', name: 'Smart pool/spa control system', dataType: 'BOOLEAN', available: false },
      { id: 'smart-irrigation', name: 'Smart garden irrigation system', dataType: 'BOOLEAN', available: false },
      
      // Guest Convenience
      { id: 'wireless-charging-pads', name: 'Wireless charging pads throughout', dataType: 'BOOLEAN', available: false },
      { id: 'usb-outlets', name: 'USB outlets in all rooms', dataType: 'BOOLEAN', available: false },
      { id: 'streaming-services-premium', name: 'Premium streaming services package', dataType: 'BOOLEAN', available: false },
    ]
  },
  'wellness-spa': {
    id: 'wellness-spa',
    name: 'Wellness & Spa',
    icon: Sparkles,
    completed: 0,
    total: 16,
    photoLimit: 18, // Spa facilities, wellness areas
    items: [
      // Traditional Thai Spa
      { id: 'thai-massage-sala', name: 'Traditional Thai massage sala', dataType: 'INTEGER', available: false },
      { id: 'couple-massage-room', name: 'Couple massage rooms', dataType: 'INTEGER', available: false },
      { id: 'herbal-steam-room', name: 'Thai herbal steam room', dataType: 'BOOLEAN', available: false },
      { id: 'reflexology-area', name: 'Foot reflexology area', dataType: 'BOOLEAN', available: false },
      { id: 'outdoor-massage-area', name: 'Outdoor massage pavilion', dataType: 'BOOLEAN', available: false },
      
      // Wellness Facilities
      { id: 'yoga-meditation-studio', name: 'Yoga/meditation studio', dataType: 'BOOLEAN', available: false },
      { id: 'fitness-gym-room', name: 'Fitness/gym room', dataType: 'BOOLEAN', available: false },
      { id: 'sauna-room', name: 'Sauna room', dataType: 'BOOLEAN', available: false },
      { id: 'infrared-sauna', name: 'Infrared sauna', dataType: 'BOOLEAN', available: false },
      { id: 'relaxation-pool', name: 'Relaxation/flotation pool', dataType: 'BOOLEAN', available: false },
      
      // Spa Amenities
      { id: 'spa-changing-rooms', name: 'Spa changing/preparation rooms', dataType: 'INTEGER', available: false },
      { id: 'aromatherapy-room', name: 'Dedicated aromatherapy room', dataType: 'BOOLEAN', available: false },
      { id: 'detox-cleansing-area', name: 'Detox/cleansing treatment area', dataType: 'BOOLEAN', available: false },
      { id: 'spa-product-prep', name: 'Spa product preparation area', dataType: 'BOOLEAN', available: false },
      
      // Services
      { id: 'certified-therapists', name: 'Certified massage therapists available', dataType: 'BOOLEAN', available: false },
      { id: 'wellness-programs', name: 'Customized wellness programs', dataType: 'BOOLEAN', available: false },
    ]
  },
  'accessibility': {
    id: 'accessibility',
    name: 'Accessibility',
    icon: Accessibility,
    completed: 0,
    total: 22,
    photoLimit: 10, // Accessibility features, equipment
    items: [
      // Mobility Access
      { id: 'wheelchair-accessible', name: 'Full wheelchair accessibility', dataType: 'BOOLEAN', available: false },
      { id: 'single-level-access', name: 'Single-level/ground floor access', dataType: 'BOOLEAN', available: false },
      { id: 'step-free-entrances', name: 'Step-free main entrances', dataType: 'BOOLEAN', available: false },
      { id: 'wheelchair-ramps', name: 'Wheelchair ramps', dataType: 'INTEGER', available: false },
      { id: 'elevator-lift', name: 'Elevator or wheelchair lift', dataType: 'BOOLEAN', available: false },
      { id: 'wide-doorways', name: 'Wide doorways (32+ inches)', dataType: 'BOOLEAN', available: false },
      { id: 'wide-hallways', name: 'Wide hallway clearances', dataType: 'BOOLEAN', available: false },
      
      // Bathroom Accessibility
      { id: 'accessible-bathrooms', name: 'ADA accessible bathrooms', dataType: 'INTEGER', available: false },
      { id: 'roll-in-showers', name: 'Roll-in showers with benches', dataType: 'INTEGER', available: false },
      { id: 'grab-rails-bathroom', name: 'Grab rails in bathrooms', dataType: 'BOOLEAN', available: false },
      { id: 'comfort-height-toilets', name: 'Comfort height toilets', dataType: 'INTEGER', available: false },
      
      // Bedroom Access
      { id: 'ground-floor-bedrooms', name: 'Ground floor accessible bedrooms', dataType: 'INTEGER', available: false },
      { id: 'accessible-bed-height', name: 'Accessible bed heights', dataType: 'INTEGER', available: false },
      
      // Outdoor Accessibility
      { id: 'pool-accessibility', name: 'Pool accessibility (lift/ramp)', dataType: 'BOOLEAN', available: false },
      { id: 'accessible-outdoor-paths', name: 'Accessible outdoor pathways', dataType: 'BOOLEAN', available: false },
      { id: 'accessible-parking', name: 'Accessible parking spaces', dataType: 'INTEGER', available: false },
      
      // Visual/Hearing Support
      { id: 'visual-alert-system', name: 'Visual alert/notification system', dataType: 'BOOLEAN', available: false },
      { id: 'hearing-loop-system', name: 'Hearing loop system', dataType: 'BOOLEAN', available: false },
      { id: 'tactile-guidance', name: 'Tactile guidance paths', dataType: 'BOOLEAN', available: false },
      
      // Emergency Accessibility
      { id: 'accessible-emergency-exits', name: 'Accessible emergency exits', dataType: 'BOOLEAN', available: false },
      { id: 'emergency-communication', name: 'Accessible emergency communication', dataType: 'BOOLEAN', available: false },
      { id: 'staff-accessibility-training', name: 'Staff accessibility assistance training', dataType: 'BOOLEAN', available: false },
    ]
  },
  'safety-security': {
    id: 'safety-security',
    name: 'Safety & Security',
    icon: Shield,
    completed: 0,
    total: 20,
    photoLimit: 12, // Safety systems, security equipment
    items: [
      // Fire & Life Safety
      { id: 'smoke-detectors', name: 'Smoke detectors throughout villa', dataType: 'BOOLEAN', available: false },
      { id: 'carbon-monoxide-detectors', name: 'Carbon monoxide detectors', dataType: 'BOOLEAN', available: false },
      { id: 'fire-extinguishers', name: 'Fire extinguishers', dataType: 'INTEGER', available: false },
      { id: 'sprinkler-system', name: 'Water sprinkler system', dataType: 'BOOLEAN', available: false },
      { id: 'emergency-lighting', name: 'Emergency lighting system', dataType: 'BOOLEAN', available: false },
      
      // Security Systems
      { id: 'smart-security-system', name: 'Smart security/alarm system', dataType: 'BOOLEAN', available: false },
      { id: 'cctv-surveillance', name: 'CCTV surveillance system', dataType: 'BOOLEAN', available: false },
      { id: 'motion-sensors', name: 'Motion sensor security', dataType: 'BOOLEAN', available: false },
      { id: 'perimeter-security', name: 'Perimeter security (gates/fencing)', dataType: 'BOOLEAN', available: false },
      { id: 'access-control', name: 'Electronic access control', dataType: 'BOOLEAN', available: false },
      
      // Pool & Water Safety
      { id: 'pool-safety-system', name: 'Pool safety alarm system', dataType: 'BOOLEAN', available: false },
      { id: 'pool-covers', name: 'Automatic pool safety covers', dataType: 'BOOLEAN', available: false },
      { id: 'pool-fencing', name: 'Pool area safety fencing', dataType: 'BOOLEAN', available: false },
      
      // Emergency Preparedness
      { id: 'backup-generator', name: 'Backup generator system', dataType: 'BOOLEAN', available: false },
      { id: 'ups-power-backup', name: 'UPS power backup for essentials', dataType: 'BOOLEAN', available: false },
      { id: 'first-aid-stations', name: 'First aid kits/medical stations', dataType: 'INTEGER', available: false },
      { id: 'emergency-communications', name: 'Emergency communication system', dataType: 'BOOLEAN', available: false },
      
      // Staffing & Services
      { id: 'security-personnel', name: '24/7 security personnel', dataType: 'BOOLEAN', available: false },
      { id: 'security-patrol', name: 'Regular security patrol service', dataType: 'BOOLEAN', available: false },
      { id: 'safe-storage', name: 'In-villa safe/secure storage', dataType: 'INTEGER', available: false },
    ]
  },
  'child-friendly': {
    id: 'child-friendly',
    name: 'Child-Friendly',
    icon: Baby,
    completed: 0,
    total: 15,
    photoLimit: 15, // Children's facilities, safety equipment
    items: [
      // Infant Care Package (0-2 years)
      { id: 'infant-care-package', name: 'Complete infant care package', dataType: 'BOOLEAN', available: false },
      { id: 'baby-cribs', name: 'Baby cribs/travel cots', dataType: 'INTEGER', available: false },
      { id: 'highchairs-feeding', name: 'Highchairs & feeding equipment', dataType: 'INTEGER', available: false },
      { id: 'baby-bath-safety', name: 'Baby bathing & safety equipment', dataType: 'BOOLEAN', available: false },
      
      // Toddler Facilities (2-5 years)
      { id: 'toddler-beds', name: 'Toddler beds/bed guards', dataType: 'INTEGER', available: false },
      { id: 'toddler-toilet-aids', name: 'Toddler toilet training aids', dataType: 'BOOLEAN', available: false },
      { id: 'indoor-play-area', name: 'Indoor toddler play area', dataType: 'BOOLEAN', available: false },
      
      // Children's Spaces (5-12 years)
      { id: 'kids-bedroom', name: 'Dedicated children\'s bedroom', dataType: 'BOOLEAN', available: false },
      { id: 'kids-entertainment', name: 'Children\'s entertainment center', dataType: 'BOOLEAN', available: false },
      { id: 'educational-materials', name: 'Books, games & educational materials', dataType: 'BOOLEAN', available: false },
      
      // Outdoor & Pool Safety
      { id: 'kids-pool-area', name: 'Shallow kids pool/water area', dataType: 'BOOLEAN', available: false },
      { id: 'pool-safety-children', name: 'Pool safety measures for children', dataType: 'BOOLEAN', available: false },
      { id: 'outdoor-playground', name: 'Outdoor playground equipment', dataType: 'BOOLEAN', available: false },
      
      // Safety & Services
      { id: 'childproofing-package', name: 'Complete childproofing package', dataType: 'BOOLEAN', available: false },
      { id: 'childcare-services', name: 'Professional childcare services', dataType: 'BOOLEAN', available: false },
    ]
  }
};
