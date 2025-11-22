import { ReversePolishNotationActionDict } from "./rpn.ohm-bundle";

export type StackDepth = { max: number, out: number };

export const rpnStackDepth = {
    AddExpr: (a: any, b: any, op: any) => {
        const aDepth = a.stackDepth;
        const bDepth = b.stackDepth;
        const depthDuringB = aDepth.out + bDepth.max;
        const maxDepth = Math.max(aDepth.max, depthDuringB);
        return {
            max: maxDepth,
            out: 1
        };
    },
    
    MulExpr: (a: any, b: any, op: any) => {
        const aDepth = a.stackDepth;
        const bDepth = b.stackDepth;
        
        const depthDuringB = aDepth.out + bDepth.max;
        const maxDepth = Math.max(aDepth.max, depthDuringB);
        
        return {
            max: maxDepth,
            out: 1
        };
    },
    
    number: (digits: any) => {
        return { max: 1, out: 1 };
    },
    
    _iter: (...children: any[]) => children[children.length - 1].stackDepth
} satisfies ReversePolishNotationActionDict<StackDepth>;