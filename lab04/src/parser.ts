import {
  arithGrammar,
  type ArithmeticActionDict,
  type ArithmeticSemantics,
  SyntaxError,
} from "../../lab03";
import type { Expr, Op } from "./ast";

export const getExprAst: ArithmeticActionDict<Expr> = {

  AddExpr(f, rest) {
    let e = f.parse() as Expr;
    for (const r of rest.children) {
      const op = r.child(0).sourceString as Op;
      const rhs = r.child(1).parse() as Expr;
      e = { k: "bin", op, l: e, r: rhs };
    }
    return e;
  },

  MulExpr(f, rest) {
    let e = f.parse() as Expr;
    for (const r of rest.children) {
      const op = r.child(0).sourceString as Op; 
      const rhs = r.child(1).parse() as Expr;    
      e = { k: "bin", op, l: e, r: rhs };
    }
    return e;
  },

  UnaryExpr_neg(_minus, u) { return { k: "neg", e: u.parse() as Expr }; },
  UnaryExpr(p) { return p.parse(); },

  PrimaryExpr_paren(_l, e, _r) { return e.parse(); },
  PrimaryExpr(e) { return e.parse(); },

  number(_digits) { return { k: "num", n: Number(this.sourceString) } as Expr; },
  variable(_head, _tail) { return { k: "var", v: this.sourceString } as Expr; },
};

export const semantics = arithGrammar.createSemantics();
semantics.addOperation("parse()", getExprAst);

export function parseExpr(source: string): Expr {
  const m = arithGrammar.match(source);
  if (!m.succeeded || !m.succeeded()) {
    throw new SyntaxError((m as any).message ?? "Syntax error");
  }
  const s = semantics(m) as unknown as { parse(): Expr };
  return s.parse();
}
