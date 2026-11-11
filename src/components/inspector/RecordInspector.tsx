import React from 'react';
import type { DocumentView } from '../../types/cad';

const TYPE_LABELS: Record<string, string> = {
  new_part: 'new part', sketch_rectangle: 'rectangle sketch', sketch_circle: 'circle sketch', sketch_polyline: 'polyline sketch',
  assign_material: 'material',
};
const label = (type: string) => TYPE_LABELS[type] ?? type.replace(/_/g, ' ');
const mm = (v: number) => v.toFixed(2);

function Row({ name, children, testId }: { name: string; children: React.ReactNode; testId?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-slate-400">{name}</dt>
      <dd data-testid={testId} className="font-tech text-right text-slate-100">{children}</dd>
    </div>
  );
}

// Every value here comes from the document's last succeeded execution record, never from the model or the preview.
export function RecordProperties({ doc }: { doc: DocumentView }) {
  const i = doc.inspection;
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">From the execution record</div>
      <dl className="rounded-lg border border-[#202c42] bg-[#12192a] px-3 py-2 text-xs">
        <Row name="Document">{doc.id}</Row>
        <Row name="Revision">{doc.revision}</Row>
        <Row name="Material">{doc.material ?? 'none assigned'}</Row>
        {i ? (
          <>
            <Row name="Valid solid">{i.valid ? 'yes' : 'no'}</Row>
            <Row name="Volume" testId="volume">{`${mm(i.volume_mm3)} mm³`}</Row>
            <Row name="Bounding box" testId="bbox">{`${(['x', 'y', 'z'] as const).map((a) => mm(i.bbox_mm.max[a] - i.bbox_mm.min[a])).join(' × ')} mm`}</Row>
            <Row name="Min">{`${mm(i.bbox_mm.min.x)}, ${mm(i.bbox_mm.min.y)}, ${mm(i.bbox_mm.min.z)}`}</Row>
            <Row name="Max">{`${mm(i.bbox_mm.max.x)}, ${mm(i.bbox_mm.max.y)}, ${mm(i.bbox_mm.max.z)}`}</Row>
            <Row name="Solids · faces · edges">{`${i.counts.solids} · ${i.counts.faces} · ${i.counts.edges}`}</Row>
          </>
        ) : (
          <Row name="Geometry">no succeeded record yet</Row>
        )}
        <Row name="Record" testId="record">{doc.recordOperation ?? 'none'}</Row>
      </dl>
    </div>
  );
}

export function RecordTree({ doc }: { doc: DocumentView }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Features, in build order</div>
      <ol className="space-y-1 rounded-lg border border-[#202c42] bg-[#12192a] p-2 text-xs">
        {doc.features.map((f) => (
          <li key={f.id} className="flex items-center gap-2 rounded p-1.5">
            <span className="font-tech text-slate-100">{f.id}</span>{' '}
            <span className="text-slate-400">{label(f.type)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
