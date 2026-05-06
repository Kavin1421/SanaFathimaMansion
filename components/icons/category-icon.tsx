import type { ExpenseCategory } from "@/lib/constants";
import { Carrot, Flame, HandCoins, Package, PencilRuler, ShoppingBasket } from "lucide-react";

export function CategoryIcon({
  category,
  className,
}: {
  category: ExpenseCategory;
  className?: string;
}) {
  if (category === "Rent") return <HandCoins className={className} />;
  if (category === "Groceries") return <ShoppingBasket className={className} />;
  if (category === "Vegetables") return <Carrot className={className} />;
  if (category === "Gas") return <Flame className={className} />;
  if (category === "Misc") return <Package className={className} />;
  return <PencilRuler className={className} />;
}
