import { MapPin, ArrowRight, Clock, Star, Car, Shield, RepeatIcon, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppState, type Driver, DAY_NAMES } from "@/store/AppContext";

interface DriverProfileModalProps {
  driver: Driver | undefined;
  isOpen: boolean;
  onClose: () => void;
}

const DriverProfileModal = ({ driver, isOpen, onClose }: DriverProfileModalProps) => {
  const { rides, recurringRides, getLocation } = useAppState();

  if (!driver) return null;

  const driverRides = rides.filter((r) => r.driverId === driver.id && r.availableSeats > 0);
  const driverRecurring = recurringRides.filter((r) => r.driverId === driver.id && r.status === "active");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{driver.name}</span>
            {driver.verified && (
              <Badge variant="secondary" className="gap-1 text-xs font-normal">
                <Shield className="h-3 w-3 text-primary" />
                Verified
              </Badge>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{driver.handle}</p>
        </DialogHeader>

        {/* Stats */}
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-primary text-primary" />
            <span className="font-medium">{driver.rating.toFixed(1)}</span>
          </span>
          <span className="text-muted-foreground">{driver.totalRides} rides completed</span>
        </div>

        {/* Vehicle */}
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Car className="h-3.5 w-3.5" />
            Vehicle
          </div>
          <p className="text-sm font-medium text-foreground">
            {driver.vehicle.year} {driver.vehicle.color} {driver.vehicle.make} {driver.vehicle.model}
          </p>
          <p className="font-mono text-xs text-muted-foreground">{driver.vehicle.licensePlate}</p>
        </div>

        {/* Available rides */}
        {driverRecurring.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <RepeatIcon className="h-3.5 w-3.5" />
              Recurring Rides
            </div>
            <div className="space-y-2">
              {driverRecurring.map((ride) => {
                const from = getLocation(ride.fromLocationId);
                const to = getLocation(ride.toLocationId);
                return (
                  <div key={ride.id} className="rounded-lg border border-border bg-card p-2.5 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <MapPin className="h-3 w-3 text-primary shrink-0" />
                      {from?.name ?? "Unknown"}
                      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      {to?.name ?? "Unknown"}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {DAY_NAMES[ride.dayOfWeek]}s {ride.departureTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {ride.availableSeats} seat{ride.availableSeats !== 1 ? "s" : ""} left
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {driverRides.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Upcoming Rides
            </div>
            <div className="space-y-2">
              {driverRides.map((ride) => {
                const from = getLocation(ride.fromLocationId);
                const to = getLocation(ride.toLocationId);
                return (
                  <div key={ride.id} className="rounded-lg border border-border bg-card p-2.5 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <MapPin className="h-3 w-3 text-primary shrink-0" />
                      {from?.name ?? "Unknown"}
                      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      {to?.name ?? "Unknown"}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ride.departureTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {ride.availableSeats} seat{ride.availableSeats !== 1 ? "s" : ""} left
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {driverRides.length === 0 && driverRecurring.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No available rides at the moment.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DriverProfileModal;
