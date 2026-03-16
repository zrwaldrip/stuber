import { useState, useEffect } from "react";
import { BadgeCheck, MapPin, Car, Star, Shield, Award, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import profilePhoto from "@/assets/profile-photo.jpg";
import carExterior from "@/assets/car-exterior.jpg";
import carInterior from "@/assets/car-interior.jpg";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const parseCarMakeModel = (input: string) => {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { year: null as number | null, make: null as string | null, model: null as string | null };
  }

  let year: number | null = null;
  let startIndex = 0;

  const maybeYear = parseInt(parts[0], 10);
  if (!Number.isNaN(maybeYear) && parts[0].length === 4) {
    year = maybeYear;
    startIndex = 1;
  }

  let make: string | null = null;
  let model: string | null = null;

  if (parts.length - startIndex >= 1) {
    make = parts[startIndex];
  }
  if (parts.length - startIndex >= 2) {
    model = parts.slice(startIndex + 1).join(" ");
  }

  return { year, make, model };
};

const ProfileView = () => {
  const [firstName, setFirstName] = useState("Marcus");
  const [lastName, setLastName] = useState("Rivera");
  const [username, setUsername] = useState("marcusrivera");
  const [carMakeModel, setCarMakeModel] = useState("2024 Tesla Model 3");
  const [carPlate, setCarPlate] = useState("EV-04821");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [vehicleImageUrl, setVehicleImageUrl] = useState("");
  const [carId, setCarId] = useState<number | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState(firstName);
  const [editLastName, setEditLastName] = useState(lastName);
  const [editUsername, setEditUsername] = useState(username);
  const [editCarMakeModel, setEditCarMakeModel] = useState(carMakeModel);
  const [editCarPlate, setEditCarPlate] = useState(carPlate);
  const [editProfileImageUrl, setEditProfileImageUrl] = useState(profileImageUrl);
  const [editVehicleImageUrl, setEditVehicleImageUrl] = useState(vehicleImageUrl);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const userId = 1; // Default user ID - in a real app, this would come from auth context

  useEffect(() => {
    // Fetch user data on mount
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}`);
        if (response.ok) {
          const user = await response.json();
          if (user.first_name) setFirstName(user.first_name);
          if (user.last_name) setLastName(user.last_name);
          if (user.username) setUsername(user.username);
          if (user.profile_photo_url) setProfileImageUrl(user.profile_photo_url);
          if (user.car_id) {
            setCarId(user.car_id);
            // Fetch car data
            const carResponse = await fetch(`${API_BASE_URL}/api/cars/${user.car_id}`);
            if (carResponse.ok) {
              const car = await carResponse.json();
              if (car.make && car.model) {
                setCarMakeModel(`${car.year || ''} ${car.make} ${car.model}`.trim());
              }
              if (car.license_plate) setCarPlate(car.license_plate);
              if (car.car_photo_url) setVehicleImageUrl(car.car_photo_url);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, [userId]);

  const handleOpenEdit = () => {
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setEditUsername(username);
    setEditCarMakeModel(carMakeModel);
    setEditCarPlate(carPlate);
    setEditProfileImageUrl(profileImageUrl);
    setEditVehicleImageUrl(vehicleImageUrl);
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    if (!editUsername.trim()) {
      toast({
        title: "Error",
        description: "Username cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Update user details in the database (including username)
      const userResponse = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: editFirstName.trim() || null,
          lastName: editLastName.trim() || null,
          username: editUsername.trim() || null,
        }),
      });

      // Update profile photo
      const profilePhotoResponse = await fetch(`${API_BASE_URL}/api/users/${userId}/profile-photo`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoUrl: editProfileImageUrl.trim() || null }),
      });

      // Update car details and photo if car exists
      let carPhotoSuccess = true;
      let carDetailsSuccess = true;
      if (carId) {
        const { year, make, model } = parseCarMakeModel(editCarMakeModel);
        const carDetailsResponse = await fetch(`${API_BASE_URL}/api/cars/${carId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            year,
            make,
            model,
            licensePlate: editCarPlate.trim() || null,
          }),
        });
        carDetailsSuccess = carDetailsResponse.ok;

        const carPhotoResponse = await fetch(`${API_BASE_URL}/api/cars/${carId}/photo`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ photoUrl: editVehicleImageUrl.trim() || null }),
        });
        carPhotoSuccess = carPhotoResponse.ok;
      }

      if (userResponse.ok && profilePhotoResponse.ok && carPhotoSuccess && carDetailsSuccess) {
        setUsername(editUsername.trim());
        setFirstName(editFirstName.trim());
        setLastName(editLastName.trim());
        setCarMakeModel(editCarMakeModel.trim());
        setCarPlate(editCarPlate.trim());
        setProfileImageUrl(editProfileImageUrl.trim());
        setVehicleImageUrl(editVehicleImageUrl.trim());
        setIsEditOpen(false);
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update profile",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-lg animate-fade-in px-4 py-6 pb-24">
        {/* Profile header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-3">
            <img
              src={profileImageUrl || profilePhoto}
              alt={`${firstName} ${lastName}`}
              className="h-24 w-24 rounded-full border-2 border-primary object-cover shadow-md"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-help items-center justify-center rounded-full bg-primary shadow-sm">
                  <BadgeCheck className="h-4 w-4 text-primary-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px] text-xs">
                <p className="font-semibold">Verified BYU Student</p>
                <p className="text-muted-foreground">Student status and vehicle info have been verified by STÜBER.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <h2 className="text-xl font-semibold text-foreground">{firstName} {lastName}</h2>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">@{username}</p>
          </div>
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className={`h-4 w-4 ${i <= 4 ? "fill-primary text-primary" : "fill-muted text-muted"}`} />
          ))}
          <span className="ml-1 text-sm font-semibold text-foreground">4.9</span>
        </div>
      </div>

        {/* Stats cards */}
        <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-4 shadow-sm">
          <Route className="mb-1 h-5 w-5 text-primary" />
          <span className="text-2xl font-bold text-foreground">128</span>
          <span className="text-xs text-muted-foreground">Total Rides</span>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-4 shadow-sm">
          <Award className="mb-1 h-5 w-5 text-primary" />
          <span className="text-2xl font-bold text-foreground">4.9</span>
          <span className="text-xs text-muted-foreground">Avg. Rating</span>
        </div>
      </div>

        {/* Actions */}
        <div className="mb-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 text-sm"
            onClick={handleOpenEdit}
          >
            Edit Profile
          </Button>
          <Button variant="outline" className="flex-1 text-sm">Share Profile</Button>
        </div>

        {/* Info cards */}
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</h3>
        <div className="mb-6 space-y-2">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5">
          <Shield className="h-4 w-4 text-primary" />
          <div>
            <span className="text-sm font-medium text-foreground">Verified Student</span>
            <p className="text-xs text-muted-foreground">BYU · Computer Science</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">Heritage Halls, Provo, UT</span>
        </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5">
            <Car className="h-4 w-4 text-muted-foreground" />
            <div>
              <span className="text-sm font-medium text-foreground">{carMakeModel}</span>
              <p className="text-xs text-muted-foreground">
                Midnight Black · <span className="font-mono">{carPlate}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Photo gallery */}
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vehicle Gallery</h3>
        <div className="grid grid-cols-2 gap-3">
          <img
            src={vehicleImageUrl || carExterior}
            alt="Car exterior"
            className="aspect-[4/3] w-full rounded-lg object-cover shadow-sm"
          />
          <img
            src={carInterior}
            alt="Car interior"
            className="aspect-[4/3] w-full rounded-lg object-cover shadow-sm"
          />
        </div>
      </div>
      <Dialog open={isEditOpen} onOpenChange={(open) => !loading && setIsEditOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your personal and vehicle information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Profile picture (URL-based) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Profile picture</label>
              <div className="flex items-center gap-3">
                <img
                  src={editProfileImageUrl || profileImageUrl || profilePhoto}
                  alt="Profile preview"
                  className="h-14 w-14 rounded-full object-cover border border-border"
                />
                <div className="flex-1 space-y-1">
                  <Input
                    value={editProfileImageUrl}
                    onChange={(e) => setEditProfileImageUrl(e.target.value)}
                    placeholder="https://example.com/profile.jpg"
                    disabled={loading}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Enter a public image URL for your profile photo.
                  </p>
                </div>
              </div>
            </div>

            {/* Name + username */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">First name</label>
                <Input
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="First name"
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Last name</label>
                <Input
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="Last name"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Username</label>
              <Input
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="Username"
                disabled={loading}
              />
            </div>

            {/* Vehicle info */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Car make &amp; model</label>
              <Input
                value={editCarMakeModel}
                onChange={(e) => setEditCarMakeModel(e.target.value)}
                placeholder="e.g. 2024 Tesla Model 3"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">License plate</label>
              <Input
                value={editCarPlate}
                onChange={(e) => setEditCarPlate(e.target.value)}
                placeholder="e.g. EV-04821"
                disabled={loading}
              />
            </div>

            {/* Vehicle image (URL-based) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Vehicle photo</label>
              <div className="flex items-center gap-3">
                <img
                  src={editVehicleImageUrl || vehicleImageUrl || carExterior}
                  alt="Vehicle preview"
                  className="h-16 w-24 rounded-md object-cover border border-border"
                />
                <div className="flex-1 space-y-1">
                  <Input
                    value={editVehicleImageUrl}
                    onChange={(e) => setEditVehicleImageUrl(e.target.value)}
                    placeholder="https://example.com/vehicle.jpg"
                    disabled={loading}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Enter a public image URL for your vehicle photo.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => !loading && setIsEditOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfileView;
