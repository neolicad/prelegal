import { createRef, useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NdaForm from "./NdaForm";
import { defaultFormValues, type NdaFormValues } from "@/lib/nda-form";

/** Wraps NdaForm with real React state so user interactions produce observable updates. */
function ControlledNdaForm({ ref }: { ref?: React.Ref<HTMLFormElement> }) {
  const [values, setValues] = useState<NdaFormValues>(defaultFormValues);
  return (
    <>
      <NdaForm ref={ref} values={values} onChange={setValues} />
      <output data-testid="values-json">{JSON.stringify(values)}</output>
    </>
  );
}

function readValues(): NdaFormValues {
  return JSON.parse(screen.getByTestId("values-json").textContent!);
}

describe("NdaForm", () => {
  it("renders every field group", () => {
    render(<ControlledNdaForm />);
    expect(screen.getByText("Purpose & Effective Date")).toBeInTheDocument();
    expect(screen.getByText("MNDA Term")).toBeInTheDocument();
    expect(screen.getByText("Term of Confidentiality")).toBeInTheDocument();
    expect(screen.getByText("Governing Law & Jurisdiction")).toBeInTheDocument();
    expect(screen.getByText("MNDA Modifications")).toBeInTheDocument();
    expect(screen.getByText("Party 1")).toBeInTheDocument();
    expect(screen.getByText("Party 2")).toBeInTheDocument();
  });

  it("renders all four fields for both parties", () => {
    render(<ControlledNdaForm />);
    expect(screen.getAllByLabelText("Print Name")).toHaveLength(2);
    expect(screen.getAllByLabelText("Title")).toHaveLength(2);
    expect(screen.getAllByLabelText("Company")).toHaveLength(2);
    expect(screen.getAllByLabelText("Notice Address", { exact: false })).toHaveLength(2);
  });

  it("updates purpose via onChange without touching other fields", async () => {
    const user = userEvent.setup();
    render(<ControlledNdaForm />);
    const purpose = screen.getByLabelText("Purpose", { exact: false }) as HTMLTextAreaElement;
    await user.clear(purpose);
    await user.type(purpose, "Evaluating a joint venture.");

    const values = readValues();
    expect(values.purpose).toBe("Evaluating a joint venture.");
    expect(values.governingLaw).toBe(defaultFormValues.governingLaw);
  });

  it("updates governingLaw and jurisdiction independently", async () => {
    const user = userEvent.setup();
    render(<ControlledNdaForm />);
    await user.type(screen.getByLabelText("Governing Law", { exact: false }), "Delaware");
    await user.type(
      screen.getByLabelText("Jurisdiction", { exact: false }),
      "courts located in New Castle, DE"
    );

    const values = readValues();
    expect(values.governingLaw).toBe("Delaware");
    expect(values.jurisdiction).toBe("courts located in New Castle, DE");
  });

  it("updates only the targeted party's field, leaving the other party untouched", async () => {
    const user = userEvent.setup();
    render(<ControlledNdaForm />);
    const [party1Name, party2Name] = screen.getAllByLabelText("Print Name");
    await user.type(party1Name, "Alice Smith");

    const values = readValues();
    expect(values.party1.printName).toBe("Alice Smith");
    expect(values.party2.printName).toBe("");
    expect(party2Name).toHaveValue("");
  });

  it("selecting the perpetual radio switches mndaTermType and leaves confidentiality term untouched", async () => {
    const user = userEvent.setup();
    render(<ControlledNdaForm />);
    const perpetualRadio = screen.getByRole("radio", {
      name: "Continues until terminated in accordance with the terms of the MNDA",
    });
    await user.click(perpetualRadio);

    const values = readValues();
    expect(values.mndaTermType).toBe("perpetual");
    expect(values.confidentialityTermType).toBe("fixed");
  });

  it("selecting the in-perpetuity radio switches confidentialityTermType and leaves MNDA term untouched", async () => {
    const user = userEvent.setup();
    render(<ControlledNdaForm />);
    await user.click(screen.getByRole("radio", { name: "In perpetuity" }));

    const values = readValues();
    expect(values.confidentialityTermType).toBe("perpetual");
    expect(values.mndaTermType).toBe("fixed");
  });

  it("changing the MNDA term years input updates mndaTermYears only", async () => {
    const user = userEvent.setup();
    render(<ControlledNdaForm />);
    const yearsInputs = screen.getAllByRole("spinbutton");
    await user.clear(yearsInputs[0]);
    await user.type(yearsInputs[0], "5");

    const values = readValues();
    expect(values.mndaTermYears).toBe("5");
    expect(values.confidentialityTermYears).toBe("1");
  });

  it("changing the confidentiality term years input updates confidentialityTermYears only", async () => {
    const user = userEvent.setup();
    render(<ControlledNdaForm />);
    const yearsInputs = screen.getAllByRole("spinbutton");
    await user.clear(yearsInputs[1]);
    await user.type(yearsInputs[1], "7");

    const values = readValues();
    expect(values.confidentialityTermYears).toBe("7");
    expect(values.mndaTermYears).toBe("1");
  });

  it("marks purpose, effective date, governing law, jurisdiction, and party fields as required", () => {
    render(<ControlledNdaForm />);
    expect(screen.getByLabelText("Purpose", { exact: false })).toBeRequired();
    expect(screen.getByLabelText("Effective Date")).toBeRequired();
    expect(screen.getByLabelText("Governing Law", { exact: false })).toBeRequired();
    expect(screen.getByLabelText("Jurisdiction", { exact: false })).toBeRequired();
    for (const field of screen.getAllByLabelText("Print Name")) {
      expect(field).toBeRequired();
    }
  });

  it("does not mark the optional modifications field as required", () => {
    render(<ControlledNdaForm />);
    expect(screen.getByLabelText("Modifications", { exact: false })).not.toBeRequired();
  });

  it("requires the years input only while the fixed-term option is selected", async () => {
    const user = userEvent.setup();
    render(<ControlledNdaForm />);
    const [mndaYears] = screen.getAllByRole("spinbutton");
    expect(mndaYears).toBeRequired();

    await user.click(screen.getByRole("radio", { name: /^Expires/ }));
    // Selecting "Expires" (fixed) explicitly should keep it required; now
    // switch to perpetual and confirm it becomes optional.
    await user.click(
      screen.getByRole("radio", { name: "Continues until terminated in accordance with the terms of the MNDA" })
    );
    expect(mndaYears).not.toBeRequired();
  });

  it("requires the confidentiality years input only while the fixed-term option is selected", async () => {
    const user = userEvent.setup();
    render(<ControlledNdaForm />);
    const [, confidentialityYears] = screen.getAllByRole("spinbutton");
    expect(confidentialityYears).toBeRequired();

    await user.click(screen.getByRole("radio", { name: "In perpetuity" }));
    expect(confidentialityYears).not.toBeRequired();
  });

  it("forwards the ref to the underlying <form> element", () => {
    const ref = createRef<HTMLFormElement>();
    render(<ControlledNdaForm ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLFormElement);
  });
});
