"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog.tsx";
import { deleteFlowAction } from "./actions.ts";

export function DeleteFlowButton({ flowId, flowName }: { flowId: string; flowName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        aria-label={`Borrar ${flowName}`}
        title="Borrar"
        onClick={() => setOpen(true)}
      >
        <Trash2 />
      </button>
      <ConfirmDialog
        open={open}
        title={`¿Borrar "${flowName}"?`}
        confirmLabel="Borrar Flujo"
        destructive
        pending={pending}
        onClose={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            const formData = new FormData();
            formData.set("flowId", flowId);
            await deleteFlowAction(formData);
            setOpen(false);
          })
        }
      >
        Se borran el borrador y todas sus versiones publicadas. No se puede deshacer.
      </ConfirmDialog>
    </>
  );
}
