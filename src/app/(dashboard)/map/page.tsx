"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatNumber, cn } from "@/lib/utils";
import {
  MapPin, Users, Briefcase, TrendingUp, ChevronRight,
  Layers, BarChart3, X, CheckCircle2, AlertCircle, Circle,
} from "lucide-react";

// ─── J&K District Centroids ───────────────────────────────────────────────────
const JK_DISTRICTS = [
  { name: "Srinagar",    lat: 34.0836, lng: 74.7973, division: "Kashmir" },
  { name: "Baramulla",   lat: 34.2090, lng: 74.3442, division: "Kashmir" },
  { name: "Budgam",      lat: 33.9278, lng: 74.7170, division: "Kashmir" },
  { name: "Anantnag",    lat: 33.7311, lng: 75.1487, division: "Kashmir" },
  { name: "Kulgam",      lat: 33.6441, lng: 75.0188, division: "Kashmir" },
  { name: "Pulwama",     lat: 33.8742, lng: 74.8977, division: "Kashmir" },
  { name: "Shopian",     lat: 33.7160, lng: 74.8350, division: "Kashmir" },
  { name: "Ganderbal",   lat: 34.2260, lng: 74.7770, division: "Kashmir" },
  { name: "Bandipora",   lat: 34.4150, lng: 74.6450, division: "Kashmir" },
  { name: "Kupwara",     lat: 34.5230, lng: 74.2640, division: "Kashmir" },
  { name: "Jammu",       lat: 32.7266, lng: 74.8570, division: "Jammu"   },
  { name: "Samba",       lat: 32.5757, lng: 75.1157, division: "Jammu"   },
  { name: "Kathua",      lat: 32.3840, lng: 75.5150, division: "Jammu"   },
  { name: "Udhampur",    lat: 32.9160, lng: 75.1410, division: "Jammu"   },
  { name: "Reasi",       lat: 33.0830, lng: 74.8340, division: "Jammu"   },
  { name: "Rajouri",     lat: 33.3770, lng: 74.3040, division: "Jammu"   },
  { name: "Poonch",      lat: 33.7720, lng: 74.0930, division: "Jammu"   },
  { name: "Doda",        lat: 33.1490, lng: 75.5490, division: "Jammu"   },
  { name: "Kishtwar",    lat: 33.3130, lng: 75.7680, division: "Jammu"   },
  { name: "Ramban",      lat: 33.2450, lng: 75.2380, division: "Jammu"   },
];

type DistrictStats = {
  district: string;
  beneficiaries: number;
  projects: number;
  schemes: number;
  approved: number;
  pending: number;
};

type SelectedDistrict = DistrictStats & {
  lat: number;
  lng: number;
  division: string;
};

