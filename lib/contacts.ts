import { Prisma, PrismaClient } from "../generated/prisma/client";

type ContactDbClient = PrismaClient | Prisma.TransactionClient;

export function normalizeContactIdentity(name: string, category: string) {
  return {
    name: name.trim(),
    category: category.trim(),
  };
}

export async function findContactByNameAndCategory(
  db: ContactDbClient,
  name: string,
  category: string,
  excludeId?: string
) {
  const normalized = normalizeContactIdentity(name, category);

  return db.contact.findFirst({
    where: {
      name: { equals: normalized.name, mode: "insensitive" },
      category: { equals: normalized.category, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function findOrCreateContactByNameAndCategory(
  db: ContactDbClient,
  input: { name: string; category: string; phone?: string | null }
) {
  const normalized = normalizeContactIdentity(input.name, input.category);
  const existing = await findContactByNameAndCategory(db, normalized.name, normalized.category);

  if (existing) {
    if (input.phone !== undefined && input.phone !== existing.phone) {
      return db.contact.update({
        where: { id: existing.id },
        data: { phone: input.phone || null },
      });
    }

    return existing;
  }

  try {
    return await db.contact.create({
      data: {
        name: normalized.name,
        category: normalized.category,
        phone: input.phone || null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const duplicate = await findContactByNameAndCategory(db, normalized.name, normalized.category);
      if (duplicate) {
        return duplicate;
      }
    }

    throw error;
  }
}
