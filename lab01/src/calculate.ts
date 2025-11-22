import { Dict, MatchResult, Semantics } from "ohm-js"
import grammar, { AddMulActionDict } from "./addmul.ohm-bundle.js"

export const addMulSemantics: AddMulSemantics = grammar.createSemantics() as AddMulSemantics;

const addMulCalc = {
    Expr_root(e) {
        return e.calculate()
    },

    Add_plus(a, _plus, b) {
        return a.calculate() + b.calculate()
    },

    Add_mul(x) {
        return x.calculate()
    },

    Mul_times(a, _mul, b) {
        return a.calculate() * b.calculate()
    },

    Mul_pri(x) {
        return x.calculate()
    },

    Pri_paren(_l, e, _r) {
        return e.calculate();
    },

    Pri_num(n) {
        return n.calculate();
    },
    
    number(_digits) {
        return parseInt(this.sourceString, 10);
    }
} satisfies AddMulActionDict<number>

addMulSemantics.addOperation<Number>("calculate()", addMulCalc);

interface AddMulDict extends Dict {
    calculate(): number;
}

interface AddMulSemantics extends Semantics
{
    (match: MatchResult): AddMulDict;
}