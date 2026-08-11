"use client";

import type { ReactNode } from "react";
import type { NdaFormValues, PartyInfo, TermChoice } from "@/lib/nda-form";

interface NdaFormProps {
  ref?: React.Ref<HTMLFormElement>;
  values: NdaFormValues;
  onChange: (values: NdaFormValues) => void;
}

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500";

export default function NdaForm({ ref, values, onChange }: NdaFormProps) {
  function update<K extends keyof NdaFormValues>(key: K, value: NdaFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  function updateParty(party: "party1" | "party2", field: keyof PartyInfo, value: string) {
    onChange({ ...values, [party]: { ...values[party], [field]: value } });
  }

  return (
    <form ref={ref} className="flex flex-col gap-8" onSubmit={(e) => e.preventDefault()}>
      <Section title="Purpose & Effective Date">
        <Field label="Purpose" hint="How Confidential Information may be used">
          <textarea
            rows={2}
            value={values.purpose}
            onChange={(e) => update("purpose", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Effective Date">
          <input
            type="date"
            value={values.effectiveDate}
            onChange={(e) => update("effectiveDate", e.target.value)}
            className={inputClass}
          />
        </Field>
      </Section>

      <TermField
        legend="MNDA Term"
        hint="The length of this MNDA"
        name="mnda-term"
        type={values.mndaTermType}
        years={values.mndaTermYears}
        onTypeChange={(type) => update("mndaTermType", type)}
        onYearsChange={(years) => update("mndaTermYears", years)}
        expiresLabel="Expires"
        perpetualLabel="Continues until terminated in accordance with the terms of the MNDA"
      />

      <TermField
        legend="Term of Confidentiality"
        hint="How long Confidential Information is protected"
        name="confidentiality-term"
        type={values.confidentialityTermType}
        years={values.confidentialityTermYears}
        onTypeChange={(type) => update("confidentialityTermType", type)}
        onYearsChange={(years) => update("confidentialityTermYears", years)}
        expiresLabel="Protected for"
        perpetualLabel="In perpetuity"
      />

      <Section title="Governing Law & Jurisdiction">
        <Field label="Governing Law" hint="State whose laws govern this MNDA">
          <input
            type="text"
            placeholder="e.g. Delaware"
            value={values.governingLaw}
            onChange={(e) => update("governingLaw", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Jurisdiction" hint='e.g. "courts located in New Castle, DE"'>
          <input
            type="text"
            placeholder="courts located in New Castle, DE"
            value={values.jurisdiction}
            onChange={(e) => update("jurisdiction", e.target.value)}
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="MNDA Modifications">
        <Field label="Modifications" hint="Optional — list any modifications to the Standard Terms">
          <textarea
            rows={2}
            value={values.modifications}
            onChange={(e) => update("modifications", e.target.value)}
            className={inputClass}
          />
        </Field>
      </Section>

      <PartyFields
        title="Party 1"
        party={values.party1}
        onChange={(field, value) => updateParty("party1", field, value)}
      />
      <PartyFields
        title="Party 2"
        party={values.party2}
        onChange={(field, value) => updateParty("party2", field, value)}
      />
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-neutral-800">{label}</span>
      {hint ? <span className="text-xs text-neutral-500">{hint}</span> : null}
      {children}
    </label>
  );
}

function TermField({
  legend,
  hint,
  name,
  type,
  years,
  onTypeChange,
  onYearsChange,
  expiresLabel,
  perpetualLabel,
}: {
  legend: string;
  hint: string;
  name: string;
  type: TermChoice;
  years: string;
  onTypeChange: (type: TermChoice) => void;
  onYearsChange: (years: string) => void;
  expiresLabel: string;
  perpetualLabel: string;
}) {
  return (
    <Section title={legend}>
      <span className="-mt-2 text-xs text-neutral-500">{hint}</span>
      <label className="flex flex-wrap items-center gap-2 text-sm text-neutral-800">
        <input type="radio" name={name} checked={type === "fixed"} onChange={() => onTypeChange("fixed")} />
        {expiresLabel}
        <input
          type="number"
          min={1}
          value={years}
          onChange={(e) => onYearsChange(e.target.value)}
          className="w-16 rounded-md border border-neutral-300 px-2 py-1 text-sm"
        />
        year(s) from Effective Date
      </label>
      <label className="flex items-center gap-2 text-sm text-neutral-800">
        <input type="radio" name={name} checked={type === "perpetual"} onChange={() => onTypeChange("perpetual")} />
        {perpetualLabel}
      </label>
    </Section>
  );
}

function PartyFields({
  title,
  party,
  onChange,
}: {
  title: string;
  party: PartyInfo;
  onChange: (field: keyof PartyInfo, value: string) => void;
}) {
  return (
    <Section title={title}>
      {PARTY_FIELD_CONFIG.map(({ key, label, hint }) => (
        <Field key={key} label={label} hint={hint}>
          <input
            type="text"
            value={party[key]}
            onChange={(e) => onChange(key, e.target.value)}
            className={inputClass}
          />
        </Field>
      ))}
    </Section>
  );
}

const PARTY_FIELD_CONFIG: { key: keyof PartyInfo; label: string; hint?: string }[] = [
  { key: "printName", label: "Print Name" },
  { key: "title", label: "Title" },
  { key: "company", label: "Company" },
  { key: "noticeAddress", label: "Notice Address", hint: "Use either email or postal address" },
];
