import { MatchResult } from "ohm-js"
import grammar from './addmul.ohm-bundle.js'
import { addMulSemantics } from './calculate'

export function evaluate(content: string): number
{
    return calculate(parse(content));
}

export class SyntaxError extends Error
{
    constructor(message: string) {
        super(message)
        this.name = "Syntax error"
    }
}

function parse(content: string): MatchResult
{
    const match = grammar.match(content)
    if (match.failed()) {
        throw new SyntaxError(match.message ?? "Invalid expression");
    }
    return match;
}

function calculate(expression: MatchResult):number
{
    return addMulSemantics(expression).calculate()
}

// Быстрая проверка (можно удалить)
console.log(evaluate("2+3"));        // 5
console.log(evaluate("1+2*3"));      // 7
console.log(evaluate("(1+2)*3"));    // 9
console.log(evaluate(" 10 * (2+3) ")); // 50
