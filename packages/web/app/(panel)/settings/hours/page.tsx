import { DAY_KEYS, type BusinessHours, type DayKey } from "@workflow-agent/core";
import { Check } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DAY_LABELS } from "../../../../components/flow-editor/model.ts";
import { requireEditor } from "../../../../lib/editor-access.ts";
import styles from "./hours.module.css";
import { SaveBar } from "./SaveBar.tsx";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const DEFAULT_HOURS: BusinessHours = {
  monday: [{ open: "08:00", close: "18:00" }],
  tuesday: [{ open: "08:00", close: "18:00" }],
  wednesday: [{ open: "08:00", close: "18:00" }],
  thursday: [{ open: "08:00", close: "18:00" }],
  friday: [{ open: "08:00", close: "18:00" }],
  saturday: [{ open: "09:00", close: "13:00" }],
  sunday: [],
};

async function saveHours(formData: FormData) {
  "use server";
  const { business } = await requireEditor();
  const hours = {} as Record<DayKey, { open: string; close: string }[]>;
  for (const day of DAY_KEYS) {
    const open = String(formData.get(`${day}-open`) ?? "");
    const close = String(formData.get(`${day}-close`) ?? "");
    const isOpen = formData.get(`${day}-enabled`) === "on";
    if (!isOpen) {
      hours[day] = [];
      continue;
    }
    if (!TIME.test(open) || !TIME.test(close) || open >= close) redirect(`/settings/hours?error=${day}`);
    hours[day] = [{ open, close }];
  }
  await business.setBusinessHours(hours);
  revalidatePath("/settings/hours");
  redirect("/settings/hours?saved=1");
}

export default async function BusinessHoursPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: DayKey }>;
}) {
  const { business } = await requireEditor();
  const hours = (await business.getBusinessHours()) ?? DEFAULT_HOURS;
  const { saved, error } = await searchParams;

  return (
    <div style={{ maxWidth: 640 }}>
      <header className="page-header">
        <h1>Horario de atención</h1>
        <p>
          Las horas en que tu equipo atiende, en hora de Colombia. Tus Flujos lo pueden usar en un paso Condición,
          por ejemplo para responder distinto fuera de horario.
        </p>
      </header>
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        {saved && (
          <p className="notice notice-success" role="status">
            <Check aria-hidden="true" />
            Horario guardado.
          </p>
        )}
        {error && (
          <p className="notice notice-error" role="alert">
            Revisa el {DAY_LABELS[error].toLowerCase()}: la hora de cierre debe ser después de la de apertura.
          </p>
        )}
        <form action={saveHours} className="stack" style={{ gap: "var(--space-5)" }}>
          <ul className={styles.days}>
            {DAY_KEYS.map((day) => {
              const range = hours[day][0];
              return (
                <li key={day} className={styles.day}>
                  <label className={styles.dayName} htmlFor={`${day}-enabled`}>
                    {DAY_LABELS[day]}
                  </label>
                  <input
                    id={`${day}-enabled`}
                    type="checkbox"
                    role="switch"
                    className="switch"
                    name={`${day}-enabled`}
                    defaultChecked={Boolean(range)}
                    aria-label={`Abierto el ${DAY_LABELS[day].toLowerCase()}`}
                  />
                  <div className={styles.times}>
                    <input
                      type="time"
                      className="input"
                      name={`${day}-open`}
                      defaultValue={range?.open ?? "08:00"}
                      aria-label={`${DAY_LABELS[day]}: abre a las`}
                    />
                    <span className="muted" aria-hidden="true">
                      a
                    </span>
                    <input
                      type="time"
                      className="input"
                      name={`${day}-close`}
                      defaultValue={range?.close ?? "18:00"}
                      aria-label={`${DAY_LABELS[day]}: cierra a las`}
                    />
                  </div>
                  <span className={styles.closed}>Cerrado</span>
                </li>
              );
            })}
          </ul>
          <SaveBar />
        </form>
      </div>
    </div>
  );
}
