import { randomUUID } from "node:crypto";
import { beforeEach, expect, it } from "vitest";
import { createTestEnvironment } from "./environment.ts";

let owner: { userId: string; email: string };

beforeEach(() => {
  owner = { userId: `user-${randomUUID()}`, email: "ana@pizzeriadontito.co" };
});

it("signing up creates the Business with the user as its owner", async () => {
  const { core } = createTestEnvironment();

  const { id } = await core.createBusinessWithOwner({ name: "Pizzería Don Tito", owner });

  expect(await core.businessesOf(owner.userId)).toEqual([
    { businessId: id, name: "Pizzería Don Tito", role: "owner" },
  ]);
});

it("a Member acts on their Business through asMember", async () => {
  const { core } = createTestEnvironment();
  const { id } = await core.createBusinessWithOwner({ name: "Panadería La Espiga", owner });

  const business = await core.asMember(id, owner.userId);

  expect(business.member).toEqual({ userId: owner.userId, email: owner.email, role: "owner" });
  expect(await business.listConversations()).toEqual([]);
});

it("a user cannot act on a Business they don't belong to", async () => {
  const { core } = createTestEnvironment();
  const { id } = await core.createBusinessWithOwner({ name: "Panadería La Espiga", owner });
  const { id: otherId } = await core.createBusinessWithOwner({
    name: "Barbería El Corte",
    owner: { userId: `user-${randomUUID()}`, email: "luis@elcorte.co" },
  });

  await expect(core.asMember(otherId, owner.userId)).rejects.toThrow("is not a Member");
  expect(await core.businessesOf(owner.userId)).toEqual([
    { businessId: id, name: "Panadería La Espiga", role: "owner" },
  ]);
});

it("a user with no Business has no memberships", async () => {
  const { core } = createTestEnvironment();

  expect(await core.businessesOf(`user-${randomUUID()}`)).toEqual([]);
});
