import { createPreBillAction } from "@/app/actions/pre-bills";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewPreBillPage() {
  const r = await createPreBillAction({
    title: "New shopping list",
    category: "Groceries",
    items: [],
  });

  if (!r.ok) {
    return (
      <div className="rounded-2xl border p-6 shadow-sm">
        <p className="text-sm text-destructive">{r.error}</p>
        <Button asChild className="mt-4 rounded-xl">
          <Link href="/pre-bills">Back to list</Link>
        </Button>
      </div>
    );
  }

  redirect(`/pre-bills/${r.data._id}`);
}
