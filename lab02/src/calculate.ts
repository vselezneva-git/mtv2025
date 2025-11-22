import { ReversePolishNotationActionDict } from "./rpn.ohm-bundle";

export const rpnCalc = {
    AddExpr: (a: any, b: any, op: any) => a.calculate() + b.calculate(),
    MulExpr: (a: any, b: any, op: any) => a.calculate() * b.calculate(),
    number: (digits: any) => parseInt(digits.sourceString, 10),
    _iter: (...children: any[]) => children[children.length - 1].calculate()
} satisfies ReversePolishNotationActionDict<number>;