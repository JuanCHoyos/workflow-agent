"use client";

import "@xyflow/react/dist/style.css";
import { findFlowIssues, type BusinessHours, type FlowDefinition } from "@workflow-agent/core/flow-definition";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Diamond,
  HelpCircle,
  ListChecks,
  MessageSquare,
  MessagesSquare,
  Plus,
  Save,
  Square,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  publishAction,
  renameFlowAction,
  saveDraftAction,
  setMainFlowAction,
} from "../../app/(panel)/flows/actions.ts";
import { Sheet } from "../ui/Sheet.tsx";
import {
  STEP_LABELS,
  addStep,
  connectionsOf,
  describeIssue,
  moveStep,
  removeStep,
  setTarget,
  updateStep,
  type SourceHandle,
  type StepType,
} from "./model.ts";
import { Simulator } from "./Simulator.tsx";
import { StepNode, type StepNodeType } from "./StepNode.tsx";
import { StepPanel } from "./StepPanel.tsx";
import styles from "./editor.module.css";

const NODE_TYPES = { step: StepNode };
const EDGE_SEPARATOR = "::";

const STEP_ICONS: Record<StepType, typeof MessageSquare> = {
  message: MessageSquare,
  optionsMenu: ListChecks,
  question: HelpCircle,
  condition: Diamond,
  end: Square,
};

const STEP_HINTS: Record<StepType, string> = {
  message: "Envía un texto",
  optionsMenu: "Botones o lista para elegir",
  question: "Guarda la respuesta del cliente",
  condition: "Sigue un camino según una regla",
  end: "Termina la conversación",
};

type Props = {
  flowId: string;
  initialName: string;
  initialDraft: FlowDefinition;
  initialPublishedVersion: number | null;
  initialIsMain: boolean;
  businessHours: BusinessHours | null;
};

type Status = { kind: "idle" | "saved" | "error"; text: string };
type Side = "step" | "simulator" | null;

function defaultPosition(index: number) {
  return { x: 80 + (index % 3) * 320, y: 80 + Math.floor(index / 3) * 240 };
}

