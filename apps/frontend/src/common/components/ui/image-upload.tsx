"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/common/lib/utils";
import { useCloudinaryUpload } from "@/hooks/useCloudinaryUpload";

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    folder?: string;
    className?: string;
    disabled?: boolean;
    placeholder?: string;
}

/**
 * Reusable image upload component that uploads directly to Cloudinary.
 * Features drag & drop, image preview, and upload progress.
 */
export function ImageUpload({
    value,
    onChange,
    folder = "products",
    className,
    disabled = false,
    placeholder = "Click or drag image to upload",
}: ImageUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [previewError, setPreviewError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { uploadImage, isUploading, progress } = useCloudinaryUpload({
        folder,
        onSuccess: (url) => {
            onChange(url);
            setPreviewError(false);
        },
    });

    const handleFileSelect = useCallback(
        async (file: File) => {
            if (!file.type.startsWith("image/")) {
                alert("Please select an image file");
                return;
            }

            // Max 10MB
            if (file.size > 10 * 1024 * 1024) {
                alert("Image must be less than 10MB");
                return;
            }

            try {
                await uploadImage(file);
            } catch (error) {
                console.error("Upload failed:", error);
            }
        },
        [uploadImage]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragging(false);

            if (disabled || isUploading) return;

            const file = e.dataTransfer.files[0];
            if (file) {
                handleFileSelect(file);
            }
        },
        [handleFileSelect, disabled, isUploading]
    );

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleClick = useCallback(() => {
        if (!disabled && !isUploading) {
            fileInputRef.current?.click();
        }
    }, [disabled, isUploading]);

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                handleFileSelect(file);
            }
            // Reset input so same file can be selected again
            e.target.value = "";
        },
        [handleFileSelect]
    );

    const handleRemove = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onChange("");
            setPreviewError(false);
        },
        [onChange]
    );

    const handleImageError = useCallback(() => {
        setPreviewError(true);
    }, []);

    return (
        <div className={cn("relative", className)}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
                disabled={disabled || isUploading}
            />

            <div
                onClick={handleClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                    "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors cursor-pointer",
                    "min-h-[160px]",
                    isDragging && "border-primary bg-primary/5",
                    !isDragging && !value && "border-muted-foreground/25 hover:border-muted-foreground/50",
                    value && !previewError && "border-transparent",
                    (disabled || isUploading) && "opacity-50 cursor-not-allowed"
                )}
            >
                {/* Preview Image */}
                {value && !previewError && !isUploading ? (
                    <div className="relative w-full h-full min-h-[160px]">
                        <img
                            src={value}
                            alt="Uploaded preview"
                            onError={handleImageError}
                            className="w-full h-full min-h-[160px] max-h-[200px] object-cover rounded-lg"
                        />
                        {!disabled && (
                            <button
                                onClick={handleRemove}
                                className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-md"
                                type="button"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                ) : isUploading ? (
                    // Upload Progress
                    <div className="flex flex-col items-center gap-3 py-4">
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        <div className="w-full max-w-[200px]">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${progress?.percentage || 0}%` }}
                                />
                            </div>
                            <p className="text-sm text-muted-foreground text-center mt-2">
                                Uploading... {progress?.percentage || 0}%
                            </p>
                        </div>
                    </div>
                ) : (
                    // Upload Prompt
                    <div className="flex flex-col items-center gap-3 py-6 px-4">
                        {previewError ? (
                            <>
                                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground text-center">
                                    Failed to load image. Click to upload a new one.
                                </p>
                            </>
                        ) : (
                            <>
                                <Upload className="h-10 w-10 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground text-center">
                                    {placeholder}
                                </p>
                                <p className="text-xs text-muted-foreground/70">
                                    PNG, JPG, GIF up to 10MB
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
