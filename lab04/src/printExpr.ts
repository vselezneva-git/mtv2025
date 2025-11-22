import type { Expr, Op } from "./ast";

const opPrec = (op: Op) => (op === "+" || op === "-" ? 1 : 2);
const prec = (e: Expr): number =>
  e.k === "bin" ? opPrec(e.op) : e.k === "neg" ? 3 : 4;

function needParensInBin(parent: Op, child: Expr, side: "l" | "r"): boolean {
  const p = opPrec(parent), c = prec(child);
  if (c < p) return true;
  if (c > p) return false;
  if (child.k === "bin" && side === "r" && (parent === "-" || parent === "/"))
    return true;
  return false;
}

const needParensInNeg = (e: Expr) => e.k === "bin";

function print(e: Expr): string {
  switch (e.k) {
    case "num": return String(e.n);
    case "var": return e.v;
    case "neg": {
      const s = print(e.e);
      return needParensInNeg(e.e) ? `-(${s})` : `-${s}`;
    }
    case "bin": {
      const L = needParensInBin(e.op, e.l, "l") ? `(${print(e.l)})` : print(e.l);
      const R = needParensInBin(e.op, e.r, "r") ? `(${print(e.r)})` : print(e.r);
      return `${L} ${e.op} ${R}`;
    }
  }
}

export function printExpr(e: Expr): string {
  return print(e);
}
