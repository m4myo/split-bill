import { Suspense } from "react";
import { BillView } from "./BillView";

export default async function BillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense>
      <BillView id={id} />
    </Suspense>
  );
}
