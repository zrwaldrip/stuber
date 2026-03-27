import {
  MapPin, ArrowRight, Clock, User, Star, Car, Bell, BellOff,
  BookMarked, Ticket, RepeatIcon, AlertTriangle, UserX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAppState, DAY_NAMES } from "@/store/AppContext";

// Current user is driver d-3 (James Lewis) for the driver section
const CURRENT_DRIVER_ID = "d-3";

const MyRidesView = () => {
  const {
    rides, bookings,
    recurringRides, mySubscriptions, riderSubscriptions,
    unsubscribeFromRecurring, markRiderNoShow,
    getDriver, getLocation, getRecurringRide,
  } = useAppState();

  const bookedRides = rides.filter((r) => bookings.has(r.id));

  // My subscriptions as a rider
  const activeSubscriptions = mySubscriptions.filter((s) => s.status === "active");

  // Recurring rides I posted as a driver
  const myPostedRides = recurringRides.filter((r) => r.driverId === CURRENT_DRIVER_ID && r.status === "active");

  const handleUnsubscribe = (subId: string, recurringRideId: string) => {
    const ride = getRecurringRide(recurringRideId);
    const driver = getDriver(ride?.driverId ?? "");
    unsubscribeFromRecurring(subId);
    toast("Unsubscribed", { description: `Removed from ${driver?.name}'s ${DAY_NAMES[ride?.dayOfWeek ?? 0]} ride.` });
  };

  const handleMarkNoShow = (riderSubId: string, riderName: string, currentMisses: number) => {
    markRiderNoShow(riderSubId);
    if (currentMisses + 1 >= 3) {
      toast.warning(`${riderName} removed`, {
        description: "3 no-shows reached — their subscription has been cancelled.",
      });
    } else {
      toast(`No-show recorded for ${riderName}`, {
        description: `${currentMisses + 1}/3 misses. Auto-cancel triggers at 3.`,
      });
    }
  };

  const missBadge = (count: number) => {
    if (count === 0) return null;
    if (count === 1) return (
      <Badge variant="outline" className="border-warning/60 bg-warning-muted text-warning-foreground text-xs gap-1">
        <AlertTriangle className="h-3 w-3" />
        1 miss
      </Badge>
    );
    if (count === 2) return (
      <Badge variant="outline" className="border-warning bg-warning-muted text-warning-foreground text-xs gap-1">
        <AlertTriangle className="h-3 w-3" />
        2 misses — warning
      </Badge>
    );
    return (
      <Badge variant="outline" className="border-destructive text-destructive text-xs gap-1">
        <AlertTriangle className="h-3 w-3" />
        3 misses
      </Badge>
    );
  };

  return (
    <div className="mx-auto max-w-lg animate-fade-in px-4 py-6 pb-24 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Rides</h1>
        <p className="text-sm text-muted-foreground dark:text-foreground/80">Your bookings, subscriptions, and posted rides</p>
      </div>

      {/* ── My Subscriptions (as rider) ─────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary dark:text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/85">My Subscriptions</h2>
          {activeSubscriptions.length > 0 && (
            <Badge variant="secondary" className="text-xs">{activeSubscriptions.length}</Badge>
          )}
        </div>
        <p className="mb-3 text-xs text-muted-foreground dark:text-foreground/75">
          You're auto-booked on these recurring rides every week. 3 no-shows and your subscription is cancelled.
        </p>

        {activeSubscriptions.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-card p-6 text-center dark:border-white/15">
            <BookMarked className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No active subscriptions</p>
            <p className="text-xs text-muted-foreground dark:text-foreground/75">Subscribe to a recurring ride from Find a Ride.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeSubscriptions.map((sub, i) => {
              const ride = getRecurringRide(sub.recurringRideId);
              const driver = getDriver(ride?.driverId ?? "");
              const from = getLocation(ride?.fromLocationId ?? "");
              const to = getLocation(ride?.toLocationId ?? "");

              return (
                <div
                  key={sub.id}
                  className="animate-slide-up rounded-xl border border-border/70 bg-card p-4 shadow-sm dark:border-white/15"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MapPin className="h-4 w-4 shrink-0 text-primary dark:text-accent" />
                      <span>{from?.name ?? "Unknown"}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span>{to?.name ?? "Unknown"}</span>
                    </div>
                    <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                      <RepeatIcon className="h-3 w-3" />
                      {DAY_NAMES[ride?.dayOfWeek ?? 0]}s
                    </Badge>
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground dark:text-foreground/75">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground">{driver?.name}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {ride?.departureTime} weekly
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary dark:fill-accent dark:text-accent" />
                      {driver?.rating.toFixed(1)} ({driver?.totalRides} rides)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Car className="h-3.5 w-3.5" />
                      {driver?.vehicle.make} {driver?.vehicle.model}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {missBadge(sub.missedCount)}
                      {sub.missedCount === 0 && (
                        <span className="text-xs text-muted-foreground dark:text-foreground/75">
                          Since {new Date(sub.subscribedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs text-foreground/80 hover:text-destructive"
                      onClick={() => handleUnsubscribe(sub.id, sub.recurringRideId)}
                    >
                      <BellOff className="h-3 w-3" />
                      Unsubscribe
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

      {/* ── One-time Booked Rides ───────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Ticket className="h-4 w-4 text-primary dark:text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/85">One-Time Bookings</h2>
          {bookedRides.length > 0 && (
            <Badge variant="secondary" className="text-xs">{bookedRides.length}</Badge>
          )}
        </div>

        {bookedRides.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-card p-6 text-center dark:border-white/15">
            <Ticket className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No one-time bookings</p>
            <p className="text-xs text-muted-foreground dark:text-foreground/75">Book a single ride from Find a Ride.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookedRides.map((ride, i) => {
              const driver = getDriver(ride.driverId);
              const from = getLocation(ride.fromLocationId);
              const to = getLocation(ride.toLocationId);
              const booking = bookings.get(ride.id);

              return (
                <div
                  key={ride.id}
                  className="animate-slide-up rounded-xl border border-border/70 bg-card p-4 shadow-sm dark:border-white/15"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MapPin className="h-4 w-4 shrink-0 text-primary dark:text-accent" />
                      <span>{from?.name ?? "Unknown"}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span>{to?.name ?? "Unknown"}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={booking?.status === "confirmed"
                        ? "border-primary bg-accent text-accent-foreground text-xs"
                        : "border-warning bg-warning-muted text-warning-foreground text-xs"}
                    >
                      {booking?.status === "confirmed" ? "Confirmed" : "Pending"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground dark:text-foreground/75">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground">{driver?.name}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {ride.departureTime} · {ride.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary dark:fill-accent dark:text-accent" />
                      {driver?.rating.toFixed(1)} ({driver?.totalRides} rides)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Car className="h-3.5 w-3.5" />
                      {driver?.vehicle.make} {driver?.vehicle.model}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <div className="border-t border-border" />

      {/* ── My Posted Rides (driver view) ───────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <RepeatIcon className="h-4 w-4 text-primary dark:text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/85">My Posted Rides</h2>
          {myPostedRides.length > 0 && (
            <Badge variant="secondary" className="text-xs">{myPostedRides.length}</Badge>
          )}
        </div>
        <p className="mb-3 text-xs text-muted-foreground dark:text-foreground/75">
          Recurring rides you drive. Mark no-shows — riders are auto-removed at 3.
        </p>

        {myPostedRides.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-card p-6 text-center dark:border-white/15">
            <RepeatIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No recurring rides posted</p>
            <p className="text-xs text-muted-foreground dark:text-foreground/75">Post a recurring ride to manage your riders here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myPostedRides.map((ride, i) => {
              const from = getLocation(ride.fromLocationId);
              const to = getLocation(ride.toLocationId);
              const subscribers = riderSubscriptions.filter(
                (s) => s.recurringRideId === ride.id && s.status === "active"
              );

              return (
                <div
                  key={ride.id}
                  className="animate-slide-up rounded-xl border border-border/70 bg-card p-4 shadow-sm dark:border-white/15"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MapPin className="h-4 w-4 shrink-0 text-primary dark:text-accent" />
                      <span>{from?.name ?? "Unknown"}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span>{to?.name ?? "Unknown"}</span>
                    </div>
                    <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                      <RepeatIcon className="h-3 w-3" />
                      {DAY_NAMES[ride.dayOfWeek]}s · {ride.departureTime}
                    </Badge>
                  </div>

                  <div className="mb-1 text-xs text-muted-foreground dark:text-foreground/75">
                    {ride.totalSeats - ride.availableSeats}/{ride.totalSeats} seats filled
                  </div>

                  {subscribers.length === 0 ? (
                    <p className="text-xs text-muted-foreground dark:text-foreground/75 italic">No subscribers yet.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {subscribers.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 dark:bg-muted/70"
                        >
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium text-foreground">{sub.riderName}</span>
                            {missBadge(sub.missedCount)}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 text-xs text-foreground/80 hover:text-destructive"
                            onClick={() => handleMarkNoShow(sub.id, sub.riderName ?? "Rider", sub.missedCount)}
                          >
                            <UserX className="h-3 w-3" />
                            No-show
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
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
