// MOTA HomeMove — house moving with partner trucks.
import type { ImageSourcePropType } from "react-native";

export type TruckKey = "pickup" | "small" | "medium" | "large";
export type Truck = {
  key: string; name: string; model: string; capacityTonnes: number; fits: string; homeSizes: string[];
  priceMin: number; priceMax: number; perKmOutside: number; imageUrl: string; photoCredit: string;
};
export type MovingCatalog = {
  trucks: Truck[];
  extras: { loaderPrice: number; packingPrice: number; assemblyPrice: number; stairsPricePerFloor: number; includedKm: number; visitFee: number; maxLoaders: number };
  itemKeys: string[];
  homeSizes: string[];
};
export type MoveStop = {
  name: string; address?: string; latitude: number; longitude: number;
  placeType: "apartment" | "house" | "office" | "shop" | "other";
  floor: number; hasElevator: boolean; truckAccess: "at_door" | "short_walk" | "long_walk";
  landmark: string; contactName: string; contactPhone: string;
};
export type MoveStatus = "requested" | "visit_scheduled" | "visited" | "quoted" | "accepted" | "confirmed" | "in_progress" | "completed" | "cancelled";
export type Move = {
  _id: string; ref: string; status: MoveStatus; from: MoveStop; to: MoveStop; homeSize: string;
  items: { key: string; qty: number }[]; truckKey: string | null; wantsVisit: boolean;
  visit?: { preferredDate?: string; timeWindow?: string; scheduledAt?: string | null };
  moveDate?: string | null; timeWindow: string; loaders: number; packing: boolean; assembly: boolean; notes: string;
  contactPhone: string; estimate?: { min: number; max: number; distanceKm: number };
  quote?: { amount: number | null; note?: string; quotedAt?: string | null };
  partner?: { company?: string; driverName?: string; phone?: string; plate?: string };
  statusHistory: { status: MoveStatus; at: string; note?: string }[];
  cancelReason?: string; createdAt: string;
};

/** Real sample photos bundled with the app; staff can replace them with partner truck photos (imageUrl). */
export const TRUCK_PHOTOS: Record<TruckKey, ImageSourcePropType> = {
  pickup: require("@/assets/images/moving/pickup.jpg"),
  small: require("@/assets/images/moving/small.jpg"),
  medium: require("@/assets/images/moving/medium.jpg"),
  large: require("@/assets/images/moving/large.jpg"),
};

export const truckPhoto = (t: Pick<Truck, "key" | "imageUrl">): ImageSourcePropType =>
  t.imageUrl ? { uri: t.imageUrl } : TRUCK_PHOTOS[t.key as TruckKey] || TRUCK_PHOTOS.medium;

export const HOME_SIZES = ["few_items", "studio", "one_bedroom", "two_bedroom", "three_bedroom", "four_plus", "office"] as const;
export const ITEM_KEYS = ["bed", "mattress", "sofa", "wardrobe", "table", "chairs", "fridge", "tv", "washing_machine", "cooker", "desk", "shelves", "boxes", "bags", "other_large"] as const;
export const ITEM_ICONS: Record<string, string> = {
  bed: "moon", mattress: "layers", sofa: "inbox", wardrobe: "columns", table: "grid", chairs: "square", fridge: "thermometer",
  tv: "tv", washing_machine: "disc", cooker: "zap", desk: "monitor", shelves: "align-justify", boxes: "package", bags: "shopping-bag", other_large: "box",
};

export const PROGRESS: MoveStatus[] = ["requested", "quoted", "accepted", "confirmed", "in_progress", "completed"];
export const ACTIVE_STATUSES: MoveStatus[] = ["requested", "visit_scheduled", "visited", "quoted", "accepted", "confirmed", "in_progress"];

/** The team's line for moving questions (same number as MOTA support). */
export const MOVING_SUPPORT_PHONE = process.env.EXPO_PUBLIC_MOVING_PHONE || process.env.EXPO_PUBLIC_SUPPORT_PHONE || "+250791364641";

export const money = (n?: number | null) => `${Math.round(Number(n) || 0).toLocaleString("en-US")} RWF`;
export const range = (min?: number, max?: number) => (min && max ? `${Math.round(min / 1000)}k – ${Math.round(max / 1000)}k RWF` : "—");
