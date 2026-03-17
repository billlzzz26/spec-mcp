"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, CheckCircle, AlertCircle, Loader2, Sparkles, Database, Activity, PlusCircle } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import type { App } from "@modelcontextprotocol/ext-apps";

// MCP App singleton - เก็บฟังก์ชันเดิม
const STORAGE = {
  INPUT: "__mcp_tool_input",
  RESULT: "__mcp_tool_result",
  CONNECTED: "__mcp_connected",
} as const;

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value == null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

let memConnected = read(STORAGE.CONNECTED) ?? false;
let memToolInput = read<Record<string, unknown>>(STORAGE.INPUT);
let memToolResult = read<Record<string, unknown>>(STORAGE.RESULT);
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let singletonApp: App | null = null;

async function ensureConnected() {
  if (singletonApp) return;
  const { App } = await import("@modelcontextprotocol/ext-apps");
  const app = new App(
    { name: "skill-service-widget", version: "1.0.0" },
    {},
    { autoResize: true },
  );
  app.ontoolinput = (params) => {
    memToolInput = params.arguments ?? null;
    write(STORAGE.INPUT, memToolInput);
    notify();
  };
  app.ontoolresult = (result) => {
    memToolResult = (result.structuredContent as Record<string, unknown>) ?? null;
    write(STORAGE.RESULT, memToolResult);
    notify();
  };
  app.onerror = (error) => console.error("[mcp-app] error:", error);
  try {
    await app.connect();
    singletonApp = app;
    memConnected = true;
    write(STORAGE.CONNECTED, true);
    notify();
  } catch (err) {
    console.warn("[mcp-app] connect failed:", err);
  }
}

if (typeof window !== "undefined" && window.self !== window.top) {
  ensureConnected();
}

function useMcpApp() {
  const connected = useSyncExternalStore(subscribe, () => memConnected, () => false);
  const toolInput = useSyncExternalStore(subscribe, () => memToolInput, () => null);
  const toolResult = useSyncExternalStore(subscribe, () => memToolResult, () => null);
  return { app: singletonApp, connected, toolInput, toolResult };
}

interface Skill {
  skill_id: string;
  skill_name: string;
  description: string;
  capabilities: string[];
  plugin_domain?: string;
  provider_id?: string;
  version?: string;
  rerank_score?: number;
}

