import { useState, useMemo } from "react";
import { Clock, Loader2, Minus, Plus, CalendarIcon, Sparkles, RepeatIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAppState, LOCATIONS, DAY_NAMES } from "@/store/AppContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

interface PostRideViewProps {
  onComplete: () => void;
}

const POPULAR_LOCATIONS = [
  "Tanner Building",
  "Campus Plaza",
  "Marriott Center",
  "Wilkinson Center",
  "Heritage Halls",
  "The Village",
];

const WEEKDAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

const PostRideView = ({ onComplete }: PostRideViewProps) => {
  const { addRide, addRecurringRide } = useAppState();
  const [departure, setDeparture] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [seats, setSeats] = useState(3);
  const [loading, setLoading] = useState(false);
  const [depFocused, setDepFocused] = useState(false);
  const [destFocused, setDestFocused] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const depSuggestions = useMemo(() => {
    if (!depFocused || departure.length === 0) return POPULAR_LOCATIONS.slice(0, 4);
    const q = departure.toLowerCase();
    return LOCATIONS.filter((l) => l.name.toLowerCase().includes(q)).map((l) => l.name).slice(0, 4);
  }, [departure, depFocused]);

  const destSuggestions = useMemo(() => {
    if (!destFocused || destination.length === 0) return POPULAR_LOCATIONS.filter((l) => l !== departure).slice(0, 4);
    const q = destination.toLowerCase();
    return LOCATIONS.filter((l) => l.name.toLowerCase().includes(q)).map((l) => l.name).slice(0, 4);
  }, [destination, destFocused, departure]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRecurring && selectedDays.length === 0) {
      toast.error("Select at least one day", { description: "Choose which days this ride repeats." });
      return;
    }

    setLoading(true);
    const fromLoc = LOCATIONS.find((l) => l.name.toLowerCase() === departure.toLowerCase());
    const toLoc = LOCATIONS.find((l) => l.name.toLowerCase() === destination.toLowerCase());
    const formattedTime = format(new Date(`2026-01-01T${time}`), "h:mm a");

    setTimeout(() => {
      if (isRecurring) {
        selectedDays.sort().forEach((day) => {
          addRecurringRide({
            driverId: "d-3",
            fromLocationId: fromLoc?.id ?? "loc-5",
            toLocationId: toLoc?.id ?? "loc-6",
            departureTime: formattedTime,
            dayOfWeek: day,
            totalSeats: seats,
            availableSeats: seats,
          });
        });
        const dayLabels = selectedDays.sort().map((d) => DAY_NAMES[d]).join(", ");
        toast.success("Recurring ride posted!", {
          description: `${departure} → ${destination} every ${dayLabels} at ${formattedTime}`,
        });
      } else {
        addRide({
          driverId: "d-3",
          fromLocationId: fromLoc?.id ?? "loc-5",
          toLocationId: toLoc?.id ?? "loc-6",
          departureTime: formattedTime,
          date: date ? format(date, "yyyy-MM-dd") : "2026-02-10",
          totalSeats: seats,
          availableSeats: seats,
        });
        toast.success("Ride posted successfully!", { description: `${departure} → ${destination}` });
      }
      setLoading(false);
      onComplete();
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-lg animate-fade-in px-4 py-6 pb-24">
      <h1 className="mb-1 text-2xl font-semibold text-foreground">Post a Ride</h1>
      <p className="mb-6 text-sm text-muted-foreground">Share your route with fellow BYU students</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Departure */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Departure Location</Label>
          <Input
            placeholder="Where are you leaving from?"
            value={departure}
            onChange={(e) => setDeparture(e.target.value)}
            onFocus={() => setDepFocused(true)}
            onBlur={() => setTimeout(() => setDepFocused(false), 200)}
            required
          />
          {depFocused && (
            <div className="flex flex-wrap gap-1.5 animate-fade-in">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              {depSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setDeparture(s); setDepFocused(false); }}
                  className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Destination */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Destination</Label>
          <Input
            placeholder="Where are you heading?"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onFocus={() => setDestFocused(true)}
            onBlur={() => setTimeout(() => setDestFocused(false), 200)}
            required
          />
          {destFocused && (
            <div className="flex flex-wrap gap-1.5 animate-fade-in">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              {destSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setDestination(s); setDestFocused(false); }}
                  className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
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
