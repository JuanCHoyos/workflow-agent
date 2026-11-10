import { notFound } from "next/navigation";
import { FlowEditor } from "../../../../components/flow-editor/FlowEditor.tsx";
import { requireEditor } from "../../../../lib/editor-access.ts";

export default async function FlowEditorPage({ params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await params;
  const { business } = await requireEditor();
  const [flow, businessHours] = await Promise.all([
    business.getFlowForEditing(flowId).catch(() => notFound()),
    business.getBusinessHours(),
  ]);

  return (
    <FlowEditor
      flowId={flow.id}
      initialName={flow.name}
      initialDraft={flow.draft ?? { startStepId: "", steps: {} }}
      initialPublishedVersion={flow.publishedVersion}
      initialIsMain={flow.isMain}
      businessHours={businessHours}
    />
  );
}
