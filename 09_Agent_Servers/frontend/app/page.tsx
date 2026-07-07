"use client";

import { useState } from "react";
import { Cat } from "lucide-react";

import { Chat } from "@/components/chat";
import { PasswordGate } from "@/components/password-gate";
import { cn } from "@/lib/utils";

const AGENTS = [
  {
    id: "simple_agent",
    label: "Simple",
    description: "ReAct agent with tools",
  },
  {
    id: "agent_with_helpfulness",
    label: "Helpfulness Loop",
    description: "Judge retries until helpful",
  },
] as const;

type AgentId = (typeof AGENTS)[number]["id"];

export default function Page() {
  const [agentId, setAgentId] = useState<AgentId>("simple_agent");
  const active = AGENTS.find((a) => a.id === agentId)!;

  return (
    <PasswordGate>
      <main className="flex h-dvh flex-col">
        <header className="border-b bg-background">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Cat className="size-4" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-sm font-medium">Cat Health Agent</p>
              <p className="text-xs text-muted-foreground">
                {active.description}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-lg border p-1">
              {AGENTS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAgentId(a.id)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    agentId === a.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* key forces Chat to remount (fresh thread) when the agent changes */}
        <Chat key={agentId} assistantId={agentId} />
      </main>
    </PasswordGate>
  );
}
