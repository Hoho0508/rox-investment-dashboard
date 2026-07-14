import { prisma } from "@/lib/db/client";
import { requireOwnerSession } from "@/lib/auth/request";
import { journalEntrySchema } from "@/lib/validation/schemas";

export async function GET() {
  const unauthorized = await requireOwnerSession();
  if (unauthorized) return unauthorized;
  return Response.json(
    await prisma.journalEntry.findMany({ orderBy: { createdAt: "desc" } }),
  );
}

export async function POST(request: Request) {
  const unauthorized = await requireOwnerSession();
  if (unauthorized) return unauthorized;
  const parsed = journalEntrySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      {
        error: "輸入資料格式不正確。",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  const data = parsed.data;
  const entry = await prisma.journalEntry.create({
    data: {
      ...data,
      status: data.questionsCompleted ? "正式交易計畫" : "觀察筆記",
    },
  });
  return Response.json(entry, { status: 201 });
}
