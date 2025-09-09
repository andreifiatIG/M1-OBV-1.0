export const PHOTO_LIMITS = {
  // Special categories with lower limits
  'property-layout-spaces': 10, // Floor plans, room layouts
  'home-office': 8,             // Office equipment, workspaces
  'accessibility': 10,          // Accessibility features, equipment
  'safety-security': 12,        // Safety systems, security equipment
  'service-staff': 12,          // Service areas, staff facilities
  
  // Standard categories
  'technology': 12,             // Tech installations, smart systems
  'living-spaces': 15,          // Living room, entertainment areas
  'bathrooms': 15,              // Bathroom photos, fixtures
  'child-friendly': 15,         // Children's facilities, safety equipment
  'entertainment-gaming': 15,   // Entertainment systems, gaming areas
  
  // High-photo categories
  'kitchen-dining': 18,         // Kitchen equipment, dining areas
  'wellness-spa': 18,           // Spa facilities, wellness areas
  'occupancy-sleeping': 20,     // Bedroom photos, bed configurations
  'outdoor-facilities': 20,     // Pool, garden, outdoor areas
} as const;

export type PhotoLimitCategory = keyof typeof PHOTO_LIMITS;

export function getPhotoLimit(categoryId: string): number {
  return PHOTO_LIMITS[categoryId as PhotoLimitCategory] || 15; // Default limit
}

export function countPhotosInCategory(items: Array<{photoUrl?: string}>): number {
  return items.filter(item => item.photoUrl && item.photoUrl.trim() !== '').length;
}

export function canUploadPhoto(
  categoryId: string, 
  currentPhotoCount: number, 
  hasExistingPhoto: boolean = false
): boolean {
  const limit = getPhotoLimit(categoryId);
  // If replacing an existing photo, don't count it against the limit
  const effectiveCount = hasExistingPhoto ? currentPhotoCount - 1 : currentPhotoCount;
  return effectiveCount < limit;
}

export function getPhotoLimitWarning(categoryId: string, currentCount: number): string | null {
  const limit = getPhotoLimit(categoryId);
  const remaining = limit - currentCount;
  
  if (remaining <= 0) {
    return `Photo limit reached (${limit} max). Remove photos to add new ones.`;
  } else if (remaining <= 2) {
    return `${remaining} photo${remaining === 1 ? '' : 's'} remaining (${limit} max).`;
  }
  
  return null;
}