import { useState, useEffect } from "react";
import { BadgeCheck, Car, Star, Shield, Award, Route, Mail, Phone } from "lucide-react";
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

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function uploadUrlFromValue(value: string) {
  const v = value.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `${API_BASE_URL}/uploads/${encodeURIComponent(v)}`;
}

function initialsFromName(first: string, last: string) {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  const s = `${a}${b}`.toUpperCase();
  return s || "?";
}

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

const ProfileView = ({ userId }: { userId: number }) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [carMakeModel, setCarMakeModel] = useState("");
  const [carPlate, setCarPlate] = useState("");
  const [carColor, setCarColor] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [vehicleImageUrl, setVehicleImageUrl] = useState("");
  const [carId, setCarId] = useState<number | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState(firstName);
  const [editLastName, setEditLastName] = useState(lastName);
  const [editUsername, setEditUsername] = useState(username);
  const [editCarMakeModel, setEditCarMakeModel] = useState(carMakeModel);
  const [editCarPlate, setEditCarPlate] = useState(carPlate);
  const [editProfileImageFile, setEditProfileImageFile] = useState<File | null>(null);
  const [editVehicleImageFile, setEditVehicleImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  useEffect(() => {
    const fetchUser = async () => {
      setProfileLoaded(false);
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}`);
        if (response.ok) {
          const user = await response.json();
          setFirstName(typeof user.first_name === "string" ? user.first_name : "");
          setLastName(typeof user.last_name === "string" ? user.last_name : "");
          setUsername(typeof user.username === "string" ? user.username : "");
          setEmail(typeof user.email === "string" ? user.email : "");
          setPhone(typeof user.phone === "string" ? user.phone : "");
          setProfileImageUrl(typeof user.profile_photo_path === "string" ? user.profile_photo_path : "");

          if (user.car_id) {
            setCarId(user.car_id);
            const carResponse = await fetch(`${API_BASE_URL}/api/cars/${user.car_id}`);
            if (carResponse.ok) {
              const car = await carResponse.json();
              if (car.make && car.model) {
                setCarMakeModel(`${car.year ?? ""} ${car.make} ${car.model}`.trim());
              } else {
                setCarMakeModel("");
              }
              setCarPlate(typeof car.license_plate === "string" ? car.license_plate : "");
              setCarColor(typeof car.color === "string" ? car.color : "");
              setVehicleImageUrl(typeof car.car_photo_path === "string" ? car.car_photo_path : "");
            }
          } else {
            setCarId(null);
            setCarMakeModel("");
            setCarPlate("");
            setCarColor("");
            setVehicleImageUrl("");
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setProfileLoaded(true);
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
    setEditProfileImageFile(null);
    setEditVehicleImageFile(null);
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

      // Upload profile photo if selected
      let profilePhotoSuccess = true;
      let newProfileFilename = profileImageUrl;
      if (editProfileImageFile) {
        const form = new FormData();
        form.append("file", editProfileImageFile);
        const resp = await fetch(`${API_BASE_URL}/api/users/${userId}/profile-photo`, {
          method: "POST",
          body: form,
        });
        profilePhotoSuccess = resp.ok;
        if (resp.ok) {
          const json = await resp.json().catch(() => null);
          if (json && typeof json.filename === "string") newProfileFilename = json.filename;
        }
      }

      // Update car details and photo if car exists
      let carPhotoSuccess = true;
      let carDetailsSuccess = true;
      let newVehicleFilename = vehicleImageUrl;
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

        if (editVehicleImageFile) {
          const form = new FormData();
          form.append("file", editVehicleImageFile);
          const carPhotoResponse = await fetch(`${API_BASE_URL}/api/cars/${carId}/photo`, {
            method: "POST",
            body: form,
          });
          carPhotoSuccess = carPhotoResponse.ok;
          if (carPhotoResponse.ok) {
            const json = await carPhotoResponse.json().catch(() => null);
            if (json && typeof json.filename === "string") newVehicleFilename = json.filename;
          }
        }
      }

      if (userResponse.ok && profilePhotoSuccess && carPhotoSuccess && carDetailsSuccess) {
        const updated = await userResponse.json().catch(() => null);
        if (updated && typeof updated.email === "string") setEmail(updated.email);
        if (updated && typeof updated.phone === "string") setPhone(updated.phone);
        setUsername(editUsername.trim());
        setFirstName(editFirstName.trim());
        setLastName(editLastName.trim());
        setCarMakeModel(editCarMakeModel.trim());
        setCarPlate(editCarPlate.trim());
        setProfileImageUrl(newProfileFilename);
        setVehicleImageUrl(newVehicleFilename);
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
            {profileImageUrl ? (
              <img
                src={uploadUrlFromValue(profileImageUrl)}
                alt={`${firstName} ${lastName}`.trim() || "Profile"}
                className="h-24 w-24 rounded-full border-2 border-primary object-cover shadow-md"
              />
            ) : (
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary bg-muted text-lg font-semibold text-foreground shadow-md"
                aria-hidden
              >
                {profileLoaded ? initialsFromName(firstName, lastName) : "…"}
              </div>
            )}
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
          <h2 className="text-xl font-semibold text-foreground">
            {profileLoaded ? `${firstName} ${lastName}`.trim() || "—" : "…"}
          </h2>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {profileLoaded ? (username ? `@${username}` : "—") : "…"}
            </p>
          </div>
          <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-4 w-4" />
            <span>No ratings yet</span>
          </div>
        </div>

        {/* Stats cards — only real counts when the API provides them; until then show zeros / empty */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center rounded-xl border border-border bg-card p-4 shadow-sm">
            <Route className="mb-1 h-5 w-5 text-primary" />
            <span className="text-2xl font-bold text-foreground">0</span>
            <span className="text-xs text-muted-foreground">Total Rides</span>
          </div>
          <div className="flex flex-col items-center rounded-xl border border-border bg-card p-4 shadow-sm">
            <Award className="mb-1 h-5 w-5 text-primary" />
            <span className="text-2xl font-bold text-foreground">—</span>
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

        {/* Info cards — data from the API only (no demo major, location, or stock photos) */}
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</h3>
        <div className="mb-6 space-y-2">
          {email ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="break-all text-sm text-foreground">{email}</span>
            </div>
          ) : null}
          {phone.trim() ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm text-foreground">{phone}</span>
            </div>
          ) : null}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5">
            <Shield className="h-4 w-4 shrink-0 text-primary" />
            <div>
              <span className="text-sm font-medium text-foreground">Verified Student</span>
              <p className="text-xs text-muted-foreground">BYU account</p>
            </div>
          </div>
          {carId ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5">
              <Car className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <span className="text-sm font-medium text-foreground">
                  {carMakeModel.trim() || "Vehicle on file"}
                </span>
                {(carColor || carPlate) ? (
                  <p className="text-xs text-muted-foreground">
                    {carColor ? <>{carColor}</> : null}
                    {carColor && carPlate ? " · " : null}
                    {carPlate ? <span className="font-mono">{carPlate}</span> : null}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-card/50 p-3.5">
              <Car className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">No vehicle added yet</span>
            </div>
          )}
        </div>

        {carId && vehicleImageUrl ? (
          <>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vehicle</h3>
            <div className="mb-6">
              <img
                src={uploadUrlFromValue(vehicleImageUrl)}
                alt="Vehicle"
                className="aspect-[4/3] w-full max-w-md rounded-lg object-cover shadow-sm"
              />
            </div>
          </>
        ) : carId ? (
          <>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vehicle</h3>
            <p className="mb-6 text-sm text-muted-foreground">No vehicle photo yet — add a URL in Edit Profile.</p>
          </>
        ) : null}
      </div>
      <Dialog open={isEditOpen} onOpenChange={(open) => !loading && setIsEditOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your personal and vehicle information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Profile picture upload */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Profile picture</label>
              <Input
                type="file"
                accept="image/*"
                disabled={loading}
                onChange={(e) => setEditProfileImageFile(e.target.files?.[0] ?? null)}
              />
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

            {/* Vehicle image upload */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Vehicle photo</label>
              <Input
                type="file"
                accept="image/*"
                disabled={loading}
                onChange={(e) => setEditVehicleImageFile(e.target.files?.[0] ?? null)}
              />
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
