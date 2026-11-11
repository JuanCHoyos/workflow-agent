import dagre from "@dagrejs/dagre";
import type { FlowDefinition } from "@workflow-agent/core/flow-definition";
import { connectionsOf } from "./model.ts";

const DEFAULT_SIZE = { width: 248, height: 120 };

/**
 * Lays the Flow out left to right, each step after the step that leads to it.
 * Returns top-left positions, as React Flow expects them.
 */
export function autoLayout(
  definition: FlowDefinition,
  sizes: Record<string, { width: number; height: number } | undefined>,
) {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: "LR", nodesep: 48, ranksep: 96, marginx: 24, marginy: 24 });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const id of Object.keys(definition.steps)) {
    graph.setNode(id, sizes[id] ?? DEFAULT_SIZE);
  }
  for (const [id, step] of Object.entries(definition.steps)) {
    for (const { target } of connectionsOf(step)) {
      if (definition.steps[target] && target !== id) graph.setEdge(id, target);
    }
  }

  dagre.layout(graph);

  const positions: Record<string, { x: number; y: number }> = {};
  for (const id of Object.keys(definition.steps)) {
    const node = graph.node(id);
    const size = sizes[id] ?? DEFAULT_SIZE;
    positions[id] = { x: Math.round(node.x - size.width / 2), y: Math.round(node.y - size.height / 2) };
  }
  return positions;
}