export default function SkillServiceWidget() {
  const { connected, toolInput, toolResult } = useMcpApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "searching" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Handle tool input from MCP host - เก็บฟังก์ชันเดิม
  useEffect(() => {
    if (toolInput && typeof toolInput.query === "string") {
      handleSearch(toolInput.query, (toolInput.top_k as number) || 5);
    }
  }, [toolInput]);

  const handleSearch = async (query: string, topK: number = 5) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setStatus("searching");
    setErrorMessage("");

    try {
      // Call Modal backend - เก็บ URL เดิม
      const response = await fetch("https://billlzzz10--skill-embedding-service-search-skills-http.modal.run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          top_k_rerank: topK,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json();

      if (Array.isArray(results)) {
        setSkills(results);
        setStatus(results.length > 0 ? "success" : "idle");
      } else if (results.error) {
        setErrorMessage(results.error);
        setStatus("error");
      } else {
        setSkills([results]);
        setStatus("success");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Search failed");
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery, 5);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Background glow */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative max-w-5xl mx-auto px-6 py-12 space-y-8">
        {/* Header - ปรับปรุง UI */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            AI-Powered Skill Discovery
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
            Skill Service
          </h1>
          
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Semantic search for AI agent skills powered by Voyage AI embeddings
          </p>

          {/* Connection Status - เก็บฟังก์ชันเดิม */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {connected ? (
              <Badge className="gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 cursor-default">
                <CheckCircle className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 border-slate-700 text-slate-400 cursor-default">
                <AlertCircle className="h-3 w-3" />
                Standalone Mode
              </Badge>
            )}
          </div>
        </header>

        {/* Stats Cards - เพิ่มข้อมูล tech stack พร้อม GlowingEffect */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Vector Database */}
          <div className="relative rounded-xl">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={2}
            />
            <Card className="relative bg-slate-900/50 border-slate-800 backdrop-blur-sm h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Database className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Vector Database</p>
                    <p className="text-lg font-semibold">Zilliz Cloud</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Card 2: Embeddings */}
          <div className="relative rounded-xl">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={2}
            />
            <Card className="relative bg-slate-900/50 border-slate-800 backdrop-blur-sm h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10">
                    <Activity className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Embeddings</p>
                    <p className="text-lg font-semibold">Voyage AI</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Card 3: Integration */}
          <div className="relative rounded-xl">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={2}
            />
            <Card className="relative bg-slate-900/50 border-slate-800 backdrop-blur-sm h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <PlusCircle className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Integration</p>
                    <p className="text-lg font-semibold">MCP Protocol</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Search Form - ปรับปรุง UI แต่เก็บฟังก์ชันเดิม */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-2xl shadow-blue-500/5">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-slate-100">Search Skills</CardTitle>
            <CardDescription className="text-slate-400">
              Find skills using natural language queries with AI-powered reranking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <Input
                  data-testid="search-input"
                  placeholder="Try: 'build HTML UI with React components' or 'generate changelog from git commits'"
                  className="pl-12 h-14 bg-slate-950/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || !searchQuery.trim()}
                className="w-full h-14 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    Search Skills
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results - เก็บฟังก์ชันแสดงผลเดิม */}
        {status === "searching" && (
          <div className="space-y-4" data-testid="loading-state">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 bg-slate-800" />
                  <Skeleton className="h-4 w-1/2 bg-slate-800" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full bg-slate-800" />
                  <Skeleton className="h-4 w-2/3 mt-2 bg-slate-800" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {status === "error" && (
          <Card className="border-red-500/50 bg-red-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Search failed</p>
                  <p className="text-sm text-red-300/80 mt-1">{errorMessage}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {status === "success" && skills.length > 0 && (
          <div className="space-y-6" data-testid="search-results">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-200">
                Found {skills.length} skill{skills.length !== 1 ? "s" : ""}
              </h2>
              <Badge variant="outline" className="border-slate-700 text-slate-400">
                Sorted by relevance
              </Badge>
            </div>
            {skills.map((skill, index) => (
              <Card
                key={skill.skill_id}
                className="bg-slate-900/50 border-slate-800 hover:border-blue-500/50 transition-all duration-200 cursor-pointer group"
                data-testid={`skill-card-${index}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg text-slate-100 group-hover:text-blue-400 transition-colors">
                          {skill.skill_name}
                        </CardTitle>
                        {skill.version && (
                          <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                            v{skill.version}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs font-mono text-slate-500">
                        {skill.skill_id}
                      </CardDescription>
                    </div>
                    {skill.rerank_score && (
                      <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                        {(skill.rerank_score * 100).toFixed(0)}% match
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {skill.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {skill.capabilities?.slice(0, 5).map((cap) => (
                      <Badge
                        key={cap}
                        variant="outline"
                        className="text-xs border-slate-700 text-slate-400 hover:border-slate-600 transition-colors"
                      >
                        {cap}
                      </Badge>
                    ))}
                    {skill.capabilities && skill.capabilities.length > 5 && (
                      <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                        +{skill.capabilities.length - 5}
                      </Badge>
                    )}
                  </div>
                  {(skill.plugin_domain || skill.provider_id) && (
                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-800">
                      {skill.plugin_domain && (
                        <span className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {skill.plugin_domain}
                        </span>
                      )}
                      {skill.provider_id && (
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {skill.provider_id}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {status === "idle" && skills.length === 0 && (
          <Card className="bg-slate-900/50 border-slate-800 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="p-4 rounded-full bg-slate-800/50">
                <Search className="h-8 w-8 text-slate-500" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold text-slate-300">Ready to search</h3>
                <p className="text-slate-500 max-w-sm">
                  Enter a search query above to discover relevant skills for your AI agents
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-slate-800">
          <p className="text-sm text-slate-500">
            Powered by Voyage AI • Zilliz Cloud • MCP Protocol
          </p>
        </footer>
      </div>
    </div>
  );
}
