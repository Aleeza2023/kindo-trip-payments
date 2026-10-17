import { vi } from "vitest";

export interface FakeReply {
  status: number;
  body: unknown;
}

/** Replaces fetch with a fake that answers with the given replies, in order. */
export function fakeFetch(...replies: FakeReply[]) {
  const fetchMock = vi.fn(async () => {
    const reply = replies.shift();
    if (!reply) throw new Error("No more fake replies");
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** The JSON body sent in the nth fetch call. */
export function sentBody(fetchMock: ReturnType<typeof vi.fn>, call = 0): unknown {
  const init = fetchMock.mock.calls[call][1] as RequestInit;
  return JSON.parse(init.body as string);
}

/** An expiry date that is always in the future: December next year. */
export function futureExpiry(): string {
  const nextYear = (new Date().getFullYear() + 1) % 100;
  return `12/${String(nextYear).padStart(2, "0")}`;
}
