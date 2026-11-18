"use client";

import { useEffect, useState } from "react";
import { FolderPlus, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { apiClient, ClientApiError } from "@/lib/api/client";
import { PROJECT_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/api";

interface ProjectFormModalProps {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
  onSaved: (project: Project) => void;
}

function suggestKey(name: string): string {
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .trim();
  if (!cleaned) return "";
  const words = cleaned.split(/\s+/);
  if (words.length >= 2) {
    return words
      .map((w) => w[0])
      .join("")
      .slice(0, 5);
  }
  return cleaned.slice(0, 4);
}

export function ProjectFormModal({ open, onClose, project, onSaved }: ProjectFormModalProps) {
  const isEdit = Boolean(project);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(PROJECT_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFieldErrors({});
    if (project) {
      setName(project.name);
      setKey(project.key);
      setKeyTouched(true);
      setDescription(project.description ?? "");
      setColor(project.color);
    } else {
      setName("");
      setKey("");
      setKeyTouched(false);
      setDescription("");
      setColor(PROJECT_COLORS[0]);
    }
  }, [open, project]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      if (project) {
        const res = await apiClient.projects.update(project.id, {
          name,
          description: description.trim() ? description : null,
          color,
        });
        toast.success(`Updated project ${res.data.name}`);
        onSaved(res.data);
        onClose();
      } else {
        const res = await apiClient.projects.create({
          name,
          key,
          description: description.trim() ? description : null,
          color,
        });
        toast.success(`Created project [${res.data.key}] ${res.data.name}`);
        onSaved(res.data);
        onClose();
      }
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
        if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      } else {
        setError("Failed to save project");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <FolderPlus className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              {isEdit ? "Edit Project" : "New Agile Project"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Project Name
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={60}
                value={name}
                onChange={(e) => {
                  const next = e.target.value;
                  setName(next);
                  if (!isEdit && !keyTouched) {
                    setKey(suggestKey(next));
                  }
                }}
                placeholder="e.g. Checkout Microservice"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              {fieldErrors.name?.[0] && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.name[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Key Prefix
              </label>
              <input
                type="text"
                required
                disabled={isEdit}
                minLength={2}
                maxLength={6}
                value={key}
                onChange={(e) => {
                  setKeyTouched(true);
                  setKey(e.target.value.toUpperCase());
                }}
                placeholder="CHK"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm uppercase text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              {fieldErrors.key?.[0] && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.key[0]}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Description
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary of project scope and goals..."
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Badge Color
            </label>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {PROJECT_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  style={{ backgroundColor: hex }}
                  className={cn(
                    "h-7 w-7 rounded-full transition-transform",
                    color === hex ? "scale-110 ring-2 ring-slate-900 ring-offset-2" : "opacity-80 hover:opacity-100",
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? "Save Changes" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
