import grammar from "./rpn.ohm-bundle";
import { rpnSemantics } from "./semantics";

export function evaluate(source: string): number { 
    const match = grammar.match(source);
    if (!match.succeeded()) {
        throw new SyntaxError(`Invalid RPN expression: ${match.message}`);
    }
    
    return rpnSemantics(match).calculate();
}

export function maxStackDepth(source: string): number { 
    const match = grammar.match(source);
    if (!match.succeeded()) {
        throw new SyntaxError(`Invalid RPN expression: ${match.message}`);
    }
    
    return rpnSemantics(match).stackDepth.max;
}

export class SyntaxError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SyntaxError";
    }
}
