import { useEffect, useMemo, useState } from "react";
import {
  MapPin, Clock, ArrowRight, User, Car,
  Search, SlidersHorizontal, Loader2,
  Users, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import RideDriverProfileModal from "@/components/RideDriverProfileModal";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

type SortMode = "time" | "seats" | "driver" | "routes";
type AlphaSortDirection = "asc" | "desc";

type RideRow = {
  offer_id: number;
  departure_time: string;
  available_seats: number;
  status: string;
  notes: string | null;
  from_location_name: string;
  to_location_name: string;
  driver_user_id: number;
  driver_first_name: string;
  driver_last_name: string;
  driver_username: string;
  driver_email?: string | null;
  driver_phone?: string | null;
  car_year: number | null;
  car_make: string | null;
  car_model: string | null;
  car_color: string | null;
  car_license_plate: string | null;
  driver_profile_photo_path?: string | null;
  car_photo_path?: string | null;
};

const formatDateTimeNoSeconds = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return value.replace(/:(\d{2})(?::\d{2})?/, "");
  }
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const RidesView = () => {
  const currentUserId = useMemo(() => {
    try {
      // Keep key consistent with login/session storage.
      const raw = localStorage.getItem("blueride.user") ?? localStorage.getItem("stuber.user");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return typeof parsed?.user_id === "number" ? parsed.user_id : null;
    } catch {
      return null;
    }
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("time");
  const [alphaSortDirection, setAlphaSortDirection] = useState<AlphaSortDirection>("asc");
  const [routeFromFilter, setRouteFromFilter] = useState("__all__");
  const [routeToFilter, setRouteToFilter] = useState("__all__");
  const [showFilters, setShowFilters] = useState(false);
  const [rides, setRides] = useState<RideRow[]>([]);
  const [bookedOfferIds, setBookedOfferIds] = useState<Set<number>>(new Set());
  const [actionOfferId, setActionOfferId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<{
    userId: number;
    firstName: string;
    lastName: string;
    username: string;
    email?: string | null;
    phone?: string | null;
    profilePhotoPath?: string | null;
    carYear: number | null;
    carMake: string | null;
    carModel: string | null;
    carColor: string | null;
    carLicensePlate: string | null;
    carPhotoPath?: string | null;
  } | null>(null);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);

  const fetchRides = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/rides`);
      if (!response.ok) throw new Error("Failed to fetch rides");
      const data = await response.json();
      setRides(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching rides:", error);
      toast.error("Failed to load rides");
      setRides([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    if (currentUserId == null) {
      setBookedOfferIds(new Set());
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/my-rides?userId=${currentUserId}`);
      if (!response.ok) throw new Error("Failed to fetch bookings");
      const data = await response.json();
      const offerIds = new Set<number>();
      const booked = Array.isArray(data?.bookedRides) ? data.bookedRides : [];
      for (const row of booked) {
        const id = Number(row?.offer_id);
        if (Number.isInteger(id) && id > 0) offerIds.add(id);
      }
      setBookedOfferIds(offerIds);
    } catch (error) {
      console.error("Error fetching booking state:", error);
      setBookedOfferIds(new Set());
    }
  };

  const handleBookToggle = async (ride: RideRow) => {
    if (currentUserId == null) {
      toast.error("Please sign in to book rides");
      return;
    }

    const isBooked = bookedOfferIds.has(ride.offer_id);
    setActionOfferId(ride.offer_id);
    try {
      if (isBooked) {
        const response = await fetch(
          `${API_BASE_URL}/api/rides/${ride.offer_id}/book?userId=${currentUserId}`,
          { method: "DELETE" }
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Failed to cancel booking");
        toast.success("Booking cancelled");
      } else {
        const response = await fetch(`${API_BASE_URL}/api/rides/${ride.offer_id}/book`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUserId }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Failed to book ride");
        toast.success("Ride booked");
      }

      await Promise.all([fetchRides(), fetchMyBookings()]);
    } catch (error) {
      console.error("Error updating booking:", error);
      toast.error(error instanceof Error ? error.message : "Could not update booking");
    } finally {
      setActionOfferId(null);
    }
  };

  useEffect(() => {
    void Promise.all([fetchRides(), fetchMyBookings()]);
  }, []);

  const filteredRides = useMemo(() => {
    let result = rides.filter(
      (r) =>
        (r.status || "").toLowerCase() === "active" &&
        (currentUserId == null || r.driver_user_id !== currentUserId)
    );

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) => {
        const from = (r.from_location_name || "").toLowerCase();
        const to = (r.to_location_name || "").toLowerCase();
        const driver = `${r.driver_first_name ?? ""} ${r.driver_last_name ?? ""}`.toLowerCase();
        return from.includes(q) || to.includes(q) || driver.includes(q);
      });
    }

    if (sortMode === "routes") {
      if (routeFromFilter !== "__all__") {
        result = result.filter((r) => (r.from_location_name ?? "") === routeFromFilter);
      }
      if (routeToFilter !== "__all__") {
        result = result.filter((r) => (r.to_location_name ?? "") === routeToFilter);
      }
    }

    result.sort((a, b) => {
      if (sortMode === "seats") return (b.available_seats ?? 0) - (a.available_seats ?? 0);
      if (sortMode === "time" || sortMode === "routes") {
        return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime();
      }

      const direction = alphaSortDirection === "asc" ? 1 : -1;

      const driverA = `${a.driver_first_name ?? ""} ${a.driver_last_name ?? ""}`.trim() || a.driver_username || "";
      const driverB = `${b.driver_first_name ?? ""} ${b.driver_last_name ?? ""}`.trim() || b.driver_username || "";
      return direction * driverA.localeCompare(driverB, undefined, { sensitivity: "base" });
    });

    return result;
  }, [rides, searchQuery, sortMode, alphaSortDirection, routeFromFilter, routeToFilter, currentUserId]);

  const isAlphabeticalSort = sortMode === "driver";

  const routeFromOptions = useMemo(() => {
    return Array.from(new Set(rides.map((r) => r.from_location_name).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [rides]);

  const routeToOptions = useMemo(() => {
    return Array.from(new Set(rides.map((r) => r.to_location_name).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [rides]);

  const handleRefresh = () => {
    void Promise.all([fetchRides(), fetchMyBookings()]);
    toast("Rides refreshed", { description: `${filteredRides.length} rides available` });
  };

  return (
    <div className="mx-auto max-w-lg animate-fade-in px-4 py-6 pb-24">
      <RideDriverProfileModal
        open={isDriverModalOpen}
        onClose={() => {
          setIsDriverModalOpen(false);
          setSelectedDriver(null);
        }}
        driver={selectedDriver}
        upcomingRides={
          selectedDriver
            ? rides.filter((r) => r.driver_user_id === selectedDriver.userId)
            : []
        }
      />
      <div className="mb-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Available Rides</h1>
          <p className="text-sm text-muted-foreground dark:text-foreground/80">{filteredRides.length} rides near you</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} className="text-xs text-foreground/80 hover:text-foreground">
          Refresh
        </Button>
      </div>

      {/* Search & filters */}
      <div className="mt-4 mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search routes or drivers…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors ${showFilters ? "text-primary dark:text-accent" : "text-foreground/70 hover:text-foreground"}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 animate-fade-in">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 gap-y-2 pt-1 pb-2">
              <span className="whitespace-nowrap pt-1 text-xs font-medium text-foreground/80">Sort by:</span>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
                  <SelectTrigger className="h-8 w-[170px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time">Departure Time</SelectItem>
                    <SelectItem value="seats">Available Seats</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="routes">Routes</SelectItem>
                  </SelectContent>
                </Select>

                {isAlphabeticalSort && (
                  <>
                    <span className="whitespace-nowrap text-xs font-medium text-foreground/80">Order:</span>
                    <Select
                      value={alphaSortDirection}
                      onValueChange={(v) => setAlphaSortDirection(v as AlphaSortDirection)}
                    >
                      <SelectTrigger className="h-8 w-[100px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">A-Z</SelectItem>
                        <SelectItem value="desc">Z-A</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>

              {sortMode === "routes" && (
                <>
                  <div aria-hidden="true" />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Select value={routeFromFilter} onValueChange={setRouteFromFilter}>
                      <SelectTrigger className="h-8 w-full min-w-[170px] text-xs">
                        <SelectValue placeholder="Departure" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Departures</SelectItem>
                        {routeFromOptions.map((name) => (
                          <SelectItem key={`from-${name}`} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={routeToFilter} onValueChange={setRouteToFilter}>
                      <SelectTrigger className="h-8 w-full min-w-[170px] text-xs">
                        <SelectValue placeholder="Destination" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Destinations</SelectItem>
                        {routeToOptions.map((name) => (
                          <SelectItem key={`to-${name}`} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="rounded-xl border border-border/70 bg-card p-6 text-center dark:border-white/15">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground dark:text-foreground/75">Loading rides...</p>
          </div>
        )}
        {filteredRides.length === 0 && (
          <div className="rounded-xl border border-border/70 bg-card p-8 text-center dark:border-white/15">
            <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No rides found</p>
            <p className="text-xs text-muted-foreground dark:text-foreground/75">Try adjusting your search or check back later.</p>
          </div>
        )}

        {!loading && filteredRides.map((ride, i) => {
          const isBooked = bookedOfferIds.has(ride.offer_id);
          const isMutating = actionOfferId === ride.offer_id;
          const driverName = `${ride.driver_first_name ?? ""} ${ride.driver_last_name ?? ""}`.trim() || ride.driver_username;
          const departureText = formatDateTimeNoSeconds(ride.departure_time);
          const vehicleText = [ride.car_color, ride.car_year, ride.car_make, ride.car_model]
            .filter(Boolean)
            .join(" ");

          return (
            <div
              key={ride.offer_id}
              className="animate-slide-up rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-shadow hover:shadow-md dark:border-white/15"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
            >
              {/* Route */}
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-primary dark:text-accent" />
                  <span>{ride.from_location_name ?? "Unknown"}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>{ride.to_location_name ?? "Unknown"}</span>
                </div>
              </div>

              {/* Details grid */}
              <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground dark:text-foreground/75">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <button
                    type="button"
                    className="text-foreground font-medium underline-offset-2 hover:underline transition-colors"
                    onClick={() => {
                      setSelectedDriver({
                        userId: ride.driver_user_id,
                        firstName: ride.driver_first_name,
                        lastName: ride.driver_last_name,
                        username: ride.driver_username,
                        email: ride.driver_email,
                        phone: ride.driver_phone,
                        profilePhotoPath: ride.driver_profile_photo_path,
                        carYear: ride.car_year,
                        carMake: ride.car_make,
                        carModel: ride.car_model,
                        carColor: ride.car_color,
                        carLicensePlate: ride.car_license_plate,
                        carPhotoPath: ride.car_photo_path,
                      });
                      setIsDriverModalOpen(true);
                    }}
                  >
                    {driverName}
                  </button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Shield className="h-3 w-3 text-primary dark:text-accent" />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Verified BYU Student</TooltipContent>
                  </Tooltip>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {departureText}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span className={(ride.available_seats ?? 0) <= 1 ? "text-destructive font-medium" : ""}>
                    {ride.available_seats} seat{ride.available_seats === 1 ? "" : "s"} available
                  </span>
                </span>
                <span className="flex items-center gap-1.5 col-span-2">
                  <Car className="h-3.5 w-3.5" />
                  {vehicleText || "Vehicle info unavailable"}
                  {ride.car_license_plate ? (
                    <>
                      {" · "}
                      <span className="font-mono text-foreground">{ride.car_license_plate}</span>
                    </>
                  ) : null}
                </span>
              </div>

              {/* Action */}
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  disabled={isMutating || (!isBooked && ride.available_seats === 0)}
                  className="min-w-[80px] text-xs dark:bg-accent dark:text-accent-foreground dark:hover:bg-accent/90"
                  onClick={() => handleBookToggle(ride)}
                >
                  {isMutating ? "Saving..." : isBooked ? "Cancel Booking" : "Book Ride"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RidesView;
