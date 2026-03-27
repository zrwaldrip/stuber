import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Loader2, Minus, Plus, CalendarIcon, RepeatIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useAppState } from "@/store/AppContext";

interface PostRideViewProps {
  userId: number;
  onComplete: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const WEEKDAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

const PostRideView = ({ userId, onComplete }: PostRideViewProps) => {
  const { refreshLiveRideCount } = useAppState();
  type LocationRow = { location_id: number; name: string; location_type?: string | null };
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const [fromLocationId, setFromLocationId] = useState<number | null>(null);
  const [toLocationId, setToLocationId] = useState<number | null>(null);
  const [fromLocationText, setFromLocationText] = useState("");
  const [toLocationText, setToLocationText] = useState("");
  const [fromPlaceholderExample, setFromPlaceholderExample] = useState<string>("");
  const [toPlaceholderExample, setToPlaceholderExample] = useState<string>("");
  const fromTouchedRef = useRef(false);
  const toTouchedRef = useRef(false);

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [seats, setSeats] = useState(3);
  const [loading, setLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const fromLocName = useMemo(() => {
    if (!fromLocationId) return fromPlaceholderExample;
    return locations.find((l) => l.location_id === fromLocationId)?.name ?? fromPlaceholderExample;
  }, [locations, fromLocationId, fromPlaceholderExample]);
  const toLocName = useMemo(() => {
    if (!toLocationId) return toPlaceholderExample;
    return locations.find((l) => l.location_id === toLocationId)?.name ?? toPlaceholderExample;
  }, [locations, toLocationId, toPlaceholderExample]);

  useEffect(() => {
    const fetchLocations = async () => {
      setLoadingLocations(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/locations`);
        if (!response.ok) throw new Error("Failed to load locations");
        const data = await response.json();
        setLocations(Array.isArray(data) ? data : []);

        // Leave inputs empty; only provide examples via placeholder.
        if (Array.isArray(data) && data.length > 0) {
          setFromPlaceholderExample(data[0]?.name ?? "");
          setToPlaceholderExample(data[1]?.name ?? "");
        } else {
          setFromPlaceholderExample("");
          setToPlaceholderExample("");
        }
        // Don't overwrite the user's current typing/selection if they already interacted.
        if (!fromTouchedRef.current) {
          setFromLocationId(null);
          setFromLocationText("");
        }
        if (!toTouchedRef.current) {
          setToLocationId(null);
          setToLocationText("");
        }
      } catch (error) {
        console.error("Error loading locations:", error);
        toast.error("Failed to load locations");
      } finally {
        setLoadingLocations(false);
      }
    };

    fetchLocations();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRecurring && selectedDays.length === 0) {
      toast.error("Select at least one day", { description: "Choose which days this ride repeats." });
      return;
    }
    if (isRecurring) {
      toast.error("Recurring rides are not database-backed yet", {
        description: "Turn off recurring and post a one-time ride for now.",
      });
      return;
    }

    setLoading(true);
    try {
      if (!fromLocationId || !toLocationId) {
        toast.error("Select both departure and destination");
        return;
      }
      if (fromLocationId === toLocationId) {
        toast.error("Departure and destination must be different");
        return;
      }

      const rideDate = date ?? new Date();
      const [h, m] = time.split(":").map((n) => parseInt(n, 10));
      const departureDateTime = new Date(rideDate);
      departureDateTime.setHours(Number.isNaN(h) ? 0 : h, Number.isNaN(m) ? 0 : m, 0, 0);

      const response = await fetch(`${API_BASE_URL}/api/rides`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          fromLocationId,
          toLocationId,
          departureTime: departureDateTime.toISOString(),
          availableSeats: seats,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to post ride" }));
        throw new Error(error.error || "Failed to post ride");
      }

      await refreshLiveRideCount();
      toast.success("Ride posted successfully!", { description: `${fromLocName} → ${toLocName}` });
      onComplete();
    } catch (error) {
      console.error("Error posting ride:", error);
      toast.error("Failed to post ride", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg animate-fade-in px-4 py-6 pb-24">
      <h1 className="mb-1 text-2xl font-semibold text-foreground">Post a Ride</h1>
      <p className="mb-6 text-sm text-muted-foreground">Share your route with fellow BYU students</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Departure */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Departure Location</Label>
          <datalist id="from_locations_datalist">
            {locations.map((l) => (
              <option key={l.location_id} value={l.name} />
            ))}
          </datalist>
          <Input
            value={fromLocationText}
            onChange={(e) => {
              const next = e.target.value;
                fromTouchedRef.current = true;
              setFromLocationText(next);
              const trimmed = next.trim().toLowerCase();
              const exact = locations.find((l) => l.name.toLowerCase() === trimmed);
              setFromLocationId(exact?.location_id ?? null);
            }}
            onBlur={() => {
              const trimmed = fromLocationText.trim().toLowerCase();
              const exact = locations.find((l) => l.name.toLowerCase() === trimmed);
              setFromLocationId(exact?.location_id ?? null);
            }}
            placeholder={loadingLocations ? "Loading..." : (fromPlaceholderExample ? `e.g. ${fromPlaceholderExample}` : "Type a departure location")}
            disabled={loading || loadingLocations}
            list="from_locations_datalist"
          />
        </div>

        {/* Destination */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Destination</Label>
          <datalist id="to_locations_datalist">
            {locations.map((l) => (
              <option key={l.location_id} value={l.name} />
            ))}
          </datalist>
          <Input
            value={toLocationText}
            onChange={(e) => {
              const next = e.target.value;
                toTouchedRef.current = true;
              setToLocationText(next);
              const trimmed = next.trim().toLowerCase();
              const exact = locations.find((l) => l.name.toLowerCase() === trimmed);
              setToLocationId(exact?.location_id ?? null);
            }}
            onBlur={() => {
              const trimmed = toLocationText.trim().toLowerCase();
              const exact = locations.find((l) => l.name.toLowerCase() === trimmed);
              setToLocationId(exact?.location_id ?? null);
            }}
            placeholder={loadingLocations ? "Loading..." : (toPlaceholderExample ? `e.g. ${toPlaceholderExample}` : "Type a destination location")}
            disabled={loading || loadingLocations}
            list="to_locations_datalist"
          />
        </div>

        {/* Recurring toggle */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2.5">
            <RepeatIcon className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Recurring Ride</p>
              <p className="text-xs text-muted-foreground">Repeats weekly — riders can subscribe</p>
            </div>
          </div>
          <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
        </div>

        {/* Day picker (recurring only) */}
        {isRecurring ? (
          <div className="space-y-2 animate-fade-in">
            <Label className="text-sm font-medium text-foreground">Repeats on</Label>
            <div className="flex gap-1.5">
              {WEEKDAYS.map((day) => {
                const active = selectedDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      "flex-1 rounded-lg border py-2 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Date picker (one-time only) */
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "MMM d, yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Time */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Departure Time</Label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        {/* Seats counter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Available Seats</Label>
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => setSeats((s) => Math.max(1, s - 1))}
              disabled={seats <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex-1 text-center">
              <span className="text-3xl font-semibold text-foreground">{seats}</span>
              <p className="text-xs text-muted-foreground">seat{seats > 1 ? "s" : ""} available</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => setSeats((s) => Math.min(6, s + 1))}
              disabled={seats >= 6}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onComplete}>
            Cancel
          </Button>
          <Button type="submit" className="flex-[2]" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? "Posting…" : isRecurring ? "Post Recurring Ride" : "Post Ride"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PostRideView;
