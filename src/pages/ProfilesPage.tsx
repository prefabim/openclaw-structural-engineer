import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Database,
  ExternalLink,
  Search,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  ALL_PROFILES,
  PROFILE_COLUMNS,
  PROFILE_FAMILIES,
  getProfilesByFamily,
  type ProfileColumnKey,
  type ProfileFamily,
  type SteelProfile,
} from "@/data/steelProfiles";

type SortDir = "asc" | "desc";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatNumber(value: number): string {
  if (value >= 10000) return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (value >= 100) return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (value >= 10) return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function sortProfiles(
  profiles: SteelProfile[],
  key: ProfileColumnKey,
  dir: SortDir,
): SteelProfile[] {
  return [...profiles].sort((a, b) => {
    const av = key === "name" ? a.name : (a[key as keyof SteelProfile] as number);
    const bv = key === "name" ? b.name : (b[key as keyof SteelProfile] as number);
    if (typeof av === "string" && typeof bv === "string") {
      return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return dir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });
}

// ── Sort button ────────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, sortDir }: { col: string; sortKey: string; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return sortDir === "asc" ? (
    <ArrowUp className="w-3 h-3 text-chart-1" />
  ) : (
    <ArrowDown className="w-3 h-3 text-chart-1" />
  );
}

// ── Profile detail dialog ──────────────────────────────────────────────────

