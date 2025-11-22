import { Expr } from "../../lab04";

function isZero(e: Expr): boolean { return e.k === "num" && e.n === 0; }
function isOne(e: Expr): boolean  { return e.k === "num" && e.n === 1; }

const num = (n: number): Expr => ({ k: "num", n });
const variable = (v: string): Expr => ({ k: "var", v });

const neg = (e: Expr): Expr => {
  if (isZero(e)) return num(0);
  if (e.k === "neg") return e.e;
  if (e.k === "bin" && e.op === "/") return bin("/", neg(e.l), e.r);
  if (e.k === "bin" && e.op === "*") return bin("*", neg(e.l), e.r);
  return { k: "neg", e };
};

const bin = (op: "+" | "-" | "*" | "/", l: Expr, r: Expr): Expr => {
  if (op === "+") {
    if (isZero(l)) return r;
    if (isZero(r)) return l;
  } else if (op === "-") {
    if (isZero(r)) return l;
    if (isZero(l)) return neg(r);
  } else if (op === "*") {
    if (isZero(l) || isZero(r)) return num(0);
    if (isOne(l)) return r;
    if (isOne(r)) return l;
  } else if (op === "/") {
    if (isZero(l)) return num(0);
    if (isOne(r)) return l;
  }
  return { k: "bin", op, l, r };
};


const isSum = (e: Expr) => e.k === "bin" && (e.op === "+" || e.op === "-");

function asSum(e: Expr): Expr[] {
  if (e.k === "bin" && e.op === "+") return [...asSum(e.l), ...asSum(e.r)];
  if (e.k === "bin" && e.op === "-") return [...asSum(e.l), ...asSum(neg(e.r))];
  return [e];
}

function asProd(e: Expr): Expr[] {
  if (e.k === "bin" && e.op === "*") return [...asProd(e.l), ...asProd(e.r)];
  return [e];
}

function canonical(e: Expr): string {
  switch (e.k) {
    case "num": return `#${e.n}`;
    case "var": return `v:${e.v}`;
    case "neg": return `neg(${canonical(e.e)})`;
    case "bin":
      if (e.op === "*") {
        const parts = asProd(e).map(canonical).filter(s => !s.startsWith("#"));
        parts.sort();
        return parts.join("*");
      }
      return `(${canonical(e.l)}${e.op}${canonical(e.r)})`;
  }
}

function splitCoeff(term: Expr): { coeff: number; factors: Expr[] } {
  let coeff = 1;
  const out: Expr[] = [];
  for (const f of asProd(term)) {
    if (f.k === "num") { coeff *= f.n; continue; }
    if (f.k === "neg") { coeff *= -1; out.push(...asProd(f.e)); continue; }
    out.push(f);
  }
  out.sort((a, b) => canonical(a).localeCompare(canonical(b)));
  return { coeff, factors: out };
}

function buildProduct(coeff: number, factors: Expr[]): Expr {
  if (coeff === 0) return num(0);

  const sign = coeff < 0 ? -1 : 1;
  const absCoeff = Math.abs(coeff);

  let acc: Expr | null = null;
  if (absCoeff !== 1 || factors.length === 0) acc = num(absCoeff);
  for (const f of factors) acc = acc ? bin("*", acc, f) : f;

  return sign === -1 ? neg(acc!) : acc!;
}

function takeNeg(e: Expr): { neg: boolean; body: Expr } {
  if (e.k === "neg") return { neg: true, body: e.e };
  if (e.k === "num" && e.n < 0) return { neg: true, body: num(-e.n) };
  return { neg: false, body: e };
}

function combineSum(e: Expr): Expr {
  const terms = asSum(e).map(simplify);
  const buckets = new Map<string, { coeff: number; factors: Expr[] }>();

  for (const t of terms) {
    const { coeff, factors } = splitCoeff(t);
    if (coeff === 0) continue;
    const key = factors.length === 0 ? "__CONST__" : factors.map(canonical).join("*");
    const prev = buckets.get(key) ?? { coeff: 0, factors };
    prev.coeff += coeff;
    buckets.set(key, prev);
  }

  const rebuilt: Expr[] = [];
  for (const { coeff, factors } of buckets.values()) {
    if (coeff === 0) continue;
    rebuilt.push(buildProduct(coeff, factors));
  }

  if (rebuilt.length === 0) return num(0);
  if (rebuilt.length === 1) return rebuilt[0];

  let acc = rebuilt[0];
  for (let i = 1; i < rebuilt.length; i++) {
    const t = rebuilt[i];
    const { neg, body } = takeNeg(t);
    acc = neg ? bin("-", acc, body) : bin("+", acc, t);
  }
  return acc;
}

function simplify(e: Expr): Expr {
  switch (e.k) {
    case "num":
    case "var":
      return e;

    case "neg":
      return neg(simplify(e.e));

    case "bin": {
      const L = simplify(e.l);
      const R = simplify(e.r);

      const base = bin(e.op, L, R);


      if (base.k === "bin" && base.op === "*") {
        if (isSum(L)) {
          const parts = asSum(L).map(t => simplify(bin("*", t, R)));
          return combineSum(parts.slice(1).reduce((acc, t) => bin("+", acc, t), parts[0]));
        }
        if (isSum(R)) {
          const parts = asSum(R).map(t => simplify(bin("*", L, t)));
          return combineSum(parts.slice(1).reduce((acc, t) => bin("+", acc, t), parts[0]));
        }
        return base;
      }

      if (base.k === "bin" && (base.op === "+" || base.op === "-")) {
        return combineSum(base);
      }

      return base;
    }
  }
}


export function derive(e: Expr, varName: string): Expr {
  const res = (function go(node: Expr): Expr {
    switch (node.k) {
      case "num": return num(0);
      case "var": return node.v === varName ? num(1) : num(0);
      case "neg": return neg(go(node.e));
      case "bin": {
        const dl = go(node.l);
        const dr = go(node.r);
        switch (node.op) {
          case "+": return bin("+", dl, dr);
          case "-": return bin("-", dl, dr);
          case "*": return bin("+", bin("*", dl, node.r), bin("*", node.l, dr));
          case "/": {
            const numerator   = bin("-", bin("*", dl, node.r), bin("*", node.l, dr));
            const denominator = bin("*", node.r, node.r);
            return bin("/", numerator, denominator);
          }
        }
      }
    }
  })(e);

  return simplify(res);
}
