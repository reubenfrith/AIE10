"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cat } from "lucide-react";

const STORAGE_KEY = "cat_agent_auth";
const PASSWORD = process.env.NEXT_PUBLIC_ACCESS_PASSWORD ?? "meow";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setAuthed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  if (authed === null) return null;

  if (authed) return <>{children}</>;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim().toLowerCase() === PASSWORD.toLowerCase()) {
      localStorage.setItem(STORAGE_KEY, "1");
      setAuthed(true);
    } else {
      setError(true);
      setValue("");
    }
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Cat className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">Cat Health Agent</h1>
          <p className="text-sm text-muted-foreground">Enter the secret word to continue</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Input
            type="password"
            placeholder="Secret word…"
            value={value}
            autoFocus
            onChange={(e) => { setValue(e.target.value); setError(false); }}
          />
          {error && <p className="text-xs text-destructive">Incorrect — try again.</p>}
          <Button type="submit" className="w-full">Enter</Button>
        </form>
      </div>
    </div>
  );
}
