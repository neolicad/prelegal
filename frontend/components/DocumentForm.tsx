"use client";

import type { ReactNode } from "react";
import type { DocumentTypeSpec, FieldSpec } from "@/lib/document-types";
import { type DocumentFormValues, type PartyInfo, getFieldValue, getPartyValue } from "@/lib/document-form";
import { inputClass } from "@/lib/ui";

interface DocumentFormProps {
  ref?: React.Ref<HTMLFormElement>;
  spec: DocumentTypeSpec;
  values: DocumentFormValues;
  onChange: (values: DocumentFormValues) => void;
}

/**
 * One form, driven entirely by a document type's field/party schema (see
 * catalog.json's documentTypes) -- replaces the old hand-crafted NdaForm.tsx
 * and, with it, the need for a bespoke form component per document type.
 */
export default function DocumentForm({ ref, spec, values, onChange }: DocumentFormProps) {
  function updateField(key: string, value: string) {
    onChange({ ...values, [key]: value });
  }

  function updateParty(partyKey: string, field: keyof PartyInfo, value: string) {
    onChange({ ...values, [partyKey]: { ...getPartyValue(values, partyKey), [field]: value } });
  }

  return (
    <form ref={ref} className="flex flex-col gap-8" onSubmit={(e) => e.preventDefault()}>
      <Section title="Key Terms">
        {spec.fields.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            value={getFieldValue(values, field.key)}
            onChange={(value) => updateField(field.key, value)}
          />
        ))}
      </Section>

      {spec.parties.map((party) => (
        <PartyFields
          key={party.key}
          title={party.label}
          party={getPartyValue(values, party.key)}
          onChange={(field, value) => updateParty(party.key, field, value)}
        />
      ))}
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
      {hint ? <span className="text-xs text-neutral-500"> {hint}</span> : null}
      {children}
    </label>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldSpec;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.kind === "textarea") {
    return (
      <Field label={field.label} hint={field.helpText}>
        <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      </Field>
    );
  }

  if (field.kind === "choice") {
    // A <fieldset>/<legend>, not the shared <Field> (a <label>): nesting a
    // per-choice <label> inside another wrapping <label> is invalid markup
    // that leaves each radio's accessible name ambiguous.
    return (
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-neutral-800">{field.label}</legend>
        {field.helpText ? <span className="-mt-1 text-xs text-neutral-500">{field.helpText}</span> : null}
        {(field.choices ?? []).map((choice) => (
          <label key={choice.value} className="flex items-center gap-2 text-sm text-neutral-800">
            <input
              type="radio"
              name={field.key}
              checked={value === choice.value}
              onChange={() => onChange(choice.value)}
            />
            {choice.label}
          </label>
        ))}
      </fieldset>
    );
  }

  return (
    <Field label={field.label} hint={field.helpText}>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </Field>
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
