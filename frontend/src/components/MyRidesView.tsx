import { useEffect, useMemo, useState } from "react";
import {
  MapPin, ArrowRight, Clock, User, Car, Ticket, RepeatIcon, Loader2, Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import RideDriverProfileModal from "@/components/RideDriverProfileModal";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

type BookedRideRow = {
  trip_id: number;
  booking_status: string;
  seats_confirmed: number;
  booked_at: string;
  offer_id: number;
  departure_time: string;
  available_seats: number;
  offer_status: string;
  from_location_name: string;
  to_location_name: string;
  driver_user_id: number;
  driver_first_name: string;
  driver_last_name: string;
  driver_username: string;
  driver_profile_photo_path?: string | null;
  car_year?: number | null;
  car_make?: string | null;
  car_model?: string | null;
  car_color?: string | null;
  car_license_plate?: string | null;
  car_photo_path?: string | null;
};

type OfferedRideRow = {
  offer_id: number;
  departure_time: string;
  available_seats: number;
  status: string;
  notes?: string | null;
  from_location_name: string;
  to_location_name: string;
  seats_booked: number;
  rider_count: number;
  riders?: RiderProfileRow[];
};

type DriverUpcomingRideRow = {
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
  car_year: number | null;
  car_make: string | null;
  car_model: string | null;
  car_color: string | null;
  car_license_plate: string | null;
  driver_profile_photo_path?: string | null;
  car_photo_path?: string | null;
};

type RiderProfileRow = {
  user_id: number;
  first_name: string;
  last_name: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  profile_photo_path?: string | null;
  car_year?: number | null;
  car_make?: string | null;
  car_model?: string | null;
  car_color?: string | null;
  car_license_plate?: string | null;
  car_photo_path?: string | null;
};

const MyRidesView = () => {
  const currentUserId = useMemo(() => {
    try {
      const raw = localStorage.getItem("blueride.user");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return typeof parsed?.user_id === "number" ? parsed.user_id : null;
    } catch {
      return null;
    }
  }, []);

  const [bookedRides, setBookedRides] = useState<BookedRideRow[]>([]);
  const [offeredRides, setOfferedRides] = useState<OfferedRideRow[]>([]);
  const [activeRides, setActiveRides] = useState<DriverUpcomingRideRow[]>([]);
  const [cancelingTripId, setCancelingTripId] = useState<number | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<{
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalShowUpcoming, setProfileModalShowUpcoming] = useState(false);
  const [profileModalShowVehicle, setProfileModalShowVehicle] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMyRides = async () => {
    if (currentUserId == null) {
      setBookedRides([]);
      setOfferedRides([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/my-rides?userId=${currentUserId}`);
      if (!response.ok) throw new Error("Failed to fetch my rides");
      const data = await response.json();
      setBookedRides(Array.isArray(data?.bookedRides) ? data.bookedRides : []);
      setOfferedRides(Array.isArray(data?.offeredRides) ? data.offeredRides : []);

      const ridesResponse = await fetch(`${API_BASE_URL}/api/rides`);
      if (ridesResponse.ok) {
        const ridesData = await ridesResponse.json();
        setActiveRides(Array.isArray(ridesData) ? ridesData : []);
      } else {
        setActiveRides([]);
      }
    } catch (error) {
      console.error("Error fetching my rides:", error);
      toast.error("Failed to load My Rides");
      setBookedRides([]);
      setOfferedRides([]);
      setActiveRides([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRides();
  }, []);

  const handleCancelBooking = async (ride: BookedRideRow) => {
    if (currentUserId == null) {
      toast.error("Please sign in to manage bookings");
      return;
    }
    setCancelingTripId(ride.trip_id);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rides/${ride.offer_id}/book?userId=${currentUserId}`,
        { method: "DELETE" }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Failed to cancel booking");
      toast.success("Booking cancelled");
      await fetchMyRides();
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast.error(error instanceof Error ? error.message : "Could not cancel booking");
    } finally {
      setCancelingTripId(null);
    }
  };

  return (
    <div className="mx-auto max-w-lg animate-fade-in px-4 py-6 pb-24 space-y-8">
      <RideDriverProfileModal
        open={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedProfile(null);
        }}
        driver={selectedProfile}
        upcomingRides={
          selectedProfile
            ? activeRides.filter((ride) => ride.driver_user_id === selectedProfile.userId)
            : []
        }
        showUpcomingRides={profileModalShowUpcoming}
        showVehicleInfo={profileModalShowVehicle}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Rides</h1>
          <p className="text-sm text-muted-foreground">Your booked rides and rides you are offering</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchMyRides} className="text-xs text-muted-foreground">
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading your rides...</p>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Ticket className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Booked Rides</h2>
          {bookedRides.length > 0 && (
            <Badge variant="secondary" className="text-xs">{bookedRides.length}</Badge>
          )}
        </div>

        {bookedRides.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <Ticket className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No booked rides yet</p>
            <p className="text-xs text-muted-foreground">Book a ride from Find a Ride and it will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookedRides.map((ride, i) => {
              const driverName = `${ride.driver_first_name ?? ""} ${ride.driver_last_name ?? ""}`.trim() || ride.driver_username;
              const departureText = new Date(ride.departure_time).toLocaleString();
              const bookingStatus = (ride.booking_status || "").toLowerCase();
              const vehicleText = [ride.car_color, ride.car_year, ride.car_make, ride.car_model].filter(Boolean).join(" ");

              return (
                <div
                  key={ride.trip_id}
                  className="animate-slide-up rounded-xl border border-border bg-card p-4 shadow-sm"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MapPin className="h-4 w-4 shrink-0 text-primary" />
                      <span>{ride.from_location_name ?? "Unknown"}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span>{ride.to_location_name ?? "Unknown"}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={bookingStatus === "confirmed"
                        ? "border-primary bg-accent text-accent-foreground text-xs"
                        : "border-yellow-500 text-yellow-600 text-xs"}
                    >
                      {bookingStatus === "confirmed" ? "Confirmed" : "Pending"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <button
                        type="button"
                        className="font-medium text-foreground underline-offset-2 hover:underline transition-colors"
                        onClick={() => {
                          setSelectedProfile({
                            userId: ride.driver_user_id,
                            firstName: ride.driver_first_name,
                            lastName: ride.driver_last_name,
                            username: ride.driver_username,
                            profilePhotoPath: ride.driver_profile_photo_path,
                            carYear: ride.car_year ?? null,
                            carMake: ride.car_make ?? null,
                            carModel: ride.car_model ?? null,
                            carColor: ride.car_color ?? null,
                            carLicensePlate: ride.car_license_plate ?? null,
                            carPhotoPath: ride.car_photo_path ?? null,
                          });
                          setProfileModalShowUpcoming(true);
                          setProfileModalShowVehicle(true);
                          setIsProfileModalOpen(true);
                        }}
                      >
                        {driverName}
                      </button>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {departureText}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Car className="h-3.5 w-3.5" />
                      {vehicleText || "Vehicle info unavailable"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {ride.seats_confirmed} seat{ride.seats_confirmed === 1 ? "" : "s"} booked
                    </span>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled={cancelingTripId === ride.trip_id}
                      onClick={() => handleCancelBooking(ride)}
                    >
                      {cancelingTripId === ride.trip_id ? "Cancelling..." : "Cancel Booking"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <div className="border-t border-border" />

      <section>
        <div className="mb-3 flex items-center gap-2">
          <RepeatIcon className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Rides You Are Offering</h2>
          {offeredRides.length > 0 && (
            <Badge variant="secondary" className="text-xs">{offeredRides.length}</Badge>
          )}
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          These are rides posted from your account.
        </p>

        {offeredRides.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <RepeatIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No offered rides yet</p>
            <p className="text-xs text-muted-foreground">Post a ride and it will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {offeredRides.map((ride, i) => {
              const departureText = new Date(ride.departure_time).toLocaleString();
              return (
                <div
                  key={ride.offer_id}
                  className="animate-slide-up rounded-xl border border-border bg-card p-4 shadow-sm"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MapPin className="h-4 w-4 shrink-0 text-primary" />
                      <span>{ride.from_location_name ?? "Unknown"}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span>{ride.to_location_name ?? "Unknown"}</span>
                    </div>
                    <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                      {ride.status}
                    </Badge>
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {departureText}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {ride.rider_count} rider{ride.rider_count === 1 ? "" : "s"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Ticket className="h-3.5 w-3.5" />
                      {ride.seats_booked} seat{ride.seats_booked === 1 ? "" : "s"} booked
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Car className="h-3.5 w-3.5" />
                      {ride.available_seats} seat{ride.available_seats === 1 ? "" : "s"} available
                    </span>
                  </div>

                  {ride.notes ? (
                    <p className="text-xs text-muted-foreground">{ride.notes}</p>
                  ) : null}

                  <div className="mt-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Booked riders</p>
                    {Array.isArray(ride.riders) && ride.riders.length > 0 ? (
                      <div className="space-y-2">
                        {ride.riders.map((rider) => {
                          const riderName = `${rider.first_name ?? ""} ${rider.last_name ?? ""}`.trim() || rider.username;
                          return (
                            <div
                              key={`${ride.offer_id}-${rider.user_id}`}
                              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
                            >
                              <button
                                type="button"
                                className="text-left text-xs font-medium text-foreground underline-offset-2 hover:underline"
                                onClick={() => {
                                  setSelectedProfile({
                                    userId: rider.user_id,
                                    firstName: rider.first_name,
                                    lastName: rider.last_name,
                                    username: rider.username,
                                    email: rider.email,
                                    phone: rider.phone,
                                    profilePhotoPath: rider.profile_photo_path,
                                    carYear: rider.car_year ?? null,
                                    carMake: rider.car_make ?? null,
                                    carModel: rider.car_model ?? null,
                                    carColor: rider.car_color ?? null,
                                    carLicensePlate: rider.car_license_plate ?? null,
                                    carPhotoPath: rider.car_photo_path ?? null,
                                  });
                                  setProfileModalShowUpcoming(false);
                                  setProfileModalShowVehicle(false);
                                  setIsProfileModalOpen(true);
                                }}
                              >
                                {riderName}
                              </button>
                              <Badge variant="outline" className="text-[10px]">Booked</Badge>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No one has booked this ride yet.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default MyRidesView;
