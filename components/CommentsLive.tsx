"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Sluša bazu (Supabase Realtime): kad neko doda ili obriše komentar, stranica se sama osveži
export function CommentsLive({ eventId, commentIds }: { eventId: string; commentIds: string[] }) {
  const router = useRouter();
  const ids = useRef(commentIds);
  useEffect(() => {
    ids.current = commentIds;
  }, [commentIds]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`komentari-${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `event_id=eq.${eventId}` },
        () => router.refresh(),
      )
      // Kod brisanja baza javlja samo id komentara, pa proveravamo da li je bio na ovoj stranici
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "comments" }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id && ids.current.includes(id)) router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, router]);

  return null;
}
