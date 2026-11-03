"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "./ui";
import { useI18n } from "@/lib/i18n";

export function CourseManagement({ courseId, title }: { courseId: string; title: string }) {
  const { lang } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const fr = lang === "fr";

  async function rename() {
    const nextTitle = window.prompt(fr ? "Nouveau nom du cours" : "New course name", title)?.trim();
    if (!nextTitle || nextTitle === title) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });
      if (!res.ok) throw new Error("rename_failed");
      router.refresh();
    } catch {
      window.alert(fr ? "Le cours n'a pas pu être renommé." : "The course could not be renamed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const confirmed = window.confirm(
      fr
        ? "Supprimer définitivement ce cours, ses questions et toute sa progression ?"
        : "Permanently delete this course, its questions, and all progress?"
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete_failed");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      window.alert(fr ? "Le cours n'a pas pu être supprimé." : "The course could not be deleted.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2" aria-label={fr ? "Gestion du cours" : "Course management"}>
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={rename}>
        <Pencil className="size-3.5" /> {fr ? "Renommer" : "Rename"}
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={remove} className="text-rose">
        <Trash2 className="size-3.5" /> {fr ? "Supprimer" : "Delete"}
      </Button>
    </div>
  );
}
