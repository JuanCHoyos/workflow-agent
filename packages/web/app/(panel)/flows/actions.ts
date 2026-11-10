"use server";

import { InvalidFlowError, type FlowDefinition } from "@workflow-agent/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "../../../lib/editor-access.ts";

export type ActionResult = { ok: true; publishedVersion?: number } | { ok: false; error: string };

const STARTER_FLOW: FlowDefinition = {
  startStepId: "welcome",
  steps: {
    welcome: { type: "message", text: "¡Hola! Gracias por escribirnos.", next: "end" },
    end: { type: "end" },
  },
  positions: { welcome: { x: 80, y: 120 }, end: { x: 420, y: 140 } },
};

export async function createFlowAction(formData: FormData) {
  const { business } = await requireEditor();
  const name = String(formData.get("name") ?? "").trim() || "Flujo sin nombre";
  const { id } = await business.createFlow({ name });
  await business.saveFlowDraft(id, STARTER_FLOW);
  redirect(`/flows/${id}`);
}

export async function deleteFlowAction(formData: FormData) {
  const { business } = await requireEditor();
  const flowId = String(formData.get("flowId"));
  try {
    await business.deleteFlow(flowId);
  } catch {
    redirect("/flows?error=delete-main");
  }
  revalidatePath("/flows");
}

export async function renameFlowAction(flowId: string, name: string): Promise<ActionResult> {
  const { business } = await requireEditor();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "El nombre no puede estar vacío." };
  await business.renameFlow(flowId, trimmed);
  revalidatePath("/flows");
  return { ok: true };
}

export async function saveDraftAction(flowId: string, draft: FlowDefinition): Promise<ActionResult> {
  const { business } = await requireEditor();
  await business.saveFlowDraft(flowId, draft);
  return { ok: true };
}

export async function publishAction(flowId: string, draft: FlowDefinition): Promise<ActionResult> {
  const { business } = await requireEditor();
  await business.saveFlowDraft(flowId, draft);
  try {
    const { version } = await business.publishFlow(flowId);
    revalidatePath("/flows");
    return { ok: true, publishedVersion: version };
  } catch (error) {
    if (error instanceof InvalidFlowError) {
      return { ok: false, error: "Corrige los problemas del Flujo antes de publicar." };
    }
    throw error;
  }
}

export async function setMainFlowAction(flowId: string): Promise<ActionResult> {
  const { business } = await requireEditor();
  await business.setMainFlow(flowId);
  revalidatePath("/flows");
  return { ok: true };
}
