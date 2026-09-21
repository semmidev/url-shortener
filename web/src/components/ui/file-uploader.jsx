import React, { useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { requestPresignedURL } from '@/features/account/api';
import { useI18n } from '@/context/I18nContext';
import {
  UploadCloudIcon,
  CameraIcon,
  XIcon,
  Loader2Icon,
  CheckCircle2Icon,
  ImageIcon,
  Trash2Icon,
  AlertCircleIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function FileUploader({
  accept = 'image/png, image/jpeg, image/webp, image/gif',
  maxSizeMB = 5,
  multiple = false,
  value,
  onChange,
  onUploadStart,
  category = 'avatars',
  variant = 'dropzone', // 'avatar' | 'dropzone' | 'button'
  className = '',
  disabled = false,
  label,
  description,
  fallbackInitials = 'U',
}) {
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const displayLabel = label || t('uploader.selectFile');

  // Helper to validate a file before presigning
  const validateFile = (file) => {
    if (!file) return false;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(t('uploader.maxSizeNotice', { maxSize: maxSizeMB }));
      return false;
    }

    if (accept && accept !== '*/*') {
      const allowedTypes = accept.split(',').map((tItem) => tItem.trim().toLowerCase());
      const fileType = file.type.toLowerCase();
      const isTypeAllowed = allowedTypes.some((allowed) => {
        if (allowed.endsWith('/*')) {
          const group = allowed.split('/')[0];
          return fileType.startsWith(group + '/');
        }
        return allowed === fileType;
      });

      if (!isTypeAllowed) {
        toast.error(t('uploader.uploadError'));
        return false;
      }
    }
    return true;
  };

  // Upload a single file via S3 Presigned URL
  const uploadSingleFile = async (file) => {
    try {
      setUploadProgress(10);
      // 1. Request S3 Presigned URL from Backend
      const presignedData = await requestPresignedURL({
        fileName: file.name,
        contentType: file.type || 'image/jpeg',
        fileSize: file.size,
        category,
      });

      if (!presignedData?.upload_url || !presignedData?.public_url) {
        throw new Error(t('uploader.uploadError'));
      }

      setUploadProgress(30);

      // 2. Direct Upload to S3 via Presigned PUT URL
      await axios.put(presignedData.upload_url, file, {
        headers: {
          'Content-Type': file.type || 'image/jpeg',
        },
        onUploadProgress: (evt) => {
          if (evt.total) {
            const percent = Math.round(30 + (evt.loaded / evt.total) * 65);
            setUploadProgress(percent);
          }
        },
      });

      setUploadProgress(100);
      toast.success(t('uploader.uploadSuccess'));
      return presignedData.public_url;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || t('uploader.uploadError');
      toast.error(msg);
      throw err;
    }
  };

  const handleFilesSelected = async (files) => {
    const validFiles = Array.from(files).filter(validateFile);
    if (validFiles.length === 0) return;

    setIsUploading(true);
    if (onUploadStart) onUploadStart();

    try {
      if (multiple) {
        const uploadedUrls = [];
        for (const file of validFiles) {
          const url = await uploadSingleFile(file);
          if (url) uploadedUrls.push(url);
        }
        const currentUrls = Array.isArray(value) ? value : value ? [value] : [];
        const nextValue = [...currentUrls, ...uploadedUrls];
        if (onChange) onChange(nextValue);
      } else {
        const singleUrl = await uploadSingleFile(validFiles[0]);
        if (singleUrl && onChange) onChange(singleUrl);
      }
    } catch {
      // Error handles in uploadSingleFile via toast
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleRemove = (urlToRemove) => {
    if (multiple && Array.isArray(value)) {
      const nextValue = value.filter((u) => u !== urlToRemove);
      if (onChange) onChange(nextValue);
    } else {
      if (onChange) onChange('');
    }
  };

  // VARIANT 1: Avatar Profile Uploader
  if (variant === 'avatar') {
    const avatarUrl = typeof value === 'string' ? value : Array.isArray(value) ? value[0] : '';

    return (
      <div className={`flex flex-col items-center sm:items-start gap-3 ${className}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          disabled={disabled || isUploading}
          onChange={(e) => e.target.files?.length && handleFilesSelected(e.target.files)}
          className="hidden"
        />

        <div className="relative group">
          <div className="relative size-24 sm:size-28 rounded-full overflow-hidden border-2 border-border/80 shadow-md bg-muted/40 flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar Preview"
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-primary/10 text-primary font-bold text-2xl uppercase select-none">
                {fallbackInitials}
              </div>
            )}

            {/* Uploading Spinner & Progress Bar Overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-white gap-1 z-10 animate-in fade-in">
                <Loader2Icon className="size-6 animate-spin text-primary" />
                <span className="text-[10px] font-mono font-semibold">{uploadProgress}%</span>
              </div>
            )}

            {/* Hover Trigger Overlay */}
            {!disabled && !isUploading && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white cursor-pointer z-10"
                title={t('uploader.changePhoto')}
              >
                <CameraIcon className="size-6 mb-0.5" />
                <span className="text-[10px] font-medium">{t('uploader.changePhoto')}</span>
              </button>
            )}
          </div>

          {/* Quick Upload Badge button */}
          {!disabled && !isUploading && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md border-2 border-background hover:bg-primary/90 transition-transform hover:scale-110 cursor-pointer z-20"
              title={t('uploader.selectPhoto')}
            >
              <CameraIcon className="size-4" />
            </button>
          )}
        </div>

        {/* Action Controls & Hint */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="text-xs h-8 cursor-pointer gap-1.5"
            >
              {isUploading ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin" />
                  {t('uploader.uploading')} ({uploadProgress}%)
                </>
              ) : (
                <>
                  <UploadCloudIcon className="size-3.5" />
                  {t('uploader.selectPhoto')}
                </>
              )}
            </Button>

            {avatarUrl && !disabled && !isUploading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(avatarUrl)}
                className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                title={t('uploader.remove')}
              >
                <Trash2Icon className="size-3.5 mr-1" />
                {t('uploader.remove')}
              </Button>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground mt-0.5">
            {t('uploader.maxSizeNotice', { maxSize: maxSizeMB })}
          </p>
        </div>
      </div>
    );
  }

  // VARIANT 2: Button Only
  if (variant === 'button') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled || isUploading}
          onChange={(e) => e.target.files?.length && handleFilesSelected(e.target.files)}
          className="hidden"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer gap-2"
        >
          {isUploading ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              {t('uploader.uploading')} ({uploadProgress}%)
            </>
          ) : (
            <>
              <UploadCloudIcon className="size-4" />
              {displayLabel}
            </>
          )}
        </Button>
      </div>
    );
  }

  // VARIANT 3: Default Rich Dropzone
  const fileUrls = Array.isArray(value) ? value : value ? [value] : [];

  return (
    <div className={`space-y-3 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled || isUploading}
        onChange={(e) => e.target.files?.length && handleFilesSelected(e.target.files)}
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 text-center flex flex-col items-center justify-center cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary/10 shadow-md scale-[1.01]'
            : isUploading
            ? 'border-border bg-muted/20 opacity-90 pointer-events-none'
            : 'border-border/80 bg-card hover:bg-muted/30 hover:border-primary/50'
        }`}
      >
        {isUploading ? (
          <div className="space-y-3 py-2 w-full max-w-xs mx-auto">
            <Loader2Icon className="size-8 text-primary animate-spin mx-auto" />
            <div>
              <p className="text-xs font-semibold text-foreground">{t('uploader.uploadingToS3')}</p>
              <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden border border-border/40">
                <div
                  className="bg-primary h-full transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground mt-1 block">{uploadProgress}% {t('uploader.completed')}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs border border-primary/20">
              <UploadCloudIcon className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                <span className="text-primary hover:underline">{t('uploader.clickToSelect')}</span> {t('uploader.orDragHere')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {description || t('uploader.supportsNotice', { accept, maxSize: maxSizeMB })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* File Previews List */}
      {fileUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {fileUrls.map((url, idx) => (
            <div
              key={url + idx}
              className="relative group rounded-xl overflow-hidden border border-border bg-card p-2 flex flex-col items-center shadow-2xs"
            >
              <div className="size-20 rounded-lg overflow-hidden bg-muted/40 flex items-center justify-center relative">
                <img src={url} alt={`Preview ${idx}`} className="size-full object-cover" />
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(url)}
                    className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white hover:bg-destructive transition-colors cursor-pointer"
                    title={t('uploader.remove')}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                )}
              </div>
              <span className="text-[10px] font-mono text-muted-foreground mt-1 truncate w-full text-center">
                {t('uploader.fileNum', { num: idx + 1 })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
