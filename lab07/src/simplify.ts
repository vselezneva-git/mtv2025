import { Expr } from "../../lab04";
import { cost } from "./cost";

const num = (n: number): Expr => ({ k: "num", n });
const neg = (e: Expr): Expr => (e.k === "num" ? num(-e.n) : { k: "neg", e });
const bin = (op: "+" | "-" | "*" | "/", l: Expr, r: Expr): Expr => ({ k: "bin", op, l, r });
const isNum = (e: Expr): e is Extract<Expr, { k: "num" }> => e.k === "num";

function key(e: Expr): string {
  switch (e.k) {
    case "num": return `#${e.n}`;
    case "var": return `v:${e.v}`;
    case "neg": return `neg(${key(e.e)})`;
    case "bin": return `(${key(e.l)}${e.op}${key(e.r)})`;
  }
}

function equal(a: Expr, b: Expr): boolean {
  if (a.k !== b.k) return false;
  switch (a.k) {
    case "num": return isNum(b) && a.n === b.n;
    case "var": return b.k === "var" && a.v === b.v;
    case "neg": return b.k === "neg" && equal(a.e, b.e);
    case "bin": return b.k === "bin" && a.op === b.op && equal(a.l, b.l) && equal(a.r, b.r);
  }
}

function fold(e: Expr): Expr {
  switch (e.k) {
    case "num":
    case "var":
      return e;

    case "neg": {
      const ee = fold(e.e);
      return ee.k === "num" ? num(-ee.n) : neg(ee);
    }

    case "bin": {
      const L = fold(e.l);
      const R = fold(e.r);
      if (L.k === "num" && R.k === "num") {
        switch (e.op) {
          case "+": return num(L.n + R.n);
          case "-": return num(L.n - R.n);
          case "*": return num(L.n * R.n);
          case "/": return R.n !== 0 ? num((L.n / R.n) | 0) : bin("/", L, R);
        }
      }
      if (e.op === "*") {
        if (L.k === "num" && L.n === 0) return num(0);
        if (R.k === "num" && R.n === 0) return num(0);
        if (L.k === "num" && L.n === 1) return R;
        if (R.k === "num" && R.n === 1) return L;
      }
      if (e.op === "+") {
        if (L.k === "num" && L.n === 0) return R;
        if (R.k === "num" && R.n === 0) return L;
      }
      if (e.op === "-") {
        if (R.k === "num" && R.n === 0) return L;
        if (equal(L, R)) return num(0);
      }
      if (e.op === "/") {
        if (L.k === "num" && L.n === 0) return num(0);
        if (R.k === "num" && R.n === 1) return L;
      }
      return bin(e.op, L, R);
    }
  }
}

type Env = Map<string, Expr>;

function match(pattern: Expr, target: Expr, env: Env): boolean {
  switch (pattern.k) {
    case "num":
      return target.k === "num" && target.n === pattern.n;

    case "var": {
      const bound = env.get(pattern.v);
      if (!bound) { env.set(pattern.v, target); return true; }
      return equal(bound, target);
    }

    case "neg":
      return target.k === "neg" && match(pattern.e, target.e, env);

    case "bin":
      return target.k === "bin"
        && target.op === pattern.op
        && match(pattern.l, target.l, env)
        && match(pattern.r, target.r, env);
  }
}

function subst(template: Expr, env: Env): Expr {
  switch (template.k) {
    case "num": return template;
    case "var": {
      const b = env.get(template.v);
      return b ? b : template;
    }
    case "neg": return neg(subst(template.e, env));
    case "bin": return bin(template.op, subst(template.l, env), subst(template.r, env));
  }
}

function applyAtRoot(e: Expr, [lhs, rhs]: [Expr, Expr]): Expr[] {
  const env: Env = new Map();
  if (match(lhs, e, env)) return [fold(subst(rhs, env))];
  return [];
}

function applyAtRootBothWays(e: Expr, pair: [Expr, Expr]): Expr[] {
  const [a, b] = pair;
  const results: Expr[] = [];
  
  const leftResults = applyAtRoot(e, [a, b]);
  const rightResults = applyAtRoot(e, [b, a]);
  
  for (const result of leftResults) {
    if (key(result) !== key(e)) {
      results.push(result);
    }
  }
  
  for (const result of rightResults) {
    if (key(result) !== key(e)) {
      results.push(result);
    }
  }
  
  return results;
}

function rewriteAnywhere(e: Expr, identities: [Expr, Expr][], depth: number = 0): Expr[] {
  if (depth > 3) return [];
  
  const outs: Expr[] = [];
  
  for (const id of identities) {
    outs.push(...applyAtRootBothWays(e, id));
  }

  switch (e.k) {
    case "num":
    case "var":
      break;

    case "neg": {
      for (const child of rewriteAnywhere(e.e, identities, depth + 1)) {
        outs.push(fold(neg(child)));
      }
      break;
    }

    case "bin": {
      for (const l2 of rewriteAnywhere(e.l, identities, depth + 1)) {
        outs.push(fold(bin(e.op, l2, e.r)));
      }
      for (const r2 of rewriteAnywhere(e.r, identities, depth + 1)) {
        outs.push(fold(bin(e.op, e.l, r2)));
      }
      break;
    }
  }
 
  const seen = new Set<string>();
  const uniq: Expr[] = [];
  for (const x of outs) {
    const k = key(x);
    if (!seen.has(k)) { 
      seen.add(k); 
      uniq.push(x); 
    }
  }
  return uniq;
}

export function simplify(e: Expr, identities: [Expr, Expr][]): Expr {
  let start = fold(e);
  let best = start;
  let bestCost = cost(best);

  const frontier: { expr: Expr, cost: number }[] = [{ expr: start, cost: bestCost }];
  const visited = new Set<string>([key(start)]);

  const STEP_LIMIT = 500;
  const FRONTIER_CAP = 500;

  for (let step = 0; step < STEP_LIMIT && frontier.length > 0; step++) {
    frontier.sort((a, b) => a.cost - b.cost);
    const cur = frontier.shift()!;
    
    if (cur.cost < bestCost) { 
      best = cur.expr; 
      bestCost = cur.cost; 
    }

    const nexts = rewriteAnywhere(cur.expr, identities);
    
    for (const n of nexts) {
      const k = key(n);
      if (visited.has(k)) continue;
      visited.add(k);
      
      const nCost = cost(n);
      frontier.push({ expr: n, cost: nCost });
    }
    
    if (frontier.length > FRONTIER_CAP) {
      frontier.sort((a, b) => a.cost - b.cost);
      frontier.splice(FRONTIER_CAP);
    }
  }

  return best;
}