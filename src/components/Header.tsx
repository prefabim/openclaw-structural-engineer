import { HardHat, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { APP_NAME } from "@/lib/constants";
import { Button } from "./ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-semibold text-lg hover:opacity-80 transition-opacity"
          >
            <div className="size-8 rounded-lg bg-chart-1/15 flex items-center justify-center">
              <HardHat className="size-4 text-chart-1" />
            </div>
            <span className="hidden sm:inline">{APP_NAME}</span>
          </Link>

          <nav className="flex items-center gap-2">
            <Button size="sm" asChild>
              <Link to="/chat">
                Start designing
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
