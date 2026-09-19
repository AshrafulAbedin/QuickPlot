import { Renderer3D } from './Renderer3D';
import type { Surface } from './Renderer3D';

interface Canvas3DProps {
  equation?: string;
  surfaces?: Surface[];
  color?: string;
}

export default function Canvas3D({ equation, surfaces, color }: Canvas3DProps) {
  const resolvedSurfaces: Surface[] = surfaces
    ?? (equation
      ? [{ type: 'cartesian', expr: equation, color: color ?? '#4A9EE0' }]
      : [{ type: 'cartesian', expr: 'sin(x) + cos(y)', color: '#52C77C' }]);

  return (
    <div className="w-full h-full">
      <Renderer3D surfaces={resolvedSurfaces} />
    </div>
  );
}