function ProfileDetail({
  profile,
  open,
  onClose,
}: {
  profile: SteelProfile | null;
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  if (!profile) return null;

  const handleUseInCalculation = () => {
    const prompt = `I want to design a steel beam using an ${profile.name} profile (S355). The section properties are: h=${profile.h} mm, b=${profile.b} mm, tw=${profile.tw} mm, tf=${profile.tf} mm, A=${profile.A} cm², Iy=${profile.Iy} cm⁴, Wy=${profile.Wy} cm³, mass=${profile.mass} kg/m. Please check this profile for a simply supported beam.`;
    sessionStorage.setItem("profile-prompt", prompt);
    navigate("/chat");
  };

  const groups = [
    {
      title: "Dimensions",
      items: [
        { label: "Overall depth (h)", value: profile.h, unit: "mm" },
        { label: "Flange width (b)", value: profile.b, unit: "mm" },
        { label: "Web thickness (tw)", value: profile.tw, unit: "mm" },
        { label: "Flange thickness (tf)", value: profile.tf, unit: "mm" },
        { label: "Root radius (r)", value: profile.r, unit: "mm" },
      ],
    },
    {
      title: "Section properties",
      items: [
        { label: "Area (A)", value: profile.A, unit: "cm²" },
        { label: "Iy (strong axis)", value: profile.Iy, unit: "cm⁴" },
        { label: "Iz (weak axis)", value: profile.Iz, unit: "cm⁴" },
        { label: "Wy (strong axis)", value: profile.Wy, unit: "cm³" },
        { label: "Wz (weak axis)", value: profile.Wz, unit: "cm³" },
        { label: "iy (strong axis)", value: profile.iy, unit: "cm" },
        { label: "iz (weak axis)", value: profile.iz, unit: "cm" },
        { label: "Mass", value: profile.mass, unit: "kg/m" },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm font-mono">
              {profile.family}
            </Badge>
            <span>{profile.name}</span>
          </DialogTitle>
          <DialogDescription>
            Steel section properties per EN 10365
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {groups.map((g) => (
            <div key={g.title}>
              <h4 className="text-xs font-medium uppercase text-muted-foreground tracking-wider mb-2">
                {g.title}
              </h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {g.items.map((item) => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-mono font-medium tabular-nums">
                      {formatNumber(item.value)}{" "}
                      <span className="text-muted-foreground text-xs">{item.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1 gap-2"
            onClick={handleUseInCalculation}
          >
            <ExternalLink className="w-4 h-4" />
            Use in calculation
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export function ProfilesPage() {
  const navigate = useNavigate();
  const [family, setFamily] = useState<ProfileFamily>("IPE");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<ProfileColumnKey>("h");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedProfile, setSelectedProfile] = useState<SteelProfile | null>(null);

  const handleSort = useCallback(
    (key: ProfileColumnKey) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  const profiles = useMemo(() => {
    let list: SteelProfile[];
    if (search.trim()) {
      // Search across all families
      const q = search.trim().toLowerCase();
      list = ALL_PROFILES.filter((p) => p.name.toLowerCase().includes(q));
    } else {
      list = getProfilesByFamily(family);
    }
    return sortProfiles(list, sortKey, sortDir);
  }, [family, search, sortKey, sortDir]);

  const familyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of PROFILE_FAMILIES) {
      counts[f] = getProfilesByFamily(f).length;
    }
    return counts;
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-chart-1/10 shrink-0">
              <Database className="w-5 h-5 text-chart-1" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight truncate">
                Steel Profiles
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {ALL_PROFILES.length} European sections · EN 10365
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="border-b bg-muted/30 sticky top-[57px] z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-3">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search profiles (e.g. IPE 300, HEB 200)..."
              className="pl-9 pr-9 h-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Family tabs */}
          {!search && (
            <Tabs
              value={family}
              onValueChange={(v) => setFamily(v as ProfileFamily)}
            >
              <TabsList className="h-9">
                {PROFILE_FAMILIES.map((f) => (
                  <TabsTrigger key={f} value={f} className="text-xs gap-1.5 px-3">
                    {f}
                    <span className="text-[10px] text-muted-foreground font-normal">
                      {familyCounts[f]}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          {/* Search result info */}
          {search && (
            <p className="text-xs text-muted-foreground">
              {profiles.length} result{profiles.length !== 1 ? "s" : ""} for &ldquo;
              {search}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* Table */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4">
        <div className="rounded-lg border bg-background overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {PROFILE_COLUMNS.map((col) => (
                  <TableHead
                    key={col.key}
                    className="cursor-pointer select-none"
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.label}</span>
                      {col.unit && (
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {col.unit}
                        </span>
                      )}
                      <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={PROFILE_COLUMNS.length}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No profiles found. Try a different search term.
                  </TableCell>
                </TableRow>
              ) : (
                profiles.map((p) => (
                  <TableRow
                    key={p.name}
                    className="cursor-pointer transition-colors hover:bg-chart-1/5"
                    onClick={() => setSelectedProfile(p)}
                  >
                    <TableCell className="font-medium font-mono text-sm">
                      <div className="flex items-center gap-2">
                        {search && (
                          <Badge
                            variant="ghost"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {p.family}
                          </Badge>
                        )}
                        {p.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-sm">{p.h}</TableCell>
                    <TableCell className="font-mono tabular-nums text-sm">{p.b}</TableCell>
                    <TableCell className="font-mono tabular-nums text-sm">{p.tw}</TableCell>
                    <TableCell className="font-mono tabular-nums text-sm">{p.tf}</TableCell>
                    <TableCell className="font-mono tabular-nums text-sm">{p.r}</TableCell>
                    <TableCell className="font-mono tabular-nums text-sm">{formatNumber(p.A)}</TableCell>
                    <TableCell className="font-mono tabular-nums text-sm">{formatNumber(p.Iy)}</TableCell>
                    <TableCell className="font-mono tabular-nums text-sm">{formatNumber(p.Iz)}</TableCell>
                    <TableCell className="font-mono tabular-nums text-sm">{formatNumber(p.Wy)}</TableCell>
                    <TableCell className="font-mono tabular-nums text-sm">{formatNumber(p.Wz)}</TableCell>
                    <TableCell className="font-mono tabular-nums text-sm">{formatNumber(p.iy)}</TableCell>
                    <TableCell className="font-mono tabular-nums text-sm">{formatNumber(p.iz)}</TableCell>
                    <TableCell className="font-mono tabular-nums text-sm">{formatNumber(p.mass)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer hint */}
        <p className="text-xs text-muted-foreground text-center mt-4 mb-8">
          Click any profile to view full details and use it in a structural calculation.
        </p>
      </main>

      {/* Detail dialog */}
      <ProfileDetail
        profile={selectedProfile}
        open={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />
    </div>
  );
}

export default ProfilesPage;
