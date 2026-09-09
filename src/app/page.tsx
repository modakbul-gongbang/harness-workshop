import { redirect } from "next/navigation";
import { currentOwner } from "@/server/session";
import TodoApp from "@/components/todo-app";

export default async function Home() {
  const owner = await currentOwner();
  if (!owner) redirect("/login");
  return <TodoApp username={owner} />;
}