export default function MapPage() {
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const boundaryRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [activeLayer, setActiveLayer] = useState<"beneficiaries" | "projects" | "performance">("beneficiaries");
  const [selectedDistrict, setSelectedDistrict] = useState<SelectedDistrict | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Fetch district-aggregated data from API
  const { data: beneficiaries = [] } = useQuery({
    queryKey: ["beneficiaries"],
    queryFn: () => api.get("/beneficiaries").then(r => r.data as any[]),
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get("/projects").then(r => r.data as any[]),
  });
  const { data: schemes = [] } = useQuery({
    queryKey: ["schemes"],
    queryFn: () => api.get("/schemes").then(r => r.data as any[]),
  });

  // Aggregate by district
  const districtStats: Record<string, DistrictStats> = {};
  JK_DISTRICTS.forEach(d => {
    districtStats[d.name] = { district: d.name, beneficiaries: 0, projects: 0, schemes: 0, approved: 0, pending: 0 };
  });
  beneficiaries.forEach((b: any) => {
    const d = b.district;
    if (d && districtStats[d]) {
      districtStats[d].beneficiaries++;
      if (b.applicationStatus === "APPROVED") districtStats[d].approved++;
      if (b.applicationStatus === "PENDING") districtStats[d].pending++;
    }
  });
  projects.forEach((p: any) => {
    if (p.district && districtStats[p.district]) districtStats[p.district].projects++;
  });
  schemes.forEach((s: any) => {
    if ((s as any).district && districtStats[(s as any).district]) districtStats[(s as any).district].schemes++;
  });

  // Max values for scaling
  const maxBeneficiaries = Math.max(...Object.values(districtStats).map(d => d.beneficiaries), 1);
  const maxProjects = Math.max(...Object.values(districtStats).map(d => d.projects), 1);

  function getBubbleSize(district: string): number {
    const stats = districtStats[district] || { beneficiaries: 0, projects: 0 };
    const base = 12;
    const max = 50;
    if (activeLayer === "beneficiaries") {
      return base + ((stats.beneficiaries / maxBeneficiaries) * (max - base));
    }
    if (activeLayer === "projects") {
      return base + ((stats.projects / maxProjects) * (max - base));
    }
    // Performance: fixed size, colour varies
    return 22;
  }

  function getBubbleColor(district: string): string {
    const stats = districtStats[district] || { beneficiaries: 0, projects: 0, approved: 0 };
    if (activeLayer === "performance") {
      const total = stats.beneficiaries;
      if (total === 0) return "#94a3b8";
      const rate = (stats.approved / total) * 100;
      if (rate >= 75) return "#16a34a";
      if (rate >= 50) return "#d97706";
      return "#dc2626";
    }
    if (activeLayer === "beneficiaries") {
      const pct = (stats.beneficiaries / maxBeneficiaries) * 100;
      if (pct >= 60) return "#15803d";
      if (pct >= 30) return "#16a34a";
      if (pct > 0) return "#4ade80";
      return "#94a3b8";
    }
    // projects
    if (stats.projects >= 5) return "#0369a1";
    if (stats.projects > 0) return "#38bdf8";
    return "#94a3b8";
  }

  // Load Leaflet and render map
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const loadMap = async () => {
      if (typeof window === "undefined") return;

      // Dynamically import leaflet
      const L = (await import("leaflet" as any)).default;
      leafletRef.current = L;

      // Add leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (mapRef.current && !mapRef.current._leaflet_id) {
        const map = L.map(mapRef.current, {
          center: [33.7, 75.5],
          zoom: 7,
          zoomControl: true,
          scrollWheelZoom: true,
        });

        // OpenStreetMap tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          opacity: 0.6,
        }).addTo(map);

        // Load J&K boundary
        try {
          const res = await fetch("/jk-boundary.geojson");
          if (res.ok) {
            const geojson = await res.json();
            boundaryRef.current = L.geoJSON(geojson, {
              style: {
                color: "#15803d",
                weight: 2.5,
                fillColor: "#dcfce7",
                fillOpacity: 0.15,
              },
            }).addTo(map);
          }
        } catch (e) {
          // boundary optional
        }

        mapRef.current._leafletMap = map;
        setMapReady(true);
      }
    };

    loadMap();
  }, [mounted]);

  // Update markers when data or layer changes
  useEffect(() => {
    if (!mapReady || !mapRef.current?._leafletMap || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current._leafletMap;

    // Clear existing markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    JK_DISTRICTS.forEach(district => {
      const size = getBubbleSize(district.name);
      const color = getBubbleColor(district.name);
      const stats = districtStats[district.name];

      const marker = L.circleMarker([district.lat, district.lng], {
        radius: size / 2,
        fillColor: color,
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      }).addTo(map);

      // Label
      const label = L.divIcon({
        html: `<div style="
          font-size:10px;
          font-weight:600;
          color:#1e293b;
          white-space:nowrap;
          text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff;
          margin-top:${size / 2 + 2}px;
          margin-left:-20px;
        ">${district.name}</div>`,
        className: "",
        iconSize: [80, 20],
        iconAnchor: [0, 0],
      });
      const labelMarker = L.marker([district.lat, district.lng], { icon: label });
      labelMarker.addTo(map);
      markersRef.current.push(labelMarker);

      marker.on("click", () => {
        setSelectedDistrict({
          ...stats,
          lat: district.lat,
          lng: district.lng,
          division: district.division,
        });
      });

      marker.bindTooltip(`
        <div style="font-family:sans-serif;min-width:140px">
          <p style="font-weight:700;margin:0 0 4px">${district.name}</p>
          <p style="margin:2px 0;font-size:11px">👥 ${stats.beneficiaries} beneficiaries</p>
          <p style="margin:2px 0;font-size:11px">📁 ${stats.projects} projects</p>
          <p style="margin:2px 0;font-size:11px">✅ ${stats.approved} approved</p>
        </div>
      `, { direction: "top", offset: [0, -size / 2] });

      markersRef.current.push(marker);
    });
  }, [mapReady, activeLayer, beneficiaries, projects]);

  const totalBeneficiaries = Object.values(districtStats).reduce((a, d) => a + d.beneficiaries, 0);
  const totalProjects = Object.values(districtStats).reduce((a, d) => a + d.projects, 0);
  const coveredDistricts = Object.values(districtStats).filter(d => d.beneficiaries > 0 || d.projects > 0).length;

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-4 max-w-[1400px] h-full">
      {/* Summary row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Districts Covered", value: `${coveredDistricts}/20`, icon: MapPin, color: "text-brand-700", bg: "bg-brand-50" },
          { label: "Total Beneficiaries", value: formatNumber(totalBeneficiaries), icon: Users, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Active Projects", value: formatNumber(totalProjects), icon: Briefcase, color: "text-purple-700", bg: "bg-purple-50" },
          { label: "Approved", value: formatNumber(Object.values(districtStats).reduce((a, d) => a + d.approved, 0)), icon: TrendingUp, color: "text-green-700", bg: "bg-green-50" },
        ].map(c => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="stat-card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
                <Icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 font-display">{c.value}</p>
                <p className="text-xs text-slate-600">{c.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Map + sidebar */}
      <div className="flex gap-4" style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}>
        {/* Map */}
        <div className="flex-1 card overflow-hidden relative">
          {/* Layer controls */}
          <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1.5">
            <div className="bg-white rounded-xl shadow-card border border-slate-200 p-1 flex flex-col gap-1">
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider px-2 pt-1">Layer</p>
              {[
                { key: "beneficiaries", label: "Beneficiaries", color: "bg-brand-600" },
                { key: "projects", label: "Projects", color: "bg-blue-600" },
                { key: "performance", label: "Performance", color: "bg-saffron-500" },
              ].map(l => (
                <button key={l.key}
                  onClick={() => setActiveLayer(l.key as any)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all",
                    activeLayer === l.key
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  )}>
                  <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                  {l.label}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="bg-white rounded-xl shadow-card border border-slate-200 p-2.5 text-[10px]">
              <p className="font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Legend</p>
              {activeLayer === "performance" ? (
                <div className="space-y-1">
                  {[
                    { color: "#16a34a", label: "≥75% approved" },
                    { color: "#d97706", label: "50–74%" },
                    { color: "#dc2626", label: "<50%" },
                    { color: "#94a3b8", label: "No data" },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                      <span className="text-slate-600">{l.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-brand-700 flex-shrink-0 opacity-80" />
                    <span className="text-slate-600">High activity</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-brand-500 flex-shrink-0 opacity-80" />
                    <span className="text-slate-600">Medium</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0" />
                    <span className="text-slate-600">Low / none</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div ref={mapRef} className="w-full h-full" style={{ background: "#f8fafc" }} />
        </div>

        {/* District panel */}
        <div className="w-72 flex flex-col gap-3 overflow-hidden">
          {selectedDistrict ? (
            <div className="card p-4 flex-shrink-0 animate-fade-in">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-slate-900 text-lg font-display">{selectedDistrict.district}</p>
                  <p className="text-xs text-slate-500">{selectedDistrict.division} Division</p>
                </div>
                <button onClick={() => setSelectedDistrict(null)}
                  className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { label: "Beneficiaries", value: selectedDistrict.beneficiaries, color: "text-brand-700" },
                  { label: "Projects", value: selectedDistrict.projects, color: "text-blue-700" },
                  { label: "Approved", value: selectedDistrict.approved, color: "text-green-700" },
                  { label: "Pending", value: selectedDistrict.pending, color: "text-amber-700" },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-lg p-2.5 text-center">
                    <p className={`text-xl font-bold font-display ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>
              {selectedDistrict.beneficiaries > 0 && (
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Approval rate</span>
                    <span className="font-semibold text-slate-700">
                      {Math.round((selectedDistrict.approved / selectedDistrict.beneficiaries) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-600 rounded-full"
                      style={{ width: `${Math.min((selectedDistrict.approved / selectedDistrict.beneficiaries) * 100, 100)}%` }} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-4 flex-shrink-0 border-dashed text-center">
              <MapPin className="w-6 h-6 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">Click a district</p>
              <p className="text-xs text-slate-300 mt-0.5">to see its details</p>
            </div>
          )}

          {/* District leaderboard */}
          <div className="card overflow-hidden flex-1 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">All Districts</p>
              <p className="text-xs text-slate-400">ranked by {activeLayer}</p>
            </div>
            <div className="overflow-y-auto flex-1">
              {JK_DISTRICTS
                .map(d => ({ ...d, stats: districtStats[d.name] }))
                .sort((a, b) => {
                  if (activeLayer === "beneficiaries") return b.stats.beneficiaries - a.stats.beneficiaries;
                  if (activeLayer === "projects") return b.stats.projects - a.stats.projects;
                  const rateA = a.stats.beneficiaries > 0 ? (a.stats.approved / a.stats.beneficiaries) : 0;
                  const rateB = b.stats.beneficiaries > 0 ? (b.stats.approved / b.stats.beneficiaries) : 0;
                  return rateB - rateA;
                })
                .map((d, i) => {
                  const value = activeLayer === "beneficiaries" ? d.stats.beneficiaries
                    : activeLayer === "projects" ? d.stats.projects
                    : d.stats.beneficiaries > 0 ? Math.round((d.stats.approved / d.stats.beneficiaries) * 100) : 0;
                  const suffix = activeLayer === "performance" ? "%" : "";
                  const hasData = d.stats.beneficiaries > 0 || d.stats.projects > 0;
                  return (
                    <button key={d.name}
                      onClick={() => setSelectedDistrict({ ...d.stats, lat: d.lat, lng: d.lng, division: d.division })}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-colors text-left",
                        selectedDistrict?.district === d.name && "bg-brand-50"
                      )}>
                      <span className="text-[10px] text-slate-400 w-4 flex-shrink-0 font-mono">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{d.name}</p>
                        <p className="text-[10px] text-slate-400">{d.division}</p>
                      </div>
                      {!hasData ? (
                        <span className="text-[10px] text-slate-300">No data</span>
                      ) : (
                        <span className={cn("text-sm font-bold font-display",
                          activeLayer === "performance"
                            ? value >= 75 ? "text-green-700" : value >= 50 ? "text-amber-600" : "text-red-600"
                            : "text-brand-700"
                        )}>
                          {value}{suffix}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
