import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { getDictionary } from "@/i18n";

const t = getDictionary("en").auth;

/** A fake backend answering by path; every call is recorded. */
function backend(routes: Record<string, [number, unknown]>) {
  const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url) => {
    const [status, body] = routes[url] ?? [401, null];
    return new Response(body === null ? null : JSON.stringify(body), { status });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const type = (name: string, value: string) => fireEvent.change(screen.getByPlaceholderText(name), { target: { value } });
const sent = (fetch: ReturnType<typeof backend>, url: string) =>
  JSON.parse(String(fetch.mock.calls.find(([u]) => u === url)![1]!.body));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("a forgotten password: nickname and email go to Hootan and the form says so", async () => {
  const fetch = backend({ "/api/game/password/forgot": [204, null] });
  const done = vi.fn();
  render(
    <AuthProvider>
      <AuthForm t={t} onDone={done} />
    </AuthProvider>,
  );

  fireEvent.click(screen.getByRole("button", { name: t.forgot }));
  type(t.nickname, "satoshi");
  type(t.email, "a@b.com");
  fireEvent.click(screen.getByRole("button", { name: t.send }));

  expect(await screen.findByText(t.sent)).toBeTruthy();
  expect(sent(fetch, "/api/game/password/forgot")).toEqual({ nickname: "satoshi", email: "a@b.com" });
  expect(screen.queryByPlaceholderText(t.email)).toBeNull();
  expect(done).not.toHaveBeenCalled();
});

test("too many forgot requests say so and keep the form", async () => {
  backend({ "/api/game/password/forgot": [429, { detail: "x" }] });
  render(
    <AuthProvider>
      <AuthForm t={t} />
    </AuthProvider>,
  );

  fireEvent.click(screen.getByRole("button", { name: t.forgot }));
  type(t.nickname, "satoshi");
  type(t.email, "a@b.com");
  fireEvent.click(screen.getByRole("button", { name: t.send }));

  expect((await screen.findByRole("alert")).textContent).toBe(t.errLimit);
  expect(screen.getByPlaceholderText(t.email)).toBeTruthy();
});

test("signing up with an email that has an account names the email", async () => {
  backend({ "/api/game/players": [409, { detail: "Email taken" }] });
  render(
    <AuthProvider>
      <AuthForm t={t} start="signup" />
    </AuthProvider>,
  );

  type(t.email, "a@b.com");
  type(t.nickname, "new_one");
  type(t.password, "pw");
  fireEvent.click(screen.getByRole("button", { name: t.signup }));

  expect((await screen.findByRole("alert")).textContent).toBe(t.errEmailTaken);
});

test("a remembered account is filled in and one click logs back in without the password", async () => {
  const fetch = backend({
    "/api/game/remembered": [200, { nickname: "satoshi" }],
    "/api/game/login/remembered": [200, { nickname: "satoshi" }],
  });
  const done = vi.fn();
  render(
    <AuthProvider>
      <AuthForm t={t} onDone={done} />
    </AuthProvider>,
  );

  await vi.waitFor(() => expect((screen.getByPlaceholderText(t.nickname) as HTMLInputElement).value).toBe("satoshi"));
  expect((screen.getByPlaceholderText(t.password) as HTMLInputElement).value).not.toBe("");
  expect((screen.getByLabelText(t.remember) as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: t.login }));

  await vi.waitFor(() => expect(done).toHaveBeenCalled());
  expect(fetch.mock.calls.some(([u]) => u === "/api/game/login/remembered")).toBe(true);
  expect(fetch.mock.calls.some(([u]) => u === "/api/game/login")).toBe(false);
});

test("typing another password logs in the normal way", async () => {
  const fetch = backend({
    "/api/game/remembered": [200, { nickname: "satoshi" }],
    "/api/game/login": [200, { nickname: "satoshi" }],
  });
  render(
    <AuthProvider>
      <AuthForm t={t} />
    </AuthProvider>,
  );

  await vi.waitFor(() => expect((screen.getByPlaceholderText(t.nickname) as HTMLInputElement).value).toBe("satoshi"));
  type(t.password, "pw");
  fireEvent.click(screen.getByRole("button", { name: t.login }));

  await vi.waitFor(() => expect(fetch.mock.calls.some(([u]) => u === "/api/game/login")).toBe(true));
  expect(sent(fetch, "/api/game/login")).toMatchObject({ nickname: "satoshi", password: "pw", remember: true });
});
