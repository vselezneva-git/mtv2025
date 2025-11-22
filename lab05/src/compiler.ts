import { c as C, Op, I32 } from "../../wasm";
import { Expr } from "../../lab04";
import { buildOneFunctionModule, Fn } from "./emitHelper";

const { i32, get_local } = C;

export function getVariables(e: Expr): string[] {
  const vars: string[] = [];

  const visit = (n: Expr): void => {
    switch (n.k) {
      case "num": return;
      case "var":
        if (!vars.includes(n.v)) vars.push(n.v);
        return;
      case "neg":
        visit(n.e);
        return;
      case "bin":
        visit(n.l);
        visit(n.r);
        return;
    }
  };

  visit(e);
  return vars;
}

export async function buildFunction(e: Expr, variables: string[]): Promise<Fn<number>> {
  const body = wasm(e, variables);
  return await buildOneFunctionModule("test", variables.length, [body]);
}

function wasm(e: Expr, args: string[]): Op<I32> {
  switch (e.k) {
    case "num":
      return i32.const(e.n);

    case "var": {
      const idx = args.indexOf(e.v);
      if (idx < 0) {
        throw new WebAssembly.RuntimeError(`Unknown variable: ${e.v}`);
      }
      return get_local(i32, idx);
    }

    case "neg":
      return i32.sub(i32.const(0), wasm(e.e, args));

    case "bin": {
      const L = wasm(e.l, args);
      const R = wasm(e.r, args);
      switch (e.op) {
        case "+": return i32.add(L, R);
        case "-": return i32.sub(L, R);
        case "*": return i32.mul(L, R);
        case "/": return i32.div_s(L, R);
      }
    }
  }
  throw new Error("Unreachable: unsupported expression node");
}
