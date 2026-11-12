import { useState } from "react";
import { useDemo } from "../data/store";
import { DISTRICTS } from "../data/catalog";
import { addDays } from "../domain/dates";
import { Button, Dialog } from "../ui/primitives";
import { useToast } from "../ui/Toast";
import { useFormat } from "./useFormat";

export function CustomerDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (id: string) => void }) {
  if (!open) return null;
  return <Inner onClose={onClose} onCreated={onCreated} />;
}

function Inner({ onClose, onCreated }: { onClose: () => void; onCreated?: (id: string) => void }) {
  const { data, today, addCustomer } = useDemo();
  const { t, pick } = useFormat();
  const toast = useToast();
  const [f, setF] = useState({
    name: "", phoneLast4: "", zoneId: data.zones[0].id, districtIndex: 0, systemId: data.systems[0].id,
    cycleMonths: 6, installedOn: addDays(today, -1), segment: "residential" as "residential" | "commercial", notes: "",
  });
  const [touched, setTouched] = useState(false);
  const nameOk = f.name.trim().length >= 3;
  const phoneOk = /^\d{4}$/.test(f.phoneLast4);
  const up = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = () => {
    setTouched(true);
    if (!nameOk || !phoneOk) return;
    const id = addCustomer(f);
    toast(t("form.created"));
    onClose();
    onCreated?.(id);
  };

  return (
    <Dialog open onClose={onClose} title={t("form.newCustomer")}
      footer={<>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button variant="primary" icon="check" onClick={submit} data-testid="customer-submit">{t("form.create")}</Button>
      </>}>
      <form className="grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <label className="sm:col-span-2">
          <span className="label">{t("form.name")}</span>
          <input className="field" value={f.name} maxLength={60} onChange={(e) => up("name", e.target.value)} aria-invalid={touched && !nameOk} data-testid="customer-name" />
          {touched && !nameOk && <span className="text-2xs text-bad-fg mt-1 block">{t("form.nameError")}</span>}
        </label>
        <label>
          <span className="label">{t("form.phoneLast4")}</span>
          <span className="flex items-center gap-2" dir="ltr">
            <span className="text-xs text-ink-3 whitespace-nowrap num">+966 5• •••</span>
            <input className="field num" inputMode="numeric" maxLength={4} value={f.phoneLast4}
              onChange={(e) => up("phoneLast4", e.target.value.replace(/\D/g, ""))} aria-invalid={touched && !phoneOk} data-testid="customer-phone" />
          </span>
          <span className={`text-2xs mt-1 block ${touched && !phoneOk ? "text-bad-fg" : "text-ink-3"}`}>{touched && !phoneOk ? t("form.phoneError") : t("form.phoneHint")}</span>
        </label>
        <label>
          <span className="label">{t("form.segment")}</span>
          <select className="field" value={f.segment} onChange={(e) => up("segment", e.target.value as typeof f.segment)}>
            <option value="residential">{t("segment.residential")}</option>
            <option value="commercial">{t("segment.commercial")}</option>
          </select>
        </label>
        <label>
          <span className="label">{t("customers.zone")}</span>
          <select className="field" value={f.zoneId} onChange={(e) => setF((x) => ({ ...x, zoneId: e.target.value, districtIndex: 0 }))}>
            {data.zones.map((z) => <option key={z.id} value={z.id}>{pick(z.name)}</option>)}
          </select>
        </label>
        <label>
          <span className="label">{t("form.district")}</span>
          <select className="field" value={f.districtIndex} onChange={(e) => up("districtIndex", Number(e.target.value))}>
            {DISTRICTS[f.zoneId].map((d, i) => <option key={d.en} value={i}>{pick(d)}</option>)}
          </select>
        </label>
        <label>
          <span className="label">{t("form.system")}</span>
          <select className="field" value={f.systemId} onChange={(e) => up("systemId", e.target.value)}>
            {data.systems.map((s) => <option key={s.id} value={s.id}>{pick(s.name)}</option>)}
          </select>
        </label>
        <label>
          <span className="label">{t("form.cycle")}</span>
          <select className="field" value={f.cycleMonths} onChange={(e) => up("cycleMonths", Number(e.target.value))}>
            {[3, 6, 12].map((m) => <option key={m} value={m}>{t("customer.cycleValue", { n: m })}</option>)}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="label">{t("form.installedOn")}</span>
          <input type="date" className="field" value={f.installedOn} max={today} onChange={(e) => up("installedOn", e.target.value || today)} />
        </label>
        <label className="sm:col-span-2">
          <span className="label">{t("form.notes")}</span>
          <textarea className="field" rows={2} maxLength={240} value={f.notes} onChange={(e) => up("notes", e.target.value)} />
        </label>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Dialog>
  );
}
