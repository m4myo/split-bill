import { SuccessContent } from "./SuccessContent";

export default async function SuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SuccessContent id={id} />;
}
