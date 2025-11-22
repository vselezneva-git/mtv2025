import { MatchResult } from "ohm-js";
import grammar, { ArithmeticActionDict, ArithmeticSemantics } from "./arith.ohm-bundle";

export const arithSemantics: ArithSemantics = grammar.createSemantics() as ArithSemantics;

const arithCalc = {
  
  AddExpr(first, rest) {
    let result = first.calculate(this.args.params);
    for (const part of rest.children) {
      const op = part.child(0).sourceString;
      const value = part.child(1).calculate(this.args.params);
      
      if (op === '+') {
        result += value;
      } else if (op === '-') {
        result -= value;
      }
    }
    return result;
  },
  
  MulExpr(first, rest) {
    let result = first.calculate(this.args.params);
    for (const part of rest.children) {
      const op = part.child(0).sourceString;
      const value = part.child(1).calculate(this.args.params);
      
      if (op === '*') {
        result *= value;
      } else if (op === '/') {
        if (value === 0) {
          throw new Error("Division by zero");
        }
        result /= value;
      }
    }
    return result;
  },
  
  UnaryExpr_neg(_, e) {
    return -e.calculate(this.args.params);
  },
  
  UnaryExpr(e) {
    return e.calculate(this.args.params);
  },
  
  PrimaryExpr_paren(_, e, __) {
    return e.calculate(this.args.params);
  },
  
  PrimaryExpr(e) {
    return e.calculate(this.args.params);
  },
  
  number(_) {
    return parseInt(this.sourceString, 10);
  },
  
  variable(first, rest) {
    const varName = this.sourceString;
    const params = this.args.params;
    if (params[varName] === undefined) {
      return NaN;
    }
    return params[varName];
  }
} satisfies ArithmeticActionDict<number>;

arithSemantics.addOperation<number>("calculate(params)", arithCalc);

export interface ArithActions {
  calculate(params: {[name:string]:number}): number;
}

export interface ArithSemantics extends ArithmeticSemantics {
  (match: MatchResult): ArithActions;
}