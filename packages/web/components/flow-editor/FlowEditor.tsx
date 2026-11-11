"use client";

import "@xyflow/react/dist/style.css";
import { findFlowIssues, type BusinessHours, type FlowDefinition } from "@workflow-agent/core/flow-definition";
import {
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  MiniMap,
  ReactFlow,
  SelectionMode,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type FinalConnectionState,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import {
  AlertTriangle,
  ArrowLeft,
  BoxSelect,
  ChevronDown,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Diamond,
  Flag,
  Grid3x3,
  HelpCircle,
  Keyboard,
  ListChecks,
  Map as MapIcon,
  MessageSquare,
  MessagesSquare,
  Pencil,
  Plus,
  Redo2,
  Save,
  Scissors,
  Square,
  SquareDashedMousePointer,
  Star,
  Trash2,
  Undo2,
  Wand2,
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
import { CanvasMenu, type MenuItem } from "./CanvasMenu.tsx";
import { readClipboard, writeClipboard } from "./clipboard.ts";
import { DeletableEdge } from "./DeletableEdge.tsx";
import { EditorActionsContext, type EditorActions } from "./EditorActions.tsx";
import { autoLayout } from "./layout.ts";
import {
  STEP_LABELS,
  addStep,
  alignSteps,
  connectionsOf,
  copySteps,
  describeIssue,
  distributeSteps,
  pasteSteps,
  removeSteps,
  setTarget,
  updateStep,
  type SourceHandle,
  type StepType,
} from "./model.ts";
import { SelectionBar } from "./SelectionBar.tsx";
import { ShortcutsDialog } from "./ShortcutsDialog.tsx";
import { Simulator } from "./Simulator.tsx";
import { StepNode, type StepNodeType } from "./StepNode.tsx";
import { StepPanel } from "./StepPanel.tsx";
import { StepSearch } from "./StepSearch.tsx";
import { useFlowHistory } from "./useFlowHistory.ts";
import styles from "./editor.module.css";

const NODE_TYPES = { step: StepNode };
const EDGE_TYPES = { deletable: DeletableEdge };
const EDGE_SEPARATOR = "::";
const AUTOSAVE_DELAY_MS = 1500;
const PASTE_OFFSET = 40;

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

const STEP_COLORS: Record<StepType, string> = {
  message: "var(--step-message)",
  optionsMenu: "var(--step-menu)",
  question: "var(--step-question)",
  condition: "var(--step-condition)",
  end: "var(--step-end)",
};

type Props = {
  flowId: string;
  initialName: string;
  initialDraft: FlowDefinition;
  initialPublishedVersion: number | null;
  initialIsMain: boolean;
  businessHours: BusinessHours | null;
};

type Status = { kind: "idle" | "saving" | "saved" | "error"; text: string };
type Side = "step" | "simulator" | null;
type OpenMenu = { at: { x: number; y: number }; label: string; items: MenuItem[] } | null;

function defaultPosition(index: number) {
  return { x: 80 + (index % 3) * 320, y: 80 + Math.floor(index / 3) * 240 };
}

/** True when the keyboard event is aimed at a text field, where editor shortcuts must not fire. */
function isTyping(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  return Boolean(target?.closest("input, textarea, select, [contenteditable='true']"));
}

export function FlowEditor({
  flowId,
  initialName,
  initialDraft,
  initialPublishedVersion,
  initialIsMain,
  businessHours,
}: Props) {
  const { draft, edit, undo, redo, canUndo, canRedo } = useFlowHistory(initialDraft);
  const [savedDraft, setSavedDraft] = useState<FlowDefinition>(initialDraft);
  const dirty = draft !== savedDraft;
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [publishedVersion, setPublishedVersion] = useState(initialPublishedVersion);
  const [isMain, setIsMain] = useState(initialIsMain);
  const [panelStepId, setPanelStepId] = useState<string | null>(null);
  const [side, setSide] = useState<Side>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [menu, setMenu] = useState<OpenMenu>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle", text: "" });
  const [pending, startTransition] = useTransition();
  const [flow, setFlow] = useState<ReactFlowInstance<StepNodeType> | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [snap, setSnap] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const pasteCount = useRef(0);
  // The canvas depends on the browser's color scheme, so it renders client-side only.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const issues = useMemo(() => findFlowIssues(draft), [draft]);
  const stepsWithIssues = useMemo(
    () => new Set(issues.flatMap((issue) => ("stepId" in issue ? [issue.stepId] : []))),
    [issues],
  );

  /*
   * React Flow owns its node objects (they carry measured sizes and the
   * selection). Dragging only moves them; the draft learns positions when a
   * drag ends, so undo/redo can move steps back.
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
        const saved = draft.positions?.[id];
        if (!existing) return { id, type: "step" as const, position: saved ?? defaultPosition(index), data };
        const position = existing.dragging || !saved ? existing.position : saved;
        return { ...existing, position, data };
      });
    });
  }, [draft.steps, draft.startStepId, draft.positions, stepsWithIssues, side, activeStepId]);

  const selectedIds = useMemo(() => nodes.filter((node) => node.selected).map((node) => node.id), [nodes]);
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  // Connections come from the draft; only their selection lives here.
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<ReadonlySet<string>>(() => new Set());

  const edges: Edge[] = useMemo(
    () =>
      Object.entries(draft.steps).flatMap(([id, step]) =>
        connectionsOf(step)
          .filter(({ target }) => draft.steps[target])
          .map(({ handle, target }) => {
            const edgeId = `${id}${EDGE_SEPARATOR}${handle}`;
            return {
              id: edgeId,
              source: id,
              sourceHandle: handle,
              target,
              type: "deletable",
              selected: selectedEdgeIds.has(edgeId),
            };
          }),
      ),
    [draft.steps, selectedEdgeIds],
  );

  /** Replaces the selection with exactly these steps. */
  const selectOnly = useCallback((ids: string[]) => {
    const chosen = new Set(ids);
    setNodes((current) => current.map((node) => ({ ...node, selected: chosen.has(node.id) })));
  }, []);

  const openStep = useCallback(
    (id: string) => {
      selectOnly([id]);
      setPanelStepId(id);
      setSide("step");
    },
    [selectOnly],
  );

  const closePanel = useCallback(() => {
    setPanelStepId(null);
    setSide((current) => (current === "step" ? null : current));
  }, []);

  // Several selected steps: the single-step panel steps aside.
  useEffect(() => {
    if (selectedIds.length > 1 && side === "step") closePanel();
  }, [selectedIds.length, side, closePanel]);

  // A docked panel narrows the canvas: keep the open step (or the whole Flow) in view.
  useEffect(() => {
    if (!flow) return;
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const open = side === "step" && panelStepId ? flow.getNode(panelStepId) : undefined;
        if (open) {
          flow.setCenter(open.position.x + 124, open.position.y + 60, { zoom: flow.getZoom(), duration: 300 });
        } else {
          flow.fitView({ padding: 0.3, maxZoom: 1, duration: 300 });
        }
      }),
    );
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refit only when the panel changes
  }, [side, flow]);

  const centerOn = useCallback(
    (ids: string[]) => {
      if (!flow || ids.length === 0) return;
      requestAnimationFrame(() => flow.fitView({ nodes: ids.map((id) => ({ id })), padding: 0.6, maxZoom: 1, duration: 300 }));
    },
    [flow],
  );

  // ---------- Changes coming from the canvas ----------

  const onNodesChange = useCallback(
    (changes: NodeChange<StepNodeType>[]) => {
      setNodes((current) => applyNodeChanges(changes, current));
      const moved: Record<string, { x: number; y: number }> = {};
      const removed: string[] = [];
      for (const change of changes) {
        if (change.type === "position" && change.position && change.dragging === false) moved[change.id] = change.position;
        if (change.type === "remove") removed.push(change.id);
      }
      // One undo step per drag, however many steps moved together.
      if (Object.keys(moved).length > 0) {
        edit((current) => ({ ...current, positions: { ...current.positions, ...moved } }));
      }
      if (removed.length > 0) {
        edit((current) => removeSteps(current, removed), "remove");
        setPanelStepId((current) => (current && removed.includes(current) ? null : current));
      }
    },
    [edit],
  );

  const disconnect = useCallback(
    (source: string, handle: string) => edit((current) => setTarget(current, source, handle as SourceHandle, "")),
    [edit],
  );

  const removeEdges = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      edit((current) =>
        ids.reduce((acc, edgeId) => {
          const [source, handle] = edgeId.split(EDGE_SEPARATOR) as [string, SourceHandle];
          return setTarget(acc, source, handle, "");
        }, current),
      );
      setSelectedEdgeIds(new Set());
    },
    [edit],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const selections = changes.filter((change) => change.type === "select");
      if (selections.length > 0) {
        setSelectedEdgeIds((current) => {
          const next = new Set(current);
          for (const change of selections) {
            if (change.selected) next.add(change.id);
            else next.delete(change.id);
          }
          return next;
        });
      }
      removeEdges(changes.filter((change) => change.type === "remove").map((change) => change.id));
    },
    [removeEdges],
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

  // ---------- Adding steps ----------

  const viewportCenter = useCallback(() => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    return bounds && flow
      ? flow.screenToFlowPosition({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 })
      : { x: 120, y: 120 };
  }, [flow]);

  /**
   * Adds a step at `at` (flow coordinates) or in a free spot near the middle
   * of the view, optionally connected from a branch of another step.
   */
  const add = useCallback(
    (type: StepType, options: { at?: { x: number; y: number }; from?: { stepId: string; handle: SourceHandle } } = {}) => {
      setAddOpen(false);
      let position = options.at ?? { x: viewportCenter().x - 124, y: viewportCenter().y - 60 };
      if (!options.at) {
        // Move right (then down) until the new step doesn't cover an existing one.
        const overlaps = (x: number, y: number) =>
          nodes.some((node) => Math.abs(node.position.x - x) < 270 && Math.abs(node.position.y - y) < 170);
        const start = position;
        for (let attempt = 0; attempt < 12 && overlaps(position.x, position.y); attempt++) {
          position = attempt % 3 === 2 ? { x: start.x, y: position.y + 190 } : { x: position.x + 290, y: position.y };
        }
      }
      let newId = "";
      edit((current) => {
        const result = addStep(current, type, position);
        newId = result.id;
        return options.from
          ? setTarget(result.definition, options.from.stepId, options.from.handle, result.id)
          : result.definition;
      });
      requestAnimationFrame(() => {
        if (newId) openStep(newId);
        flow?.setCenter(position.x + 124, position.y + 60, { zoom: flow.getZoom(), duration: 300 });
      });
    },
    [edit, flow, nodes, openStep, viewportCenter],
  );

  const addMenuItems = useCallback(
    (onPick: (type: StepType) => void): MenuItem[] =>
      (Object.keys(STEP_LABELS) as StepType[]).map((type) => ({
        label: STEP_LABELS[type],
        hint: STEP_HINTS[type],
        icon: STEP_ICONS[type],
        iconColor: STEP_COLORS[type],
        onSelect: () => onPick(type),
      })),
    [],
  );

  // Dropping a connection on empty canvas offers to create the next step there, already connected.
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      if (state.isValid || !state.fromNode || !state.fromHandle?.id || !flow) return;
      if (state.fromHandle.type !== "source") return;
      const point = "changedTouches" in event ? event.changedTouches[0]! : event;
      const at = flow.screenToFlowPosition({ x: point.clientX, y: point.clientY });
      const from = { stepId: state.fromNode.id, handle: state.fromHandle.id as SourceHandle };
      setMenu({
        at: { x: point.clientX, y: point.clientY },
        label: "Conectar a un paso nuevo",
        items: [
          { kind: "heading", label: "Conectar a un paso nuevo" },
          ...addMenuItems((type) => add(type, { at: { x: at.x, y: at.y - 40 }, from })),
        ],
      });
    },
    [add, addMenuItems, flow],
  );

  // ---------- Selection actions ----------

  const copy = useCallback(
    (ids = selectedIdsRef.current) => {
      if (ids.length === 0) return false;
      writeClipboard(copySteps(draft, ids));
      pasteCount.current = 0;
      setStatus({ kind: "idle", text: ids.length === 1 ? "Paso copiado" : `${ids.length} pasos copiados` });
      return true;
    },
    [draft],
  );

  const paste = useCallback(
    (at?: { x: number; y: number }) => {
      const clipboard = readClipboard();
      if (!clipboard || Object.keys(clipboard.steps).length === 0) return;
      let offset: { x: number; y: number };
      if (at) {
        const origin = Object.values(clipboard.positions).reduce(
          (min, p) => ({ x: Math.min(min.x, p.x), y: Math.min(min.y, p.y) }),
          { x: Infinity, y: Infinity },
        );
        offset = { x: at.x - origin.x, y: at.y - origin.y };
      } else {
        pasteCount.current += 1;
        offset = { x: PASTE_OFFSET * pasteCount.current, y: PASTE_OFFSET * pasteCount.current };
      }
      let pasted: string[] = [];
      edit((current) => {
        const result = pasteSteps(current, clipboard, offset);
        pasted = result.pastedIds;
        return result.definition;
      });
      requestAnimationFrame(() => {
        selectOnly(pasted);
        closePanel();
      });
    },
    [closePanel, edit, selectOnly],
  );

  const duplicateSteps = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      let pasted: string[] = [];
      edit((current) => {
        const result = pasteSteps(current, copySteps(current, ids), { x: PASTE_OFFSET, y: PASTE_OFFSET });
        pasted = result.pastedIds;
        return result.definition;
      });
      requestAnimationFrame(() => {
        selectOnly(pasted);
        if (pasted.length === 1) openStep(pasted[0]!);
        else closePanel();
      });
    },
    [closePanel, edit, openStep, selectOnly],
  );

  const removeStepsAction = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      edit((current) => removeSteps(current, ids));
      setPanelStepId((current) => (current && ids.includes(current) ? null : current));
      setSide((current) => (current === "step" ? null : current));
    },
    [edit],
  );

  const cut = useCallback(() => {
    const ids = selectedIdsRef.current;
    if (copy(ids)) removeStepsAction(ids);
  }, [copy, removeStepsAction]);

  const selectAll = useCallback(() => {
    selectOnly(Object.keys(draft.steps));
    closePanel();
  }, [closePanel, draft.steps, selectOnly]);

  const tidyUp = useCallback(() => {
    if (!flow) return;
    const sizes = Object.fromEntries(
      flow.getNodes().map((node) => [node.id, node.measured?.width && node.measured?.height ? { width: node.measured.width, height: node.measured.height } : undefined]),
    );
    edit((current) => ({ ...current, positions: autoLayout(current, sizes) }));
    requestAnimationFrame(() => requestAnimationFrame(() => flow.fitView({ padding: 0.25, maxZoom: 1, duration: 400 })));
  }, [edit, flow]);

  const makeStart = useCallback((id: string) => edit((current) => ({ ...current, startStepId: id })), [edit]);

  // ---------- Context menus ----------

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: StepNodeType) => {
      event.preventDefault();
      const ids = selectedIdsRef.current.includes(node.id) && selectedIdsRef.current.length > 1 ? selectedIdsRef.current : [node.id];
      if (ids.length === 1) selectOnly(ids);
      const many = ids.length > 1;
      setMenu({
        at: { x: event.clientX, y: event.clientY },
        label: many ? `${ids.length} pasos` : "Acciones del paso",
        items: [
          ...(!many
            ? [
                { label: "Editar", icon: Pencil, shortcut: "Enter", onSelect: () => openStep(node.id) },
                {
                  label: "Hacer paso inicial",
                  icon: Flag,
                  disabled: draft.startStepId === node.id,
                  onSelect: () => makeStart(node.id),
                },
                { kind: "separator" as const },
              ]
            : []),
          { label: "Duplicar", icon: CopyPlus, shortcut: "Ctrl D", onSelect: () => duplicateSteps(ids) },
          { label: "Copiar", icon: Copy, shortcut: "Ctrl C", onSelect: () => copy(ids) },
          {
            label: "Cortar",
            icon: Scissors,
            shortcut: "Ctrl X",
            onSelect: () => {
              if (copy(ids)) removeStepsAction(ids);
            },
          },
          { kind: "separator" },
          { label: many ? `Eliminar ${ids.length} pasos` : "Eliminar", icon: Trash2, danger: true, shortcut: "Supr", onSelect: () => removeStepsAction(ids) },
        ],
      });
    },
    [copy, draft.startStepId, duplicateSteps, makeStart, openStep, removeStepsAction, selectOnly],
  );

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      if (!flow) return;
      const at = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const hasClipboard = Boolean(readClipboard());
      setMenu({
        at: { x: event.clientX, y: event.clientY },
        label: "Lienzo",
        items: [
          { kind: "heading", label: "Agregar paso aquí" },
          ...addMenuItems((type) => add(type, { at })),
          { kind: "separator" },
          { label: "Pegar aquí", icon: ClipboardPaste, shortcut: "Ctrl V", disabled: !hasClipboard, onSelect: () => paste(at) },
          { label: "Seleccionar todo", icon: BoxSelect, shortcut: "Ctrl A", onSelect: selectAll },
          { label: "Ordenar automáticamente", icon: Wand2, shortcut: "Ctrl ⇧ L", onSelect: tidyUp },
        ],
      });
    },
    [add, addMenuItems, flow, paste, selectAll, tidyUp],
  );

  // ---------- Saving ----------

  const saveNow = useCallback(
    (snapshot: FlowDefinition) => {
      setStatus({ kind: "saving", text: "Guardando…" });
      startTransition(async () => {
        try {
          await saveDraftAction(flowId, snapshot);
          setSavedDraft(snapshot);
          setStatus({ kind: "saved", text: "Guardado" });
        } catch {
          setStatus({ kind: "error", text: "No se pudo guardar. Revisa tu conexión." });
        }
      });
    },
    [flowId],
  );

  // Autosave the draft a moment after the last change. Publishing stays explicit.
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => saveNow(draft), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dirty, draft, saveNow]);

  const publish = () => {
    startTransition(async () => {
      const result = await publishAction(flowId, draft);
      if (!result.ok) {
        setStatus({ kind: "error", text: result.error });
        return;
      }
      setSavedDraft(draft);
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

  // ---------- Keyboard ----------

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (mod && key === "s") {
        event.preventDefault();
        saveNow(draft);
        return;
      }
      if (mod && key === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (event.key === "Escape") {
        setAddOpen(false);
        setIssuesOpen(false);
        if (!isTyping(event) && side !== "step") selectOnly([]);
        return;
      }
      if (isTyping(event)) return;
      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (mod && key === "y") {
        event.preventDefault();
        redo();
      } else if (mod && key === "c") {
        if (copy()) event.preventDefault();
      } else if (mod && key === "x") {
        event.preventDefault();
        cut();
      } else if (mod && key === "v") {
        event.preventDefault();
        paste();
      } else if (mod && key === "d") {
        event.preventDefault();
        duplicateSteps(selectedIdsRef.current);
      } else if (mod && key === "a") {
        event.preventDefault();
        selectAll();
      } else if (mod && event.shiftKey && key === "l") {
        event.preventDefault();
        tidyUp();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        if (selectedIdsRef.current.length > 0) removeStepsAction(selectedIdsRef.current);
        else if (selectedEdgeIds.size > 0) removeEdges([...selectedEdgeIds]);
      } else if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [copy, cut, draft, duplicateSteps, paste, redo, removeEdges, removeStepsAction, saveNow, selectAll, selectOnly, selectedEdgeIds, side, tidyUp, undo]);

  // Warn before leaving with changes that haven't been saved yet.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const actions: EditorActions = useMemo(
    () => ({ openStep, duplicateSteps, removeSteps: removeStepsAction, disconnect, selectionSize: selectedIds.length }),
    [disconnect, duplicateSteps, openStep, removeStepsAction, selectedIds.length],
  );

  const panelStep = panelStepId ? draft.steps[panelStepId] : undefined;
  const statusText = status.kind === "saving" ? status.text : dirty ? "Cambios sin guardar" : status.text;

  return (
    <EditorActionsContext.Provider value={actions}>
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
              <span className={status.kind === "error" ? styles.statusError : styles.status} aria-live="polite">
                {statusText}
              </span>
            </span>
          </div>
          <div className={styles.historyButtons}>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={undo} disabled={!canUndo} aria-label="Deshacer" title="Deshacer (Ctrl+Z)">
              <Undo2 />
            </button>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={redo} disabled={!canRedo} aria-label="Rehacer" title="Rehacer (Ctrl+Shift+Z)">
              <Redo2 />
            </button>
          </div>
          <div className={styles.searchSlot}>
            <StepSearch ref={searchRef} steps={draft.steps} onPick={(id) => { openStep(id); centerOn([id]); }} />
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
              onClick={() => saveNow(draft)}
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
            data-select-mode={selectMode || undefined}
            // Steps are focusable with Tab; Enter or Space opens the focused step's panel.
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              const node = (event.target as HTMLElement).closest<HTMLElement>(".react-flow__node");
              const id = node?.dataset.id;
              if (!id) return;
              event.preventDefault();
              openStep(id);
            }}
          >
            {mounted && (
              <ReactFlow
                onInit={setFlow}
                nodes={nodes}
                edges={edges}
                nodeTypes={NODE_TYPES}
                edgeTypes={EDGE_TYPES}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectEnd={onConnectEnd}
                onNodeClick={(event, node) => {
                  // Shift/Ctrl-click only changes the selection; a plain click opens the step.
                  if (event.shiftKey || event.metaKey || event.ctrlKey || selectMode) return;
                  openStep(node.id);
                }}
                onPaneClick={() => {
                  setMenu(null);
                  closePanel();
                }}
                onNodeContextMenu={onNodeContextMenu}
                onPaneContextMenu={onPaneContextMenu}
                onSelectionContextMenu={(event, selected) => {
                  const first = selected[0];
                  if (first) onNodeContextMenu(event, first as StepNodeType);
                }}
                deleteKeyCode={null}
                multiSelectionKeyCode={["Shift", "Meta", "Control"]}
                selectionKeyCode="Shift"
                selectionOnDrag={selectMode}
                panOnDrag={selectMode ? [1, 2] : true}
                selectionMode={SelectionMode.Partial}
                snapToGrid={snap}
                snapGrid={[20, 20]}
                fitView
                fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
                minZoom={0.2}
                maxZoom={2}
                colorMode="system"
                connectionRadius={36}
                attributionPosition="bottom-center"
              >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} />
                <Controls showInteractive={false} position="bottom-right" aria-label="Controles del lienzo">
                  <ControlButton onClick={tidyUp} title="Ordenar automáticamente (Ctrl+Shift+L)" aria-label="Ordenar automáticamente">
                    <Wand2 />
                  </ControlButton>
                  <ControlButton
                    onClick={() => setSelectMode((on) => !on)}
                    title={selectMode ? "Volver a mover el lienzo" : "Seleccionar con un recuadro"}
                    aria-label="Modo de selección"
                    aria-pressed={selectMode}
                    data-on={selectMode || undefined}
                  >
                    <SquareDashedMousePointer />
                  </ControlButton>
                  <ControlButton onClick={() => setSnap((on) => !on)} title="Ajustar a la cuadrícula" aria-label="Ajustar a la cuadrícula" aria-pressed={snap} data-on={snap || undefined}>
                    <Grid3x3 />
                  </ControlButton>
                  <ControlButton onClick={() => setShowMinimap((on) => !on)} title="Minimapa" aria-label="Minimapa" aria-pressed={showMinimap} data-on={showMinimap || undefined}>
                    <MapIcon />
                  </ControlButton>
                  <ControlButton onClick={() => setShortcutsOpen(true)} title="Atajos de teclado (?)" aria-label="Atajos de teclado">
                    <Keyboard />
                  </ControlButton>
                </Controls>
                {showMinimap && (
                  <MiniMap
                    className={styles.minimap}
                    position="top-right"
                    pannable
                    zoomable
                    ariaLabel="Minimapa del Flujo"
                    nodeColor={(node) => STEP_COLORS[(node as StepNodeType).data.step.type]}
                    nodeStrokeWidth={0}
                    nodeBorderRadius={6}
                  />
                )}
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
                              openStep(issue.stepId);
                              centerOn([issue.stepId]);
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

            {selectedIds.length > 1 && (
              <SelectionBar
                count={selectedIds.length}
                onAlignLeft={() => edit((current) => alignSteps(current, selectedIds, "left"))}
                onAlignTop={() => edit((current) => alignSteps(current, selectedIds, "top"))}
                onDistributeHorizontal={() => edit((current) => distributeSteps(current, selectedIds, "horizontal"))}
                onDistributeVertical={() => edit((current) => distributeSteps(current, selectedIds, "vertical"))}
                onDuplicate={() => duplicateSteps(selectedIds)}
                onCopy={() => copy(selectedIds)}
                onDelete={() => removeStepsAction(selectedIds)}
                onClear={() => selectOnly([])}
              />
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

          <Sheet open={side === "simulator"} title="Simulador" onClose={() => setSide(null)} label="Simulador del Flujo">
            <Simulator
              draft={draft}
              hasIssues={issues.length > 0}
              businessHours={businessHours}
              onActiveStepChange={setActiveStepId}
            />
          </Sheet>

          <Sheet
            open={side === "step" && Boolean(panelStep)}
            title={panelStep ? STEP_LABELS[panelStep.type] : "Paso"}
            onClose={closePanel}
            label="Editar paso"
          >
            {panelStepId && panelStep && (
              <StepPanel
                key={panelStepId}
                stepId={panelStepId}
                step={panelStep}
                isStart={panelStepId === draft.startStepId}
                steps={draft.steps}
                onChange={(step) => edit((current) => updateStep(current, panelStepId, step), `step:${panelStepId}`)}
                onSetTarget={(handle, target) => edit((current) => setTarget(current, panelStepId, handle, target))}
                onMakeStart={() => makeStart(panelStepId)}
                onDelete={() => removeStepsAction([panelStepId])}
              />
            )}
          </Sheet>
        </div>

        {menu && <CanvasMenu at={menu.at} label={menu.label} items={menu.items} onClose={() => setMenu(null)} />}
        <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      </div>
    </EditorActionsContext.Provider>
  );
}
