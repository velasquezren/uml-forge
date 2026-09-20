import { type ReactNode } from 'react';
import { Card } from '@/components/ui/card';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md font-bold text-xl tracking-tight">
            UF
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            UML Forge
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Modelado UML 2.5 colaborativo y generacion Spring Boot
          </p>
        </div>

        <Card className="p-6 shadow-lg border-border/60">
          <div className="mb-6 space-y-1 text-center">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          UML Forge PWA &bull; Arquitectura Offline-First con CRDTs
        </p>
      </div>
    </div>
  );
}