export function FlowEditor({
  flowId,
  initialName,
  initialDraft,
  initialPublishedVersion,
  initialIsMain,
  businessHours,
}: Props) {
  const [draft, setDraft] = useState<FlowDefinition>(initialDraft);
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [publishedVersion, setPublishedVersion] = useState(initialPublishedVersion);
  const [isMain, setIsMain] = useState(initialIsMain);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [side, setSide] = useState<Side>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle", text: "" });
  const [pending, startTransition] = useTransition();
  const [flow, setFlow] = useState<ReactFlowInstance<StepNodeType> | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  // The canvas depends on the browser's color scheme, so it renders client-side only.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const issues = useMemo(() => findFlowIssues(draft), [draft]);
  const stepsWithIssues = useMemo(
    () => new Set(issues.flatMap((issue) => ("stepId" in issue ? [issue.stepId] : []))),
    [issues],
  );

  const edit = useCallback((change: (current: FlowDefinition) => FlowDefinition) => {
    setDraft((current) => change(current));
    setDirty(true);
    setStatus({ kind: "idle", text: "" });
  }, []);

  /*
   * React Flow owns its node objects (they carry measured sizes). Rebuilding
   * them from the draft on every drag frame made React Flow re-measure and hide
   * nodes mid-drag. Now nodes live in their own state: dragging only moves
   * them, and the draft learns the new position when the drag ends.
   */
  const [nodes, setNodes] = useState<StepNodeType[]>(() =>
    Object.entries(initialDraft.steps).map(([id, step], index) => ({
      id,
      type: "step",
      position: initialDraft.positions?.[id] ?? defaultPosition(index),
      data: { step, isStart: id === initialDraft.startStepId, hasIssue: false },
    })),
  );

  useEffect(() => {
    setNodes((current) => {
      const byId = new Map(current.map((node) => [node.id, node]));
      return Object.entries(draft.steps).map(([id, step], index) => {
        const existing = byId.get(id);
        const data = {
          step,
          isStart: id === draft.startStepId,
          hasIssue: stepsWithIssues.has(id),
          isActive: side === "simulator" && id === activeStepId,
        };
        return existing
          ? { ...existing, data, selected: id === selectedId }
          : {
              id,
              type: "step" as const,
              position: draft.positions?.[id] ?? defaultPosition(index),
              data,
              selected: id === selectedId,
            };
      });
    });
  }, [draft.steps, draft.startStepId, draft.positions, stepsWithIssues, selectedId, side, activeStepId]);

  // A docked panel narrows the canvas: keep the selected step (or the whole Flow) in view.
  useEffect(() => {
    if (!flow) return;
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const selected = side === "step" && selectedIdRef.current ? flow.getNode(selectedIdRef.current) : undefined;
        if (selected) {
          flow.setCenter(selected.position.x + 124, selected.position.y + 60, { zoom: flow.getZoom(), duration: 300 });
        } else {
          flow.fitView({ padding: 0.3, maxZoom: 1, duration: 300 });
        }
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [side, flow]);

  const edges: Edge[] = useMemo(
    () =>
      Object.entries(draft.steps).flatMap(([id, step]) =>
        connectionsOf(step)
          .filter(({ target }) => draft.steps[target])
          .map(({ handle, target }) => ({
            id: `${id}${EDGE_SEPARATOR}${handle}`,
            source: id,
            sourceHandle: handle,
            target,
          })),
      ),
    [draft.steps],
  );

  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    setSide((current) => (id ? "step" : current === "step" ? null : current));
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange<StepNodeType>[]) => {
      setNodes((current) => applyNodeChanges(changes, current));
      for (const change of changes) {
        if (change.type === "position" && change.position && change.dragging === false) {
          const position = change.position;
          edit((current) => moveStep(current, change.id, position));
        }
        if (change.type === "remove") {
          edit((current) => removeStep(current, change.id));
          setSelectedId((current) => (current === change.id ? null : current));
        }
      }
    },
    [edit],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type !== "remove") continue;
        const [source, handle] = change.id.split(EDGE_SEPARATOR) as [string, SourceHandle];
        edit((current) => setTarget(current, source, handle, ""));
      }
    },
    [edit],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.sourceHandle || connection.source === connection.target) return;
      edit((current) =>
        setTarget(current, connection.source, connection.sourceHandle as SourceHandle, connection.target),
      );
    },
    [edit],
  );

  const add = (type: StepType) => {
    setAddOpen(false);
    const bounds = canvasRef.current?.getBoundingClientRect();
    const center =
      bounds && flow
        ? flow.screenToFlowPosition({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 })
        : { x: 120, y: 120 };
    // Move right (then down) until the new step doesn't cover an existing one.
    const overlaps = (x: number, y: number) =>
      nodes.some((node) => Math.abs(node.position.x - x) < 270 && Math.abs(node.position.y - y) < 170);
    let position = { x: center.x - 120, y: center.y - 60 };
    for (let attempt = 0; attempt < 12 && overlaps(position.x, position.y); attempt++) {
      position = attempt % 3 === 2 ? { x: center.x - 120, y: position.y + 190 } : { x: position.x + 290, y: position.y };
    }
    const result = addStep(draft, type, position);
    edit(() => result.definition);
    select(result.id);
    // Pan to the new step so it is always in view, keeping the current zoom.
    requestAnimationFrame(() =>
      flow?.setCenter(position.x + 120, position.y + 60, { zoom: flow.getZoom(), duration: 300 }),
    );
  };

  const save = useCallback(() => {
    startTransition(async () => {
      await saveDraftAction(flowId, draft);
      setDirty(false);
      setStatus({ kind: "saved", text: "Borrador guardado" });
    });
  }, [draft, flowId]);

  const publish = () => {
    startTransition(async () => {
      const result = await publishAction(flowId, draft);
      if (!result.ok) {
        setStatus({ kind: "error", text: result.error });
        return;
      }
      setDirty(false);
      setPublishedVersion(result.publishedVersion ?? null);
      setStatus({ kind: "saved", text: `Publicado como versión ${result.publishedVersion}` });
    });
  };

  const makeMain = () => {
    startTransition(async () => {
      await setMainFlowAction(flowId);
      setIsMain(true);
      setStatus({ kind: "saved", text: "Ahora es el Flujo principal" });
    });
  };

  const rename = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === savedName) {
      setName(savedName);
      return;
    }
    startTransition(async () => {
      const result = await renameFlowAction(flowId, trimmed);
      if (result.ok) {
        setSavedName(trimmed);
        setStatus({ kind: "saved", text: "Nombre guardado" });
      } else {
        setStatus({ kind: "error", text: result.error });
      }
    });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        save();
      }
      if (event.key === "Escape") {
        setAddOpen(false);
        setIssuesOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const selectedStep = selectedId ? draft.steps[selectedId] : undefined;
  const statusText = dirty ? "Cambios sin guardar" : status.text;

  return (
    <div className={styles.editor} data-side={side ?? undefined}>
      <header className={styles.toolbar}>
        <Link href="/flows" className="btn btn-ghost btn-icon btn-sm" aria-label="Volver a Flujos">
          <ArrowLeft />
        </Link>
        <div className={styles.titleBlock}>
          <input
            className={styles.nameInput}
            value={name}
            maxLength={80}
            aria-label="Nombre del Flujo"
            onChange={(event) => setName(event.target.value)}
            onBlur={rename}
            onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
          />
          <span className={styles.meta}>
            {isMain && <span className="badge badge-accent">Principal</span>}
            <span className={publishedVersion ? "badge badge-success" : "badge"}>
              {publishedVersion ? `Publicado · v${publishedVersion}` : "Sin publicar"}
            </span>
            <span
              className={status.kind === "error" && !dirty ? styles.statusError : styles.status}
              aria-live="polite"
            >
              {statusText}
            </span>
          </span>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className="btn btn-sm"
            aria-pressed={side === "simulator"}
            onClick={() => setSide((current) => (current === "simulator" ? null : "simulator"))}
          >
            <MessagesSquare aria-hidden="true" />
            <span className={styles.hideOnPhone}>Probar</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${styles.saveButton}`}
            onClick={save}
            disabled={pending || !dirty}
            aria-label={dirty ? "Guardar borrador (hay cambios sin guardar)" : "Guardar borrador"}
          >
            {dirty && <span className={styles.unsavedDot} aria-hidden="true" />}
            <span className={styles.hideOnPhone} aria-hidden="true">
              Guardar
            </span>
            <Save aria-hidden="true" className={styles.showOnPhone} />
          </button>
          {!isMain && publishedVersion && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={makeMain} disabled={pending}>
              <Star aria-hidden="true" />
              <span className={styles.hideOnPhone}>Hacer principal</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={publish}
            disabled={pending || issues.length > 0}
            aria-describedby={issues.length > 0 ? "publish-blocked" : undefined}
          >
            Publicar
          </button>
        </div>
      </header>

      <div className={styles.workspace}>
        <div
          className={styles.canvas}
          ref={canvasRef}
          // Steps are focusable with Tab; Enter or Space opens the focused step's panel.
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            const node = (event.target as HTMLElement).closest<HTMLElement>(".react-flow__node");
            const id = node?.dataset.id;
            if (!id) return;
            event.preventDefault();
            select(id);
          }}
        >
          {mounted && (
            <ReactFlow
              onInit={setFlow}
              nodes={nodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => select(node.id)}
              onPaneClick={() => select(null)}
              deleteKeyCode={["Backspace", "Delete"]}
              fitView
              fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
              minZoom={0.3}
              colorMode="system"
              defaultEdgeOptions={{ type: "smoothstep" }}
              connectionRadius={36}
              attributionPosition="top-right"
            >
              <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} />
              <Controls showInteractive={false} position="bottom-right" />
            </ReactFlow>
          )}

          {issues.length > 0 && (
            <div className={styles.issues}>
              <button
                type="button"
                className={styles.issuesPill}
                aria-expanded={issuesOpen}
                aria-controls="flow-issues"
                onClick={() => setIssuesOpen((open) => !open)}
              >
                <AlertTriangle aria-hidden="true" />
                {issues.length === 1 ? "1 problema" : `${issues.length} problemas`}
                <ChevronDown aria-hidden="true" data-open={issuesOpen || undefined} />
              </button>
              <span id="publish-blocked" className={styles.issuesHint}>
                Corrige los problemas para publicar
              </span>
              {issuesOpen && (
                <ul id="flow-issues" className={styles.issuesList}>
                  {issues.map((issue, index) => (
                    <li key={index}>
                      {"stepId" in issue ? (
                        <button
                          type="button"
                          onClick={() => {
                            select(issue.stepId);
                            setIssuesOpen(false);
                          }}
                        >
                          {describeIssue(issue, draft)}
                        </button>
                      ) : (
                        <span>{describeIssue(issue, draft)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className={styles.addWrap}>
            {addOpen && (
              <>
                <div className={styles.addScrim} onClick={() => setAddOpen(false)} aria-hidden="true" />
                <ul className={styles.addMenu} role="menu" aria-label="Agregar paso">
                  {(Object.keys(STEP_LABELS) as StepType[]).map((type) => {
                    const Icon = STEP_ICONS[type];
                    return (
                      <li key={type} role="none">
                        <button type="button" role="menuitem" onClick={() => add(type)} data-step={type}>
                          <Icon aria-hidden="true" />
                          <span>
                            <strong>{STEP_LABELS[type]}</strong>
                            <span>{STEP_HINTS[type]}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <button
              type="button"
              className={`btn btn-primary ${styles.addButton}`}
              aria-expanded={addOpen}
              aria-haspopup="menu"
              onClick={() => setAddOpen((open) => !open)}
            >
              <Plus aria-hidden="true" />
              Agregar paso
            </button>
          </div>

          {Object.keys(draft.steps).length === 0 && (
            <div className={styles.emptyCanvas}>
              <p>Este Flujo está vacío. Empieza con el saludo que recibe cada cliente.</p>
              <button type="button" className="btn btn-primary" onClick={() => add("message")}>
                <Plus aria-hidden="true" />
                Agregar el primer Mensaje
              </button>
            </div>
          )}
        </div>

        <Sheet
          open={side === "simulator"}
          title="Simulador"
          onClose={() => setSide(null)}
          label="Simulador del Flujo"
        >
          <Simulator
            draft={draft}
            hasIssues={issues.length > 0}
            businessHours={businessHours}
            onActiveStepChange={setActiveStepId}
          />
        </Sheet>

        <Sheet
          open={side === "step" && Boolean(selectedStep)}
          title={selectedStep ? STEP_LABELS[selectedStep.type] : "Paso"}
          onClose={() => select(null)}
          label="Editar paso"
        >
          {selectedId && selectedStep && (
            <StepPanel
              key={selectedId}
              stepId={selectedId}
              step={selectedStep}
              isStart={selectedId === draft.startStepId}
              steps={draft.steps}
              onChange={(step) => edit((current) => updateStep(current, selectedId, step))}
              onSetTarget={(handle, target) => edit((current) => setTarget(current, selectedId, handle, target))}
              onMakeStart={() => edit((current) => ({ ...current, startStepId: selectedId }))}
              onDelete={() => {
                edit((current) => removeStep(current, selectedId));
                select(null);
              }}
            />
          )}
        </Sheet>
      </div>
    </div>
  );
}
