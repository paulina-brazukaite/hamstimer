import { FocusScreen } from "@/components/focus-screen";

// "/" is a Server Component that just renders the (client-side) focus screen.
// The timer itself needs the browser (localStorage, keyboard, clock).
export default function Home() {
  return <FocusScreen />;
}
