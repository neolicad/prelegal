import { createRef, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DocumentForm, { type ScrollToFieldRequest } from "./DocumentForm";
import { defaultFormValues, getFieldValue, getPartyValue, type DocumentFormValues } from "@/lib/document-form";
import type { DocumentTypeSpec } from "@/lib/document-types";
import { loadDocumentTypeFixture } from "@/lib/test-support/load-document-type";

const scrollIntoViewMock = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;

const { spec: ndaSpec } = loadDocumentTypeFixture("mutual-nda");
const { spec: csaSpec } = loadDocumentTypeFixture("csa");

/** Wraps DocumentForm with real React state so user interactions produce observable updates. */
function ControlledDocumentForm({ spec, ref }: { spec: DocumentTypeSpec; ref?: React.Ref<HTMLFormElement> }) {
  const [values, setValues] = useState<DocumentFormValues>(() => defaultFormValues(spec));
  return (
    <>
      <DocumentForm ref={ref} spec={spec} values={values} onChange={setValues} />
      <output data-testid="values-json">{JSON.stringify(values)}</output>
    </>
  );
}

function readValues(): DocumentFormValues {
  return JSON.parse(screen.getByTestId("values-json").textContent!);
}

describe("DocumentForm", () => {
  it("renders a labeled control for every field in the spec", () => {
    render(<ControlledDocumentForm spec={ndaSpec} />);
    for (const field of ndaSpec.fields) {
      expect(screen.getByText(field.label)).toBeInTheDocument();
    }
  });

  it("renders a section per party role, with all four PartyInfo fields", () => {
    render(<ControlledDocumentForm spec={csaSpec} />);
    expect(screen.getByText("Provider")).toBeInTheDocument();
    expect(screen.getByText("Customer")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Print Name")).toHaveLength(2);
    expect(screen.getAllByLabelText("Company")).toHaveLength(2);
    expect(screen.getAllByLabelText("Notice Address", { exact: false })).toHaveLength(2);
  });

  it("updates a plain text field without touching others", async () => {
    const user = userEvent.setup();
    render(<ControlledDocumentForm spec={csaSpec} />);
    await user.type(screen.getByLabelText("Governing Law", { exact: false }), "Delaware");

    const values = readValues();
    expect(getFieldValue(values, "governingLaw")).toBe("Delaware");
    expect(getFieldValue(values, "chosenCourts")).toBe("");
  });

  it("updates a textarea field", async () => {
    const user = userEvent.setup();
    render(<ControlledDocumentForm spec={ndaSpec} />);
    const purpose = screen.getByLabelText("Purpose", { exact: false });
    await user.clear(purpose);
    await user.type(purpose, "Evaluating a joint venture.");

    expect(getFieldValue(readValues(), "purpose")).toBe("Evaluating a joint venture.");
  });

  it("selecting a choice field's radio updates that field only", async () => {
    const user = userEvent.setup();
    render(<ControlledDocumentForm spec={ndaSpec} />);
    await user.click(
      screen.getByRole("radio", { name: "Continues until terminated in accordance with the terms of the MNDA" })
    );

    const values = readValues();
    expect(getFieldValue(values, "mndaTermType")).toBe("perpetual");
    expect(getFieldValue(values, "confidentialityTermType")).toBe("fixed");
  });

  it("updates only the targeted party's field, leaving the other party and other fields untouched", async () => {
    const user = userEvent.setup();
    render(<ControlledDocumentForm spec={csaSpec} />);
    const [providerName, customerName] = screen.getAllByLabelText("Print Name");
    await user.type(providerName, "Alice Smith");

    const values = readValues();
    expect(getPartyValue(values, "provider").printName).toBe("Alice Smith");
    expect(getPartyValue(values, "customer").printName).toBe("");
    expect(customerName).toHaveValue("");
  });

  it("does not mark any field as required, so the document can always be downloaded", () => {
    render(<ControlledDocumentForm spec={ndaSpec} />);
    expect(screen.getByLabelText("Purpose", { exact: false })).not.toBeRequired();
    for (const field of screen.getAllByLabelText("Print Name")) {
      expect(field).not.toBeRequired();
    }
  });

  it("forwards the ref to the underlying <form> element", () => {
    const ref = createRef<HTMLFormElement>();
    render(<ControlledDocumentForm spec={ndaSpec} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLFormElement);
  });

  describe("scrollTo", () => {
    beforeEach(() => {
      scrollIntoViewMock.mockClear();
    });

    it("scrolls a plain field into view when targeted", () => {
      const values = defaultFormValues(csaSpec);
      const { rerender } = render(
        <DocumentForm spec={csaSpec} values={values} onChange={() => {}} scrollTo={null} />
      );
      expect(scrollIntoViewMock).not.toHaveBeenCalled();

      const request: ScrollToFieldRequest = { key: "governingLaw", nonce: 1 };
      rerender(<DocumentForm spec={csaSpec} values={values} onChange={() => {}} scrollTo={request} />);

      expect(screen.getByLabelText("Governing Law", { exact: false }).closest("label")).toBe(
        document.getElementById("field-governingLaw")
      );
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
    });

    it("scrolls a party's whole section into view when a party field is targeted", () => {
      const values = defaultFormValues(csaSpec);
      const { rerender } = render(
        <DocumentForm spec={csaSpec} values={values} onChange={() => {}} scrollTo={null} />
      );

      const request: ScrollToFieldRequest = { key: "customer", nonce: 1 };
      rerender(<DocumentForm spec={csaSpec} values={values} onChange={() => {}} scrollTo={request} />);

      expect(screen.getByText("Customer").closest("fieldset")).toBe(document.getElementById("field-customer"));
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
    });

    it("re-scrolls when the same field is targeted again (nonce bump)", () => {
      const values = defaultFormValues(csaSpec);
      const request: ScrollToFieldRequest = { key: "governingLaw", nonce: 1 };
      const { rerender } = render(
        <DocumentForm spec={csaSpec} values={values} onChange={() => {}} scrollTo={request} />
      );
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);

      rerender(
        <DocumentForm
          spec={csaSpec}
          values={values}
          onChange={() => {}}
          scrollTo={{ key: "governingLaw", nonce: 2 }}
        />
      );

      expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);
    });
  });
});
