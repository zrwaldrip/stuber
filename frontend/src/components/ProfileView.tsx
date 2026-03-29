import { useState, useEffect, useRef } from "react";
import { BadgeCheck, Car, Star, Shield, Award, Route, Mail, Phone, LogOut } from "lucide-react";
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
import type { View } from "@/components/AppHeader";
import { mailtoHref, smsHref, telHref } from "@/lib/contactLinks";

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

function formatVehicleTitle(year: number | null, make: string, model: string) {
  const parts = [year != null ? String(year) : "", make.trim(), model.trim()].filter(Boolean);
  return parts.join(" ");
}

interface ProfileViewProps {
  userId: number;
  onLogout: () => void;
  onNavigate: (view: View) => void;
}

const ProfileView = ({ userId, onLogout, onNavigate }: ProfileViewProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [carYear, setCarYear] = useState<number | null>(null);
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carPlate, setCarPlate] = useState("");
  const [carColor, setCarColor] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [vehicleImageUrl, setVehicleImageUrl] = useState("");
  const [carId, setCarId] = useState<number | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [userLevel, setUserLevel] = useState<string>("user");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState(firstName);
  const [editLastName, setEditLastName] = useState(lastName);
  const [editUsername, setEditUsername] = useState(username);
  const [editCarYear, setEditCarYear] = useState("");
  const [editCarMake, setEditCarMake] = useState("");
  const [editCarModel, setEditCarModel] = useState("");
  const [editCarPlate, setEditCarPlate] = useState(carPlate);
  const [editProfileImageFile, setEditProfileImageFile] = useState<File | null>(null);
  const [editVehicleImageFile, setEditVehicleImageFile] = useState<File | null>(null);
  const [focusVehicleFieldsOnOpen, setFocusVehicleFieldsOnOpen] = useState(false);
  const editCarYearInputRef = useRef<HTMLInputElement>(null);
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
          setUserLevel(typeof user.user_level === "string" ? user.user_level : "user");
          setProfileImageUrl(typeof user.profile_photo_path === "string" ? user.profile_photo_path : "");

          try {
            const raw = localStorage.getItem("blueride.user");
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.user_id === userId) {
                localStorage.setItem(
                  "blueride.user",
                  JSON.stringify({
                    ...parsed,
                    user_level: user.user_level ?? "user",
                  })
                );
              }
            }
          } catch {
            /* ignore */
          }

          if (user.car_id) {
            setCarId(user.car_id);
            const carResponse = await fetch(`${API_BASE_URL}/api/cars/${user.car_id}`);
            if (carResponse.ok) {
              const car = await carResponse.json();
              setCarYear(typeof car.year === "number" && !Number.isNaN(car.year) ? car.year : null);
              setCarMake(typeof car.make === "string" ? car.make : "");
              setCarModel(typeof car.model === "string" ? car.model : "");
              setCarPlate(typeof car.license_plate === "string" ? car.license_plate : "");
              setCarColor(typeof car.color === "string" ? car.color : "");
              setVehicleImageUrl(typeof car.car_photo_path === "string" ? car.car_photo_path : "");
            }
          } else {
            setCarId(null);
            setCarYear(null);
            setCarMake("");
            setCarModel("");
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

  const syncEditFieldsFromProfile = () => {
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setEditUsername(username);
    setEditCarYear(carYear != null ? String(carYear) : "");
    setEditCarMake(carMake);
    setEditCarModel(carModel);
    setEditCarPlate(carPlate);
    setEditProfileImageFile(null);
    setEditVehicleImageFile(null);
  };

  const handleOpenEdit = () => {
    setFocusVehicleFieldsOnOpen(false);
    syncEditFieldsFromProfile();
    setIsEditOpen(true);
  };

  const handleOpenAddVehicle = () => {
    setFocusVehicleFieldsOnOpen(true);
    syncEditFieldsFromProfile();
    setIsEditOpen(true);
  };

  const parseYearInput = (raw: string): number | null => {
    const t = raw.trim();
    if (!t) return null;
    const y = parseInt(t, 10);
    if (Number.isNaN(y) || t.length !== 4) return null;
    return y;
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
          "X-Acting-User-Id": String(userId),
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

      // Create or update car; then optional vehicle photo upload
      let carPhotoSuccess = true;
      let carDetailsSuccess = true;
      let newVehicleFilename = vehicleImageUrl;
      let effectiveCarId = carId;

      const yearParsed = parseYearInput(editCarYear);
      const makeTrim = editCarMake.trim();
      const modelTrim = editCarModel.trim();
      const plateTrim = editCarPlate.trim();

      const wantsVehicle =
        !carId &&
        (yearParsed != null ||
          makeTrim.length > 0 ||
          modelTrim.length > 0 ||
          plateTrim.length > 0);

      if (!carId && wantsVehicle && (!makeTrim || !modelTrim)) {
        toast({
          title: "Error",
          description: "Make and model are required to add a vehicle.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!carId && makeTrim && modelTrim) {
        const createResp = await fetch(`${API_BASE_URL}/api/users/${userId}/car`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            year: yearParsed,
            make: makeTrim,
            model: modelTrim,
            licensePlate: plateTrim || null,
          }),
        });
        carDetailsSuccess = createResp.ok;
        if (createResp.ok) {
          const created = await createResp.json().catch(() => null);
          if (created && typeof created.car_id === "number") {
            effectiveCarId = created.car_id;
            setCarId(created.car_id);
          }
        }
      } else if (carId) {
        const carDetailsResponse = await fetch(`${API_BASE_URL}/api/cars/${carId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            year: yearParsed,
            make: makeTrim || null,
            model: modelTrim || null,
            licensePlate: plateTrim || null,
          }),
        });
        carDetailsSuccess = carDetailsResponse.ok;
      }

      if (effectiveCarId && editVehicleImageFile) {
        const form = new FormData();
        form.append("file", editVehicleImageFile);
        const carPhotoResponse = await fetch(`${API_BASE_URL}/api/cars/${effectiveCarId}/photo`, {
          method: "POST",
          body: form,
        });
        carPhotoSuccess = carPhotoResponse.ok;
        if (carPhotoResponse.ok) {
          const json = await carPhotoResponse.json().catch(() => null);
          if (json && typeof json.filename === "string") newVehicleFilename = json.filename;
        }
      }

      if (userResponse.ok && profilePhotoSuccess && carPhotoSuccess && carDetailsSuccess) {
        const updated = await userResponse.json().catch(() => null);
        if (updated && typeof updated.email === "string") setEmail(updated.email);
        if (updated && typeof updated.phone === "string") setPhone(updated.phone);
        if (updated && typeof updated.user_level === "string") {
          setUserLevel(updated.user_level);
          try {
            const raw = localStorage.getItem("blueride.user");
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.user_id === userId) {
                localStorage.setItem(
                  "blueride.user",
                  JSON.stringify({ ...parsed, user_level: updated.user_level })
                );
              }
            }
          } catch {
            /* ignore */
          }
        }
        setUsername(editUsername.trim());
        setFirstName(editFirstName.trim());
        setLastName(editLastName.trim());
        setCarYear(yearParsed);
        setCarMake(makeTrim);
        setCarModel(modelTrim);
        setCarPlate(plateTrim);
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
                <p className="text-muted-foreground">Student status and vehicle info have been verified by Blue Ride.</p>
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
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 text-sm"
              onClick={handleOpenEdit}
            >
              Edit Profile
            </Button>
            <Button variant="outline" className="flex-1 text-sm">Share Profile</Button>
          </div>
          {userLevel === "admin" ? (
            <Button
              variant="secondary"
              className="w-full text-sm"
              onClick={() => onNavigate("admin")}
            >
              Admin — manage users
            </Button>
          ) : null}
        </div>
        <div className="mb-6">
          <Button variant="destructive" className="w-full gap-2 text-sm" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Info cards — data from the API only (no demo major, location, or stock photos) */}
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</h3>
        <div className="mb-6 space-y-2">
          {email ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <a
                href={mailtoHref(email)}
                className="break-all text-sm text-primary underline-offset-2 hover:underline"
              >
                {email}
              </a>
            </div>
          ) : null}
          {phone.trim() ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border bg-card p-3.5">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <a
                  href={telHref(phone)}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {phone}
                </a>
                {smsHref(phone) ? (
                  <a
                    href={smsHref(phone)}
                    className="shrink-0 text-primary underline-offset-2 hover:underline"
                  >
                    Text
                  </a>
                ) : null}
              </div>
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
                  {formatVehicleTitle(carYear, carMake, carModel).trim() || "Vehicle on file"}
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
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-card/50 p-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <Car className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">No vehicle added yet</span>
              </div>
              <Button type="button" size="sm" variant="secondary" className="shrink-0" onClick={handleOpenAddVehicle}>
                Add vehicle
              </Button>
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
            <p className="mb-6 text-sm text-muted-foreground">No vehicle photo yet — add one in Edit Profile.</p>
          </>
        ) : null}
      </div>
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          if (loading) return;
          if (!open) setFocusVehicleFieldsOnOpen(false);
          setIsEditOpen(open);
        }}
      >
        <DialogContent
          onOpenAutoFocus={(e) => {
            if (focusVehicleFieldsOnOpen) {
              e.preventDefault();
              queueMicrotask(() => editCarYearInputRef.current?.focus());
            }
          }}
        >
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
              <label className="text-xs font-medium text-foreground">Year</label>
              <Input
                ref={editCarYearInputRef}
                inputMode="numeric"
                value={editCarYear}
                onChange={(e) => setEditCarYear(e.target.value)}
                placeholder="e.g. 2024"
                maxLength={4}
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Make</label>
                <Input
                  value={editCarMake}
                  onChange={(e) => setEditCarMake(e.target.value)}
                  placeholder="e.g. Tesla"
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Model</label>
                <Input
                  value={editCarModel}
                  onChange={(e) => setEditCarModel(e.target.value)}
                  placeholder="e.g. Model 3"
                  disabled={loading}
                />
              </div>
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
              onClick={() => {
                if (loading) return;
                setFocusVehicleFieldsOnOpen(false);
                setIsEditOpen(false);
              }}
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
