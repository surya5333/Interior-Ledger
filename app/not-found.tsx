import Link from "next/link";
import { Button } from "../components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-4 bg-background px-4 text-center">
      <h2 className="text-4xl font-bold text-text">404</h2>
      <p className="text-xl font-medium text-text">Page Not Found</p>
      <p className="text-muted max-w-md pb-4">
        The page you are looking for does not exist or has been moved.
      </p>
      <Button asChild>
        <Link href="/">Return to Dashboard</Link>
      </Button>
    </div>
  );
}
