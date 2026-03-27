import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

// ── Types ───────────────────────────────────────────────────────────
export interface Location {
  id: string;
  name: string;
  type: "campus" | "residential" | "transit";
}

export interface Driver {
  id: string;
  name: string;
  handle: string;
  rating: number;
  totalRides: number;
  verified: boolean;
  vehicle: {
    year: number;
    make: string;
    model: string;
    color: string;
    licensePlate: string;
  };
}

export interface RideOffer {
  id: number;
  driverId: string;
  fromLocationId: string;
  toLocationId: string;
  departureTime: string;
  date: string;
  totalSeats: number;
  availableSeats: number;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface Booking {
  rideId: number;
  status: BookingStatus;
  timestamp: number;
}

// ── Seed Data ───────────────────────────────────────────────────────
export const LOCATIONS: Location[] = [
  { id: "loc-1", name: "The Village", type: "residential" },
  { id: "loc-2", name: "RB Parking Lot", type: "campus" },
  { id: "loc-3", name: "Liberty Square", type: "residential" },
  { id: "loc-4", name: "Tanner Building", type: "campus" },
  { id: "loc-5", name: "Campus Plaza", type: "campus" },
  { id: "loc-6", name: "Marriott Center", type: "campus" },
  { id: "loc-7", name: "Life Science Building", type: "campus" },
  { id: "loc-8", name: "Glenwood", type: "residential" },
  { id: "loc-9", name: "Old Academy", type: "campus" },
  { id: "loc-10", name: "Heritage Halls", type: "residential" },
  { id: "loc-11", name: "LaVell Edwards Stadium", type: "campus" },
  { id: "loc-12", name: "Wyview Park", type: "residential" },
  { id: "loc-13", name: "Helaman Halls", type: "residential" },
  { id: "loc-14", name: "Wilkinson Center", type: "campus" },
];

export const DRIVERS: Driver[] = [
  { id: "d-1", name: "Alex Martinez", handle: "@alexm", rating: 4.9, totalRides: 142, verified: true, vehicle: { year: 2023, make: "Honda", model: "Civic", color: "Silver", licensePlate: "BYU-3291" } },
  { id: "d-2", name: "Sarah Kim", handle: "@sarahk", rating: 4.8, totalRides: 98, verified: true, vehicle: { year: 2022, make: "Toyota", model: "Camry", color: "White", licensePlate: "UTH-7714" } },
  { id: "d-3", name: "James Lewis", handle: "@jamesl", rating: 5.0, totalRides: 215, verified: true, vehicle: { year: 2024, make: "Tesla", model: "Model 3", color: "Black", licensePlate: "EV-04821" } },
  { id: "d-4", name: "Emily Reyes", handle: "@emilyr", rating: 4.7, totalRides: 63, verified: true, vehicle: { year: 2021, make: "Hyundai", model: "Sonata", color: "Blue", licensePlate: "PRV-5580" } },
  { id: "d-5", name: "David Wang", handle: "@davidw", rating: 4.6, totalRides: 47, verified: true, vehicle: { year: 2023, make: "Mazda", model: "CX-5", color: "Red", licensePlate: "UTH-9023" } },
  { id: "d-6", name: "Rachel Torres", handle: "@rachelt", rating: 4.9, totalRides: 180, verified: true, vehicle: { year: 2022, make: "Subaru", model: "Outback", color: "Green", licensePlate: "MTN-3347" } },
  { id: "d-7", name: "Chris Bennett", handle: "@chrisb", rating: 4.5, totalRides: 31, verified: false, vehicle: { year: 2020, make: "Ford", model: "Focus", color: "Gray", licensePlate: "BYU-1109" } },
];

const INITIAL_RIDES: RideOffer[] = [
  { id: 1, driverId: "d-1", fromLocationId: "loc-1", toLocationId: "loc-2", departureTime: "10:00 AM", date: "2026-02-10", totalSeats: 4, availableSeats: 3 },
  { id: 2, driverId: "d-2", fromLocationId: "loc-3", toLocationId: "loc-4", departureTime: "10:15 AM", date: "2026-02-10", totalSeats: 4, availableSeats: 2 },
  { id: 3, driverId: "d-3", fromLocationId: "loc-5", toLocationId: "loc-6", departureTime: "10:30 AM", date: "2026-02-10", totalSeats: 4, availableSeats: 4 },
  { id: 4, driverId: "d-4", fromLocationId: "loc-7", toLocationId: "loc-8", departureTime: "11:00 AM", date: "2026-02-10", totalSeats: 3, availableSeats: 1 },
  { id: 5, driverId: "d-5", fromLocationId: "loc-9", toLocationId: "loc-4", departureTime: "11:15 AM", date: "2026-02-10", totalSeats: 4, availableSeats: 3 },
  { id: 6, driverId: "d-6", fromLocationId: "loc-10", toLocationId: "loc-3", departureTime: "11:30 AM", date: "2026-02-10", totalSeats: 4, availableSeats: 2 },
  { id: 7, driverId: "d-7", fromLocationId: "loc-11", toLocationId: "loc-10", departureTime: "12:00 PM", date: "2026-02-10", totalSeats: 5, availableSeats: 4 },
  { id: 8, driverId: "d-1", fromLocationId: "loc-14", toLocationId: "loc-12", departureTime: "12:30 PM", date: "2026-02-10", totalSeats: 4, availableSeats: 2 },
  { id: 9, driverId: "d-3", fromLocationId: "loc-13", toLocationId: "loc-5", departureTime: "1:00 PM", date: "2026-02-10", totalSeats: 4, availableSeats: 3 },
];

// ── Context ─────────────────────────────────────────────────────────
interface AppState {
  rides: RideOffer[];
  bookings: Map<number, Booking>;
  bookRide: (rideId: number) => void;
  confirmBooking: (rideId: number) => void;
  addRide: (ride: Omit<RideOffer, "id">) => void;
  getDriver: (id: string) => Driver | undefined;
  getLocation: (id: string) => Location | undefined;
  liveRideCount: number;
  refreshLiveRideCount: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const useAppState = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [rides, setRides] = useState<RideOffer[]>(INITIAL_RIDES);
  const [bookings, setBookings] = useState<Map<number, Booking>>(new Map());
  const [liveRideCount, setLiveRideCount] = useState(0);

