import { useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Position,
  Handle,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Clan, Participant } from "@/db/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_W = 160;
const NODE_H = 56;

const ROLE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  head:     { bg: "#fef3c7", border: "#d97706", text: "#92400e" },
  ancestor: { bg: "#ede9fe", border: "#7c3aed", text: "#4c1d95" },
  member:   { bg: "#ffffff", border: "#cbd5e1", text: "#1e293b" },
};

const ROLE_LABELS: Record<string, string> = {
  head: "Kepala", ancestor: "Leluhur", member: "Anggota",
};

// ─── Person node ──────────────────────────────────────────────────────────────

function PersonNode({ data }: {
  data: { name: string; role: string; label: string; gender?: string };
}) {
  const colors = ROLE_COLORS[data.role] ?? ROLE_COLORS.member;
  const genderIcon = data.gender === "male" ? "♂" : data.gender === "female" ? "♀" : "";
  return (
    <div style={{
      width: NODE_W, minHeight: NODE_H,
      background: colors.bg, border: `1.5px solid ${colors.border}`,
      borderRadius: 10, padding: "8px 12px",
      display: "flex", flexDirection: "column", justifyContent: "center",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    }}>
      <Handle type="target" position={Position.Top}
        style={{ background: "#94a3b8", width: 8, height: 8 }} />
      <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {data.name}
        </span>
        {genderIcon && (
          <span style={{ color: data.gender === "male" ? "#3b82f6" : "#ec4899", fontSize: 11, flexShrink: 0 }}>
            {genderIcon}
          </span>
        )}
      </div>
      <div style={{ fontSize: 10, color: colors.text, marginTop: 2 }}>{data.label}</div>
      <Handle type="source" position={Position.Bottom}
        style={{ background: "#94a3b8", width: 8, height: 8 }} />
    </div>
  );
}

// ─── Couple node (pink dot connector between spouses) ─────────────────────────

