import { DayJournal } from "@/components/DayJournal";

interface Props {
  params: Promise<{ date: string }>;
}

export default async function DayPage({ params }: Props) {
  const { date } = await params;
  return <DayJournal date={date} />;
}
