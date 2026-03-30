import { Car } from "lucide-react";

const Logo = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
      <Car className="h-5 w-5 text-secondary-foreground" />
    </div>
    <span className="text-xl font-semibold tracking-tight text-foreground">Blue Ride</span>
  </div>
);

export default Logo;
