declare module "canvas-confetti" {
  interface Options {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    flat?: boolean;
    ticks?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    shapes?: ("square" | "circle" | "star")[];
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
  }

  type CreateTypes = (options?: Options) => Promise<null>;

  const confetti: CreateTypes & {
    create: (canvas: HTMLCanvasElement, options?: { resize?: boolean }) => CreateTypes;
    reset: () => void;
  };

  export default confetti;
}
