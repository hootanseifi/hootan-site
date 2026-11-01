import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { Contact } from "@/components/header/Contact";
import type { Dictionary } from "@/i18n";

const t = { contact: "Contact me", email: "Email", phone: "Phone" } as Dictionary["header"];
const open = () => fireEvent.click(screen.getByRole("button", { name: "Contact me" }));
const card = () => screen.queryByText("Email");

afterEach(cleanup);

test("the card opens with a click and closes when the mouse leaves it", () => {
  render(<Contact t={t} />);
  expect(card()).toBeNull();
  open();
  expect(card()).toBeTruthy();
  fireEvent.mouseLeave(screen.getByTestId("contact"));
  expect(card()).toBeNull();
});

test("a tap outside or Escape closes the card", () => {
  render(<Contact t={t} />);
  open();
  fireEvent.pointerDown(document.body);
  expect(card()).toBeNull();
  open();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(card()).toBeNull();
});
