import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>TBH Companion</h1>
      <p>
        Optimization companion for TBH: Task Bar Hero — reads your save locally
        in the browser, no upload required.
      </p>
      <Link href="/lab">Open /lab (proof-of-life)</Link>
    </main>
  );
}
