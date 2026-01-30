import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-2xl font-bold mb-6">Should I Test That?</h1>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Project Setup Complete</CardTitle>
          <CardDescription>
            Vite + React 19 + TypeScript + Tailwind 4 + shadcn/ui
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The foundation is ready. Next: design system and wizard navigation.
          </p>
          <Button>Get Started</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
