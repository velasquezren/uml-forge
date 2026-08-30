// Sonda del preset de NestJS: comprueba decoradores y salida CommonJS.
function Injectable(): ClassDecorator {
  return () => undefined;
}

@Injectable()
export class ProbeService {
  public constructor(private readonly prefix: string) {}

  public greet(name: string): string {
    return `${this.prefix}${name}`;
  }
}
