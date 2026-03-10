import { glossary } from '@/lib/glossary';
import Tooltip from './Tooltip';

export function Term({ term, label }: { term: string; label?: string }) {
  const definition = glossary[term.toLowerCase()] ?? glossary[term] ?? null;
  if (!definition) return <>{label ?? term}</>;
  return <Tooltip content={definition}>{label ?? term}</Tooltip>;
}
