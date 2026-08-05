"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { PageHeader } from "../../components/page-header";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { PageSkeleton } from "../../components/ui/skeleton";
import { useSettings, useUpdateSettings } from "../../hooks/use-settings";
import { supabase } from "../../lib/supabase";
import { useUser } from "../../hooks/use-user";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

const settingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  logoUrl: z.string().optional().or(z.literal("")),
  signatureUrl: z.string().optional().or(z.literal("")),
});
type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: settings, isLoading: isSettingsLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  // Own Password Form State (Admin Only)
  const [ownPasswordForm, setOwnPasswordForm] = useState({ newPassword: "", confirmPassword: "" });
  const [changingOwnPassword, setChangingOwnPassword] = useState(false);

  // Manager Password Form State (Admin Only)
  const [managerPasswordForm, setManagerPasswordForm] = useState({ newPassword: "", confirmPassword: "" });
  const [changingManagerPassword, setChangingManagerPassword] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { companyName: "", logoUrl: "", signatureUrl: "" },
  });

  const logoUrl = watch("logoUrl");
  const signatureUrl = watch("signatureUrl");

  useEffect(() => {
    if (settings) {
      reset({
        companyName: settings.companyName,
        logoUrl: settings.logoUrl || "",
        signatureUrl: settings.signatureUrl || "",
      });
    }
  }, [settings, reset]);

  const handleFileUpload = async (file: File, type: "logoUrl" | "signatureUrl") => {
    try {
      if (type === "logoUrl") setUploadingLogo(true);
      else setUploadingSignature(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `settings/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("uploads").getPublicUrl(filePath);
      setValue(type, data.publicUrl);
      toast.success(`${type === "logoUrl" ? "Logo" : "Signature"} uploaded successfully.`);
    } catch (err: any) {
      toast.error(`Failed to upload ${type === "logoUrl" ? "logo" : "signature"}: ${err.message}`);
    } finally {
      if (type === "logoUrl") setUploadingLogo(false);
      else setUploadingSignature(false);
    }
  };

  const onSubmit = (data: SettingsFormData) => {
    updateMutation.mutate(data, {
      onSuccess: () => toast.success("Settings saved successfully."),
      onError: (err: any) => toast.error(err.message || "Failed to save settings.")
    });
  };

  const handleOwnPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ownPasswordForm.newPassword !== ownPasswordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChangingOwnPassword(true);
    try {
      const res = await fetch("/api/users/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: ownPasswordForm.newPassword,
        }),
      });
      if (res.ok) {
        toast.success("Password changed successfully");
        setOwnPasswordForm({ newPassword: "", confirmPassword: "" });
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to change password");
      }
    } catch (error) {
      toast.error("Failed to change password");
    } finally {
      setChangingOwnPassword(false);
    }
  };

  const handleManagerPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (managerPasswordForm.newPassword !== managerPasswordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChangingManagerPassword(true);
    try {
      const res = await fetch("/api/users/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole: "MANAGER",
          newPassword: managerPasswordForm.newPassword,
        }),
      });
      if (res.ok) {
        toast.success("Manager password changed successfully");
        setManagerPasswordForm({ newPassword: "", confirmPassword: "" });
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to change password");
      }
    } catch (error) {
      toast.error("Failed to change password");
    } finally {
      setChangingManagerPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  if (isUserLoading || isSettingsLoading || !user) return <PageSkeleton />;

  return (
    <div className="space-y-8 fade-in">
      <PageHeader
        title="Settings"
        subtitle="Manage your application preferences."
      />

      <div className="rounded-xl border border-border bg-white p-8 space-y-10">
        
        {user.role === "ADMIN" && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text border-b border-border pb-2">
                Company Profile
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" {...register("companyName")} placeholder="e.g. Acme Interiors" error={!!errors.companyName} />
                {errors.companyName && <p className="text-xs text-danger">{errors.companyName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Company Logo</Label>
                <div className="flex items-center gap-4">
                  {logoUrl && (
                    <img src={logoUrl} alt="Logo" className="h-12 w-12 object-contain border border-border rounded-md" />
                  )}
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "logoUrl");
                    }}
                    disabled={uploadingLogo}
                  />
                </div>
                {uploadingLogo && <p className="text-xs text-muted">Uploading logo...</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature">Signature</Label>
                <div className="flex items-center gap-4">
                  {signatureUrl && (
                    <img src={signatureUrl} alt="Signature" className="h-12 w-12 object-contain border border-border rounded-md" />
                  )}
                  <Input
                    id="signature"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "signatureUrl");
                    }}
                    disabled={uploadingSignature}
                  />
                </div>
                {uploadingSignature && <p className="text-xs text-muted">Uploading signature...</p>}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <Button type="submit" loading={updateMutation.isPending || uploadingLogo || uploadingSignature}>
                Save Settings
              </Button>
            </div>
          </form>
        )}

        {/* Change Own Password - Admin Only */}
        {user.role === "ADMIN" && (
          <form onSubmit={handleOwnPasswordSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text border-b border-border pb-2">
                Change Admin Password
              </h3>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input 
                  id="newPassword" 
                  type="password" 
                  required
                  value={ownPasswordForm.newPassword}
                  onChange={e => setOwnPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  required
                  value={ownPasswordForm.confirmPassword}
                  onChange={e => setOwnPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                />
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <Button type="submit" loading={changingOwnPassword}>
                Change Password
              </Button>
            </div>
          </form>
        )}

        {/* Admin only: Change Manager Password */}
        {user.role === "ADMIN" && (
          <form onSubmit={handleManagerPasswordSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text border-b border-border pb-2">
                Manager Account
              </h3>
              <p className="text-sm text-muted">Change Manager Password</p>
              <div className="space-y-2">
                <Label htmlFor="managerNewPassword">New Password</Label>
                <Input 
                  id="managerNewPassword" 
                  type="password" 
                  required
                  value={managerPasswordForm.newPassword}
                  onChange={e => setManagerPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="managerConfirmPassword">Confirm Password</Label>
                <Input 
                  id="managerConfirmPassword" 
                  type="password" 
                  required
                  value={managerPasswordForm.confirmPassword}
                  onChange={e => setManagerPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                />
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <Button type="submit" loading={changingManagerPassword}>
                Save Manager Password
              </Button>
            </div>
          </form>
        )}

        {/* Manager Only: Application Info */}
        {user.role === "MANAGER" && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text border-b border-border pb-2">
                Application Information
              </h3>
              <div className="space-y-1">
                <p className="text-sm font-medium text-text">Interior Ledger System</p>
                <p className="text-sm text-muted">Version 1.0.0</p>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <Button variant="danger" onClick={handleLogout}>
                <LogOut className="size-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