  const bookRide = useCallback((rideId: number) => {
    setBookings((prev) => {
      const next = new Map(prev);
      next.set(rideId, { rideId, status: "pending", timestamp: Date.now() });
      return next;
    });
    setTimeout(() => {
      setBookings((prev) => {
        const next = new Map(prev);
        const booking = next.get(rideId);
        if (booking) next.set(rideId, { ...booking, status: "confirmed" });
        return next;
      });
      setRides((prev) =>
        prev.map((r) =>
          r.id === rideId && r.availableSeats > 0
            ? { ...r, availableSeats: r.availableSeats - 1 }
            : r
        )
      );
    }, 2000);
  }, []);

  const confirmBooking = useCallback((rideId: number) => {
    setBookings((prev) => {
      const next = new Map(prev);
      const booking = next.get(rideId);
      if (booking) next.set(rideId, { ...booking, status: "confirmed" });
      return next;
    });
  }, []);

  const addRide = useCallback((ride: Omit<RideOffer, "id">) => {
    setRides((prev) => [...prev, { ...ride, id: Date.now() }]);
  }, []);

  const getDriver = useCallback((id: string) => DRIVERS.find((d) => d.id === id), []);
  const getLocation = useCallback((id: string) => LOCATIONS.find((l) => l.id === id), []);

  const refreshLiveRideCount = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rides`);
      if (!response.ok) throw new Error("Failed to fetch live ride count");
      const data = await response.json();
      const rows = Array.isArray(data) ? data : [];
      const count = rows.filter((r) => Number(r?.available_seats ?? 0) > 0).length;
      setLiveRideCount(count);
    } catch (error) {
      console.error("Error refreshing live ride count:", error);
    }
  }, []);

  useEffect(() => {
    void refreshLiveRideCount();
  }, [refreshLiveRideCount]);

  return (
    <AppContext.Provider value={{
      rides, bookings, bookRide, confirmBooking, addRide,
      getDriver, getLocation, liveRideCount, refreshLiveRideCount,
    }}>
      {children}
    </AppContext.Provider>
  );
};
