"use client";

import "@xyflow/react/dist/style.css";
import { findFlowIssues, type BusinessHours, type FlowDefinition } from "@workflow-agent/core/flow-definition";
import {
  Background,
  Controls,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  publishAction,
  renameFlowAction,
  saveDraftAction,
  setMainFlowAction,
} from "../../app/(panel)/flows/actions.ts";
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
import { StepNode, type StepNodeType } from "./StepNode.tsx";
import { Simulator } from "./Simulator.tsx";
import { StepPanel } from "./StepPanel.tsx";
import styles from "./editor.module.css";

const NODE_TYPES = { step: StepNode };
const EDGE_SEPARATOR = "::";

type Props = {
  flowId: string;
  initialName: string;
  initialDraft: FlowDefinition;
  initialPublishedVersion: number | null;
  initialIsMain: boolean;
  businessHours: BusinessHours | null;
};

type Status = { kind: "idle" | "saved" | "error"; text: string };

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
  const [publishedVersion, setPublishedVersion] = useState(initialPublishedVersion);
  const [isMain, setIsMain] = useState(initialIsMain);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
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

  const nodes: StepNodeType[] = useMemo(
    () =>
      Object.entries(draft.steps).map(([id, step], index) => ({
        id,
        type: "step",
        position: draft.positions?.[id] ?? { x: 80 + (index % 3) * 320, y: 80 + Math.floor(index / 3) * 240 },
        data: { step, isStart: id === draft.startStepId, hasIssue: stepsWithIssues.has(id) },
        selected: id === selectedId,
      })),
    [draft, selectedId, stepsWithIssues],
  );

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
    [draft],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<StepNodeType>[]) => {
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          const position = change.position;
          edit((current) => moveStep(current, change.id, position));
        }
        if (change.type === "remove") {
          edit((current) => removeStep(current, change.id));
          setSelectedId((current) => (current === change.id ? null : current));
        }
        if (change.type === "select") {
          setSelectedId((current) => (change.selected ? change.id : current === change.id ? null : current));
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
    // New steps appear in the middle of what the user is looking at, nudged so
    // several additions in a row don't stack exactly on top of each other.
    const bounds = canvasRef.current?.getBoundingClientRect();
    const center = bounds && flow
      ? flow.screenToFlowPosition({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 })
      : { x: 120, y: 120 };
    // Move right (then down) until the new step doesn't cover an existing one.
    const overlaps = (x: number, y: number) =>
      nodes.some((node) => Math.abs(node.position.x - x) < 270 && Math.abs(node.position.y - y) < 170);
    let position = { x: center.x - 110, y: center.y - 60 };
    for (let attempt = 0; attempt < 12 && overlaps(position.x, position.y); attempt++) {
      position = attempt % 3 === 2 ? { x: center.x - 110, y: position.y + 190 } : { x: position.x + 290, y: position.y };
    }
    const result = addStep(draft, type, position);
    // Pan to the new step so it is always in view, keeping the current zoom.
    requestAnimationFrame(() =>
      flow?.setCenter(position.x + 120, position.y + 60, { zoom: flow.getZoom(), duration: 300 }),
    );
    edit(() => result.definition);
    setSelectedId(result.id);
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
    if (name.trim() === initialName) return;
    startTransition(async () => {
      const result = await renameFlowAction(flowId, name);
      setStatus(result.ok ? { kind: "saved", text: "Nombre guardado" } : { kind: "error", text: result.error });
    });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const selectedStep = selectedId ? draft.steps[selectedId] : undefined;

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        <Link href="/flows" className="muted" aria-label="Volver a Flujos">
          ← Flujos
        </Link>
        <input
          className={styles.nameInput}
          value={name}
          maxLength={80}
          aria-label="Nombre del Flujo"
          onChange={(event) => setName(event.target.value)}
          onBlur={rename}
        />
        <span className="muted">
          {publishedVersion ? `Publicado · v${publishedVersion}` : "Sin publicar"}
          {isMain && " · Principal"}
        </span>
        <div className="spacer" />
        <span className={status.kind === "error" ? styles.statusError : "muted"} aria-live="polite">
          {dirty ? "Cambios sin guardar" : status.text}
        </span>
        <button type="button" onClick={() => setShowSimulator((open) => !open)} aria-pressed={showSimulator}>
          {showSimulator ? "Cerrar simulador" : "Probar"}
        </button>
        <button type="button" onClick={save} disabled={pending || !dirty}>
          Guardar borrador
        </button>
        {!isMain && (
          <button type="button" onClick={makeMain} disabled={pending || !publishedVersion}>
            Usar como principal
          </button>
        )}
        <button type="button" className="primary" onClick={publish} disabled={pending || issues.length > 0}>
          Publicar
        </button>
      </div>

      <div className={styles.workspace}>
        <div className={styles.canvasColumn}>
          <div className={styles.addBar}>
            <span className="muted">Agregar paso:</span>
            {(Object.keys(STEP_LABELS) as StepType[]).map((type) => (
              <button key={type} type="button" onClick={() => add(type)}>
                + {STEP_LABELS[type]}
              </button>
            ))}
          </div>
          <div className={styles.canvas} ref={canvasRef}>
            {mounted && (
            <ReactFlow
              onInit={setFlow}
              nodes={nodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onPaneClick={() => setSelectedId(null)}
              deleteKeyCode={["Backspace", "Delete"]}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              colorMode="system"
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={20} />
              <Controls showInteractive={false} />
            </ReactFlow>
            )}
          </div>
          {issues.length > 0 && (
            <div className={styles.issues} role="status">
              <strong>Antes de publicar, corrige:</strong>
              <ul>
                {issues.map((issue, index) => (
                  <li key={index}>
                    {"stepId" in issue ? (
                      <button type="button" className={styles.issueLink} onClick={() => setSelectedId(issue.stepId)}>
                        {describeIssue(issue, draft)}
                      </button>
                    ) : (
                      describeIssue(issue, draft)
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {showSimulator ? (
          <Simulator
            draft={draft}
            hasIssues={issues.length > 0}
            businessHours={businessHours}
            onClose={() => setShowSimulator(false)}
          />
        ) : selectedId && selectedStep ? (
          <StepPanel
            key={selectedId}
            stepId={selectedId}
            step={selectedStep}
            isStart={selectedId === draft.startStepId}
            onChange={(step) => edit((current) => updateStep(current, selectedId, step))}
            onMakeStart={() => edit((current) => ({ ...current, startStepId: selectedId }))}
            onDelete={() => {
              edit((current) => removeStep(current, selectedId));
              setSelectedId(null);
            }}
          />
        ) : (
          <aside className={styles.panel}>
            <h2 style={{ margin: 0 }}>Cómo editar</h2>
            <ul className={styles.help}>
              <li>Haz clic en un paso para editar su texto u opciones.</li>
              <li>Arrastra desde el punto derecho de un paso (o de una opción) hasta otro paso para conectarlos.</li>
              <li>Selecciona una conexión o un paso y presiona Suprimir para borrarlo.</li>
              <li>Guarda con Ctrl + S. Los clientes solo ven la versión publicada.</li>
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}