function CoupleNode() {
  return (
    <div style={{
      width: 12, height: 12,
      borderRadius: "50%",
      background: "#ec4899",
      border: "2px solid white",
      boxShadow: "0 0 0 1.5px #ec4899",
    }}>
      <Handle type="target" position={Position.Left}
        style={{ background: "transparent", border: "none", width: 6, height: 6 }} />
      <Handle type="target" position={Position.Right} id="right"
        style={{ background: "transparent", border: "none", width: 6, height: 6 }} />
      <Handle type="source" position={Position.Bottom}
        style={{ background: "#ec4899", width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes = { person: PersonNode, couple: CoupleNode };

// ─── Graph builder ────────────────────────────────────────────────────────────

export function buildFlowGraph(
  participants: Participant[],
  participantById: Record<string, Participant>
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Collect canonical spouse pairs
  const spousePairs = new Map<string, { a: string; b: string }>();
  for (const p of participants) {
    for (const r of (p.relations ?? [])) {
      if (r.type === "spouse" && participantById[r.participantId]) {
        const key = [p.id, r.participantId].sort().join("--");
        if (!spousePairs.has(key)) spousePairs.set(key, { a: p.id, b: r.participantId });
      }
    }
  }

  function getCoupleKey(fatherIds: string[], motherIds: string[]): string | null {
    for (const [key, pair] of spousePairs) {
      const hasA = fatherIds.includes(pair.a) || motherIds.includes(pair.a);
      const hasB = fatherIds.includes(pair.b) || motherIds.includes(pair.b);
      if (hasA && hasB) return key;
    }
    return null;
  }

  // Dagre layout
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({ rankdir: "TB", ranksep: 80, nodesep: 40, edgesep: 10 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const p of participants) g.setNode(p.id, { width: NODE_W, height: NODE_H });
  for (const [key] of spousePairs) g.setNode(`couple-${key}`, { width: 12, height: 12 });

  let idx = 0;
  for (const [key, pair] of spousePairs) {
    g.setEdge(pair.a, `couple-${key}`, {}, `sp-a-${idx}`);
    g.setEdge(pair.b, `couple-${key}`, {}, `sp-b-${idx++}`);
  }

  for (const p of participants) {
    const fIds = (p.relations ?? []).filter((r) => r.type === "father" && participantById[r.participantId]).map((r) => r.participantId);
    const mIds = (p.relations ?? []).filter((r) => r.type === "mother" && participantById[r.participantId]).map((r) => r.participantId);
    const ck = getCoupleKey(fIds, mIds);
    if (ck) {
      g.setEdge(`couple-${ck}`, p.id, {}, `ch-${idx++}`);
    } else {
      for (const fid of fIds) g.setEdge(fid, p.id, {}, `f-${idx++}`);
      for (const mid of mIds) g.setEdge(mid, p.id, {}, `m-${idx++}`);
    }
  }

  dagre.layout(g);

  // Emit person nodes
  for (const p of participants) {
    const n = g.node(p.id);
    nodes.push({
      id: p.id, type: "person",
      position: { x: n.x - NODE_W / 2, y: n.y - NODE_H / 2 },
      data: { name: p.name, role: p.role, label: ROLE_LABELS[p.role] ?? "Anggota", gender: p.gender },
    });
  }

  // Emit couple nodes
  for (const [key] of spousePairs) {
    const n = g.node(`couple-${key}`);
    nodes.push({ id: `couple-${key}`, type: "couple", position: { x: n.x - 6, y: n.y - 6 }, data: {} });
  }

  // Emit edges
  for (const [key, pair] of spousePairs) {
    const cid = `couple-${key}`;
    edges.push({ id: `e-sp-a-${key}`, source: pair.a, target: cid, type: "straight", style: { stroke: "#f9a8d4", strokeWidth: 2, strokeDasharray: "5 3" }, zIndex: 1 });
    edges.push({ id: `e-sp-b-${key}`, source: pair.b, target: cid, targetHandle: "right", type: "straight", style: { stroke: "#f9a8d4", strokeWidth: 2, strokeDasharray: "5 3" }, zIndex: 1 });

    for (const p of participants) {
      const fIds = (p.relations ?? []).filter((r) => r.type === "father" && participantById[r.participantId]).map((r) => r.participantId);
      const mIds = (p.relations ?? []).filter((r) => r.type === "mother" && participantById[r.participantId]).map((r) => r.participantId);
      if (getCoupleKey(fIds, mIds) === key) {
        edges.push({ id: `e-ch-${key}-${p.id}`, source: cid, target: p.id, type: "smoothstep", style: { stroke: "#94a3b8", strokeWidth: 1.5 }, zIndex: 0 });
      }
    }
  }

  // Single-parent edges
  for (const p of participants) {
    const fIds = (p.relations ?? []).filter((r) => r.type === "father" && participantById[r.participantId]).map((r) => r.participantId);
    const mIds = (p.relations ?? []).filter((r) => r.type === "mother" && participantById[r.participantId]).map((r) => r.participantId);
    if (getCoupleKey(fIds, mIds) === null) {
      for (const fid of fIds) edges.push({ id: `e-f-${fid}-${p.id}`, source: fid, target: p.id, type: "smoothstep", style: { stroke: "#94a3b8", strokeWidth: 1.5 } });
      for (const mid of mIds) edges.push({ id: `e-m-${mid}-${p.id}`, source: mid, target: p.id, type: "smoothstep", style: { stroke: "#a78bfa", strokeWidth: 1.5 } });
    }
  }

  return { nodes, edges };
}

// ─── Inner flow canvas ────────────────────────────────────────────────────────

function FamilyFlowInner({ participants, participantById }: {
  participants: Participant[];
  participantById: Record<string, Participant>;
}) {
  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => buildFlowGraph(participants, participantById),
    [participants, participantById]
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);

  // Re-sync when data changes (e.g. dialog opened before data loaded)
  useEffect(() => { setNodes(initNodes); }, [initNodes, setNodes]);
  useEffect(() => { setEdges(initEdges); }, [initEdges, setEdges]);

  return (
    <ReactFlow
      nodes={nodes} edges={edges}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView fitViewOptions={{ padding: 0.25, minZoom: 0.15 }}
      minZoom={0.1} maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} color="#e2e8f0" />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={(n) => ROLE_COLORS[(n.data as any).role ?? "member"]?.border ?? "#ec4899"}
        pannable zoomable
      />
    </ReactFlow>
  );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

export function FamilyGraphDialog({
  open, onOpenChange, clan, participants, participantById,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clan: Clan;
  participants: Participant[];
  participantById: Record<string, Participant>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="full" className="h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle>Pohon Keluarga — {clan.name}</DialogTitle>
          <DialogDescription>
            Geser untuk menjelajahi, scroll untuk zoom.
          </DialogDescription>
        </DialogHeader>

        {participants.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Belum ada anggota terdaftar.
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            <ReactFlowProvider>
              <FamilyFlowInner participants={participants} participantById={participantById} />
            </ReactFlowProvider>
          </div>
        )}

        <div className="px-5 py-3 border-t shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 border-t-2 border-dashed border-pink-300" />
              Pasangan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-pink-400" />
              Titik pasangan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 border-t-2 border-slate-400" />
              Orang tua → anak
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Tutup</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
