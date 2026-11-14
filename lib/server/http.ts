import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export function jsonError(message: string, status: number, init?: { headers?: HeadersInit; retryable?: boolean }) {
  return NextResponse.json(
    { error: message, ...(init?.retryable ? { retryable: true } : {}) },
    { status, headers: init?.headers },
  );
}

/** Compares secrets without leaking how many leading characters matched. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function randomToken(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(18))).toString("base64url");
}
