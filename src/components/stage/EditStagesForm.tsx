"use client";

import { useState } from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Swal from 'sweetalert2';
import Image from "next/image";

type Stage = {
  id: number;
  stage: string;
  icon_light?: string;
  icon_dark?: string;
};

interface EditStageFormProps {
  stage: Stage;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditStagesForm({ stage, onSuccess, onCancel }: EditStageFormProps) {
  const [loading, setLoading] = useState(false);
  const [stageName, setStageName] = useState(stage.stage);
  const [error, setError] = useState("");
  const [iconLight, setIconLight] = useState(stage.icon_light || "");
  const [iconDark, setIconDark] = useState(stage.icon_dark || "");
  const [iconLightPreview, setIconLightPreview] = useState(
    stage.icon_light ? `/images/product/stage/${stage.icon_light}` : ""
  );
  const [iconDarkPreview, setIconDarkPreview] = useState(
    stage.icon_dark ? `/images/product/stage/${stage.icon_dark}` : ""
  );
  const [uploadingLight, setUploadingLight] = useState(false);
  const [uploadingDark, setUploadingDark] = useState(false);

  const handleFileUpload = async (file: File, type: 'light' | 'dark') => {
    if (type === 'light') setUploadingLight(true);
    else setUploadingDark(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/stages/upload-icon', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        if (type === 'light') {
          setIconLight(result.fileName);
          setIconLightPreview(result.filePath);
        } else {
          setIconDark(result.fileName);
          setIconDarkPreview(result.filePath);
        }
        Swal.fire({
          title: 'Berhasil',
          text: 'File berhasil diupload',
          icon: 'success',
          customClass: {
            container: 'swal2-container-custom-z-index'
          }
        });
      } else {
        Swal.fire({
          title: 'Error',
          text: result.message,
          icon: 'error',
          customClass: {
            container: 'swal2-container-custom-z-index'
          }
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      Swal.fire({
        title: 'Error',
        text: 'Terjadi kesalahan saat mengupload file',
        icon: 'error',
        customClass: {
          container: 'swal2-container-custom-z-index'
        }
      });
    } finally {
      if (type === 'light') setUploadingLight(false);
      else setUploadingDark(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!stageName.trim()) {
      setError("Nama stage wajib diisi");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/stages/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          id: stage.id, 
          stage: stageName,
          icon_light: iconLight || null,
          icon_dark: iconDark || null
        })
      });

      const data = await res.json();

      if (data.success) {
        Swal.fire({
          title: "Berhasil",
          text: "Stage berhasil diperbarui",
          icon: "success",
          customClass: {
            container: 'swal2-container-custom-z-index'
          }
        });
        onSuccess();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Terjadi kesalahan pada server");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Edit Stage</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <Label htmlFor="stage">Nama Stage</Label>
          <Input
            id="stage"
            name="stage"
            type="text"
            defaultValue={stageName}
            onChange={(e) => setStageName(e.target.value)}
            placeholder="Masukkan nama stage"
            className="w-full"
          />
          {error && <p className="text-coral-medium text-sm mt-1">{error}</p>}
        </div>

        {/* Icon Upload Section - Horizontal Layout */}
        <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Icon Light Upload */}
            <div className="mb-4">
              <Label htmlFor="icon_light">Icon Light</Label>
              <input
                id="icon_light"
                name="icon_light"
                type="file"
                accept=".svg,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'light');
                }}
                className="block w-full text-sm text-muted-periwinkle dark:text-muted-taupe
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-cool-sky/30 file:text-cool-powder
                  hover:file:bg-cool-sky/50
                  dark:file:bg-cool-periwinkle/20 dark:file:text-cool-bisque
                  dark:hover:file:bg-cool-periwinkle/30"
              />
              {uploadingLight && (
                <p className="text-sm text-cool-sky dark:text-cool-periwinkle">Mengupload...</p>
              )}
              {iconLightPreview && (
                <div className="mt-2 p-3 bg-warm-pearl/30 dark:bg-muted-slate rounded-lg">
                  <p className="text-xs text-muted-periwinkle dark:text-muted-taupe mb-2">Preview:</p>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-neutral-cream-soft border border-neutral-beige-light rounded-lg flex items-center justify-center">
                      <Image 
                        src={iconLightPreview} 
                        alt="Light icon" 
                        width={32} 
                        height={32} 
                        className="w-8 h-8 object-contain" 
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-blue-gray dark:text-neutral-cream-soft">Light Theme</p>
                      <p className="text-xs text-muted-periwinkle dark:text-muted-taupe">{iconLight}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Icon Dark Upload */}
            <div className="mb-4">
              <Label htmlFor="icon_dark">Icon Dark</Label>
              <input
                id="icon_dark"
                name="icon_dark"
                type="file"
                accept=".svg,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'dark');
                }}
                className="block w-full text-sm text-muted-periwinkle dark:text-muted-taupe
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-soft-mauve/30 file:text-vibrant-purple
                  hover:file:bg-soft-mauve/50
                  dark:file:bg-vibrant-purple/20 dark:file:text-soft-mauve
                  dark:hover:file:bg-vibrant-purple/30"
              />
              {uploadingDark && (
                <p className="text-sm text-cool-sky dark:text-cool-periwinkle">Mengupload...</p>
              )}
              {iconDarkPreview && (
                <div className="mt-2 p-3 bg-warm-pearl/30 dark:bg-muted-slate rounded-lg">
                  <p className="text-xs text-muted-periwinkle dark:text-muted-taupe mb-2">Preview:</p>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-muted-blue-gray border border-muted-slate rounded-lg flex items-center justify-center">
                      <Image 
                        src={iconDarkPreview} 
                        alt="Dark icon" 
                        width={32} 
                        height={32} 
                        className="w-8 h-8 object-contain" 
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-blue-gray dark:text-neutral-cream-soft">Dark Theme</p>
                      <p className="text-xs text-muted-periwinkle dark:text-muted-taupe">{iconDark}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            onClick={onCancel}
            className="bg-muted-sand hover:bg-muted-taupe text-muted-blue-gray"
          >
            Batal
          </Button>
          <Button
            className="bg-cool-sky hover:bg-cool-powder text-white"
            disabled={loading}
          >
            {loading ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </form>
    </div>
  );
}