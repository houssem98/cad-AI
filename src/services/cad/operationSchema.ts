import schema from '../../../schema/cad-operation.schema.json' with { type: 'json' };

type Node = Record<string, any>;
const defs = schema.$defs as Node;

export type OperationType = (typeof schema.properties.type.enum)[number];
export interface SchemaError { path: string; message: string }

const typeOf = (v: unknown) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);

function resolve(node: Node): Node {
  return node.$ref ? resolve(defs[node.$ref.replace('#/$defs/', '')]) : node;
}

function check(value: unknown, node: Node, path: string, errs: SchemaError[]) {
  node = resolve(node);
  if (node.type) {
    const allowed = ([] as string[]).concat(node.type);
    if (!allowed.includes(typeOf(value))) return errs.push({ path, message: `expected ${allowed.join(' or ')}` });
  }
  if (node.enum && !node.enum.includes(value)) errs.push({ path, message: `must be one of ${node.enum.join(', ')}` });
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) errs.push({ path, message: 'must be finite' });
    else if (node.exclusiveMinimum !== undefined && !(value > node.exclusiveMinimum)) errs.push({ path, message: `must be greater than ${node.exclusiveMinimum}` });
  }
  if (typeof value === 'string' && node.minLength && value.length < node.minLength) errs.push({ path, message: 'too short' });
  if (Array.isArray(value)) {
    if (node.minItems && value.length < node.minItems) errs.push({ path, message: `needs at least ${node.minItems} items` });
    if (node.items) value.forEach((v, i) => check(v, node.items, `${path}/${i}`, errs));
  }
  if (typeOf(value) === 'object') {
    const obj = value as Node;
    for (const k of node.required ?? []) if (!Object.hasOwn(obj, k)) errs.push({ path: `${path}/${k}`, message: 'required' });
    for (const [k, v] of Object.entries(obj)) {
      if (node.properties && Object.hasOwn(node.properties, k)) check(v, node.properties[k], `${path}/${k}`, errs);
      else if (node.additionalProperties === false) errs.push({ path: `${path}/${k}`, message: 'not allowed' });
    }
  }
}

export function validateOperation(op: unknown): SchemaError[] {
  const errs: SchemaError[] = [];
  check(op, schema as Node, '', errs);
  const o = op as Node;
  if (typeof o?.type === 'string' && Object.hasOwn(defs.params, o.type) && typeOf(o.params) === 'object') check(o.params, defs.params[o.type], '/params', errs);
  return errs;
}

// agent: the operation came from the model, whose tools are the schema as L5 signed it off, without the sketch offset that
// L6 T3 added for STEP-to-CAD; an offset it sends anyway is refused (council C26).
export function validateProposal(op: unknown, agent = false): SchemaError[] {
  const errs = validateOperation(op);
  const o = op as Node;
  if (agent && typeOf(o?.params) === 'object' && Object.hasOwn(o.params, 'offset')) errs.push({ path: '/params/offset', message: 'not offered to the agent' });
  if (o?.status !== 'pending') errs.push({ path: '/status', message: 'must be pending in a proposal' });
  for (const k of ['result', 'verification', 'error']) if (o?.[k] != null) errs.push({ path: `/${k}`, message: 'set by the executor only' });
  return errs;
}
