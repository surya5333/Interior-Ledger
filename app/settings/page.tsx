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

const settingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  logoUrl: z.string().optional().or(z.literal("")),
  signatureUrl: z.string().optional().or(z.literal("")),
});
type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);

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

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-8 fade-in">
      <PageHeader
        title="Settings"
        subtitle="Manage your application preferences."
      />

      <div className="rounded-xl border border-border bg-white p-8">
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
      </div>
    </div>
  );
}
