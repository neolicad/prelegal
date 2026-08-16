"use client";

import { useEffect, type ReactNode } from "react";
import type { DocumentTypeSpec, FieldSpec } from "@/lib/document-types";
import { type DocumentFormValues, type PartyInfo, getFieldValue, getPartyValue } from "@/lib/document-form";
import { inputClass } from "@/lib/ui";

/** A request to scroll a given field/party into view; `nonce` bumps on every
 * request so the effect re-fires even when the same key is targeted twice
 * in a row (e.g. two consecutive chat turns both touch the same field). */
export interface ScrollToFieldRequest {
  key: string;
  nonce: number;
}

interface DocumentFormProps {
  ref?: React.Ref<HTMLFormElement>;
  spec: DocumentTypeSpec;
  values: DocumentFormValues;
  onChange: (values: DocumentFormValues) => void;
  scrollTo?: ScrollToFieldRequest | null;
}

/** DOM id for a field/party's wrapping element -- see `scrollTo`. */
function fieldAnchorId(key: string): string {
  return `field-${key}`;
}

/**
 * One form, driven entirely by a document type's field/party schema (see
 * catalog.json's documentTypes) -- replaces the old hand-crafted NdaForm.tsx
 * and, with it, the need for a bespoke form component per document type.
 */
export default function DocumentForm({ ref, spec, values, onChange, scrollTo }: DocumentFormProps) {
  function updateField(key: string, value: string) {
    onChange({ ...values, [key]: value });
  }

  function updateParty(partyKey: string, field: keyof PartyInfo, value: string) {
    onChange({ ...values, [partyKey]: { ...getPartyValue(values, partyKey), [field]: value } });
  }

  // Scrolls the field/party the AI just filled in into view. This column
  // scrolls independently of the page (see DocumentApp.tsx), so without
  // this a field below the fold would update silently out of sight.
  useEffect(() => {
    if (!scrollTo) return;
    document.getElementById(fieldAnchorId(scrollTo.key))?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [scrollTo]);

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
          partyKey={party.key}
          title={party.label}
          party={getPartyValue(values, party.key)}
          onChange={(field, value) => updateParty(party.key, field, value)}
        />
      ))}
    </form>
  );
}

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <fieldset id={id} className="flex flex-col gap-4">
      <legend className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ id, label, hint, children }: { id?: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <label id={id} className="flex flex-col gap-1">
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
  const anchorId = fieldAnchorId(field.key);

  if (field.kind === "textarea") {
    return (
      <Field id={anchorId} label={field.label} hint={field.helpText}>
        <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      </Field>
    );
  }

  if (field.kind === "choice") {
    // A <fieldset>/<legend>, not the shared <Field> (a <label>): nesting a
    // per-choice <label> inside another wrapping <label> is invalid markup
    // that leaves each radio's accessible name ambiguous.
    return (
      <fieldset id={anchorId} className="flex flex-col gap-2">
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
    <Field id={anchorId} label={field.label} hint={field.helpText}>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </Field>
  );
}

function PartyFields({
  partyKey,
  title,
  party,
  onChange,
}: {
  partyKey: string;
  title: string;
  party: PartyInfo;
  onChange: (field: keyof PartyInfo, value: string) => void;
}) {
  return (
    <Section id={fieldAnchorId(partyKey)} title={title}>
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
