import { useMemo } from "react";
import {
  MapPin,
  ArrowRight,
  Clock,
  Car,
  Users,
  Shield,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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

type DriverProfile = {
  userId: number;
  firstName: string;
  lastName: string;
  username: string;
  profilePhotoPath?: string | null;
  carYear: number | null;
  carMake: string | null;
  carModel: string | null;
  carColor: string | null;
  carLicensePlate: string | null;
  carPhotoPath?: string | null;
};

function uploadUrlFromPath(value: string | null | undefined) {
  if (!value) return "";
  const v = value.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `${API_BASE_URL}/uploads/${encodeURIComponent(v)}`;
}

interface RideDriverProfileModalProps {
  open: boolean;
  onClose: () => void;
  driver: DriverProfile | null;
  upcomingRides: RideRow[];
}

const RideDriverProfileModal = ({
  open,
  onClose,
  driver,
  upcomingRides,
}: RideDriverProfileModalProps) => {
  const title = driver
    ? `${driver.firstName} ${driver.lastName}`.trim() || "Driver"
    : "Driver";

  const carText = useMemo(() => {
    if (!driver) return "";
    const parts = [
      driver.carYear != null ? String(driver.carYear) : null,
      driver.carColor,
      driver.carMake,
      driver.carModel,
    ].filter(Boolean) as string[];
    return parts.join(" ");
  }, [driver]);

  const profileImg = uploadUrlFromPath(driver?.profilePhotoPath);
  const carImg = uploadUrlFromPath(driver?.carPhotoPath);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{title}</span>
            <Badge variant="secondary" className="gap-1 text-xs font-normal">
              <Shield className="h-3 w-3 text-primary" />
              Verified
            </Badge>
          </DialogTitle>
          {driver?.username ? (
            <p className="text-sm text-muted-foreground">@{driver.username}</p>
          ) : null}
        </DialogHeader>

        <div className="flex gap-3 items-center">
          {profileImg ? (
            <img
              src={profileImg}
              alt="Driver profile"
              className="h-16 w-16 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-full border border-border bg-muted/40" />
          )}
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Car className="h-3.5 w-3.5" />
              Vehicle
            </div>
            <p className="text-sm font-medium text-foreground truncate">
              {carText || "Vehicle info unavailable"}
            </p>
            {driver?.carLicensePlate ? (
              <p className="text-xs text-muted-foreground font-mono">
                {driver.carLicensePlate}
              </p>
            ) : null}
          </div>
        </div>

        {carImg ? (
          <div className="mt-3">
            <img
              src={carImg}
              alt="Vehicle"
              className="w-full aspect-[4/3] rounded-lg border border-border object-cover"
            />
          </div>
        ) : null}

        {upcomingRides.length > 0 ? (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Upcoming rides
            </div>
            <div className="space-y-2">
              {upcomingRides.slice(0, 4).map((r) => (
                <div key={r.offer_id} className="rounded-lg border border-border bg-card p-2.5 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <MapPin className="h-3 w-3 text-primary shrink-0" />
                    <span>{r.from_location_name ?? "Unknown"}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span>{r.to_location_name ?? "Unknown"}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDateTimeNoSeconds(r.departure_time)}
                    </span>
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {r.available_seats} seat{r.available_seats === 1 ? "" : "s"} available
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No upcoming rides for this driver.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RideDriverProfileModal;

