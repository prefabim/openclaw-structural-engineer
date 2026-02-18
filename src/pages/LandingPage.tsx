import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { HardHat, ArrowRight, Calculator, Building2, FileText, Columns3, Upload, Database } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

const FEATURES = [
  {
    icon: Calculator,
    title: "RC Beam Design",
    desc: "Bending & shear per EC2 with rebar selection",
  },
  {
    icon: Columns3,
    title: "Column Design",
    desc: "Buckling analysis with 2nd order effects",
  },
  {
    icon: Building2,
    title: "Steel Profiles",
    desc: "IPE/HEA/HEB selection per EC3",
  },
  {
    icon: FileText,
    title: "Slab Design",
    desc: "One-way & two-way slabs per EC2",
  },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-chart-1/10 mb-8">
            <HardHat className="w-10 h-10 text-chart-1" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            {APP_NAME}
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
            Chat with an AI structural engineer. Design reinforced concrete and
            steel elements per Eurocodes — instantly.
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            <Button
              size="lg"
              className="gap-2 text-base px-8 h-12 rounded-xl"
              onClick={() => navigate("/chat")}
            >
              Start designing <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 text-base px-8 h-12 rounded-xl"
              onClick={() => navigate("/profiles")}
            >
              <Database className="w-4 h-4" /> Steel Profiles
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 text-base px-8 h-12 rounded-xl"
              onClick={() => navigate("/ifc")}
            >
              <Upload className="w-4 h-4" /> Import IFC
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            No account required. Free to use.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider mb-8">
            What it can do
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border bg-background p-5 text-center"
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-chart-1/10 mb-3">
                  <f.icon className="w-5 h-5 text-chart-1" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-6 text-center text-xs text-muted-foreground">
        Powered by Eurocodes (EC0, EC2, EC3). For preliminary design purposes only.
      </footer>
    </div>
  );
}

export default LandingPage;
