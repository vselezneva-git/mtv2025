import { parseExpr as parseArithExpr, Expr as ArithExpr } from '../../lab04';
import * as ast from './funny';
import grammar, { FunnyActionDict, FunnyGrammar } from './funny.ohm-bundle';
import { MatchResult, Semantics, NonterminalNode, IterationNode, Node } from 'ohm-js';
import { FunnyError } from './index';

// ───────────────────────── helpers ─────────────────────────

const text = (n: Node) => (n as any).sourceString as string;

const parseExpr = (n: NonterminalNode): ArithExpr => parseArithExpr(text(n));

const isIter = (x: any): x is IterationNode => !!x && typeof x.numChildren === 'number';
const iterItems = (it: IterationNode) => (it?.children ?? []) as any[];

// ───────────────────────── list helpers ────────────────────

function parseVarDef(node: NonterminalNode): ast.ParameterDef {
  // VarDef = ident ":" Type
  const ch = (node as any).children as Node[];
  const name = text(ch[0]);
  const vtype = text(ch[2]) as ast.TypeName;
  return { type: 'param', name, vtype };
}

function parseVarDefListFromChildren(ch: any[]): ast.ParameterDef[] {
  // ожидаем: [VarDef, ("," VarDef)*] — но после генерации Ohm может
  // добавить дополнительные _iter, поэтому собираем из всех итераторов.
  const out: ast.ParameterDef[] = [];
  if (ch.length === 0) return out;

  // головной VarDef
  out.push(parseVarDef(ch[0] as NonterminalNode));

  // все оставшиеся — это IterationNode с парами [",", VarDef]
  for (const tail of ch.slice(1)) {
    if (!isIter(tail)) continue;
    for (const seq of iterItems(tail)) {
      if (seq.children && seq.children[1]) {
        out.push(parseVarDef(seq.children[1] as NonterminalNode));
      }
    }
  }
  return out;
}

function parseIdentListFromChildren(ch: any[]): string[] {
  // ожидаем: [ident, ("," ident)+] (в Assignment_tuple)
  const out: string[] = [];
  if (ch.length === 0) return out;
  out.push(text(ch[0])); // первый идентификатор
  for (const tail of ch.slice(1)) {
    if (!isIter(tail)) continue;
    for (const seq of iterItems(tail)) {
      if (seq.children && seq.children[1]) out.push(text(seq.children[1]));
    }
  }
  return out;
}

function parseExprListFromChildren(ch: any[]): ArithExpr[] {
  // ожидаем: [Expr, ("," Expr)*]
  const out: ArithExpr[] = [];
  if (ch.length === 0) return out;
  out.push(parseExpr(ch[0] as NonterminalNode));
  for (const tail of ch.slice(1)) {
    if (!isIter(tail)) continue;
    for (const seq of iterItems(tail)) {
      if (seq.children && seq.children[1]) {
        out.push(parseExpr(seq.children[1] as NonterminalNode));
      }
    }
  }
  return out;
}

// ───────────────────────── semantics: parse() ──────────────

export const getFunnyAst: FunnyActionDict<any> = {
  // Module = FunctionDef+
  Module(funs) {
    const arr = (funs as IterationNode).children.map((c: any) => c.parse() as ast.FunctionDef);
    return <ast.Module>{ type: 'module', functions: arr };
  },

  // FunctionDef =
  // ident "(" ParamList? ")" "returns" ReturnList Comment? ("uses" LocalList)? Block
  FunctionDef(_id, _lp, _paramOpt, _rp, _kwRet, _retList, _cmtOpt, _usesOpt, _body) {
    const ch = (this as any).children as any[];

    const name = text(ch[0]);

    // ParamList?
    let parameters: ast.ParameterDef[] = [];
    const paramOpt = ch[2];
    if (isIter(paramOpt) && paramOpt.numChildren) {
      const plist = paramOpt.children[0] as NonterminalNode;
      parameters = parseVarDefListFromChildren((plist as any).children);
    }

    // ReturnList (обязателен)
    const retList = ch[5] as NonterminalNode;
    const returns = parseVarDefListFromChildren((retList as any).children);

    // Comment? — просто игнорируем, он уже съеден как терминал/space

    // ("uses" LocalList)?
    let locals: ast.ParameterDef[] = [];
    const usesOpt = ch[7];
    if (isIter(usesOpt) && usesOpt.numChildren) {
      const seq = usesOpt.children[0];           // ["uses", LocalList]
      const localList = seq.children[1] as NonterminalNode;
      locals = parseVarDefListFromChildren((localList as any).children);
    }

    // Block — последний узел
    const bodyNode = ch[ch.length - 1] as NonterminalNode;
    const body = (bodyNode as any).parse() as ast.Block;

    return <ast.FunctionDef>{ type: 'fun', name, parameters, returns, locals, body };
  },

  // ParamList / ReturnList / LocalList одинаково собираем из children
  ParamList() {
    return parseVarDefListFromChildren((this as any).children);
  },
  ReturnList() {
    return parseVarDefListFromChildren((this as any).children);
  },
  LocalList() {
    return parseVarDefListFromChildren((this as any).children);
  },

  VarDef(id, _colon, t) {
    return <ast.ParameterDef>{ type: 'param', name: text(id), vtype: text(t) as ast.TypeName };
  },
  Type(t) {
    return text(t) as ast.TypeName;
  },

  // Block = "{" Statement* "}"
  Block(_l, stmts, _r) {
    const list = (stmts as IterationNode).children.map((s: any) => s.parse() as ast.Stmt);
    return <ast.Block>{ kind: 'block', stmts: list };
  },

  Statement(s) { return (s as any).parse(); },

  // Assignment_var: ident "=" Expr ";"
  Assignment_var(id, _eq, e, _sc) {
    return <ast.AssignVar>{ kind: 'assignVar', name: text(id), expr: parseExpr(e as NonterminalNode) };
  },

  // Assignment_index: ArrayAccess "=" Expr ";"
  Assignment_index(arr, _eq, e, _sc) {
    const a = (arr as NonterminalNode).parse() as { array: string; index: ArithExpr };
    return <ast.AssignIndex>{ kind: 'assignIndex', array: a.array, index: a.index, expr: parseExpr(e as NonterminalNode) };
  },

  // Assignment_tuple: ident ("," ident)+ "=" FunctionCall ";"
  Assignment_tuple() {
    const ch = (this as any).children as any[];
    // [ident, ("," ident)+, "=", FunctionCall, ";"] — но генератор может
    // положить 2 IterationNode; просто соберём все иденты с помощником:
    const targets = parseIdentListFromChildren(ch.slice(0, 3) as any[]);
    const call = ch.find((x: any) => x?.ctorName === 'FunctionCall' || (x?.sourceString && /\(/.test(x.sourceString)));
    const callAst = (call as any).parse() as ast.CallExpr;
    return <ast.AssignTuple>{ kind: 'assignTuple', targets, call: callAst };
  },

  // FunctionCall = ident "(" ArgList? ")"
  FunctionCall(id, _lp, argsOpt, _rp) {
    let args: ArithExpr[] = [];
    if (isIter(argsOpt) && argsOpt.numChildren) {
      const argList = argsOpt.children[0] as NonterminalNode;
      args = parseExprListFromChildren((argList as any).children);
    }
    return <ast.CallExpr>{ kind: 'call', name: text(id), args };
  },

  // ArgList = Expr ("," Expr)*
  ArgList() {
    return parseExprListFromChildren((this as any).children);
  },

  // ArrayAccess = ident "[" Expr "]"
  ArrayAccess(id, _lb, e, _rb) {
    return { array: text(id), index: parseExpr(e as NonterminalNode) };
  },

  // Conditional = "if" "(" Condition ")" Statement ("else" Statement)?
  Conditional(_if, _lp, cond, _rp, thenS, _opt1, _opt2) {
    const thenBranch = (thenS as any).parse() as ast.Stmt;

    let elseBranch: ast.Stmt | undefined;
    // В зависимости от генерации, "else" ветка окажется в одном из двух _opt*
    for (const opt of [_opt1, _opt2]) {
      if (isIter(opt) && opt.numChildren) {
        const seq = opt.children[0]; // ["else", Statement]
        elseBranch = seq.children[1].parse() as ast.Stmt;
      }
    }

    return <ast.IfStmt>{
      kind: 'if',
      condSrc: text(cond),
      thenBranch,
      elseBranch
    };
  },

  // Loop = "while" "(" Condition ")" Statement
  Loop(_w, _lp, cond, _rp, body) {
    return <ast.WhileStmt>{ kind: 'while', condSrc: text(cond), body: (body as any).parse() as ast.Stmt };
  },

  // Первички для совместимости с расширением арифметики — отдаём как есть:
  PrimaryExpr_paren(_l, e, _r) { return e; },
  PrimaryExpr_call(id, lp, argsOpt, rp) { return (this as any).FunctionCall(id, lp, argsOpt, rp); },
  PrimaryExpr_index(id, lb, e, rb) { return (this as any).ArrayAccess(id, lb, e, rb); }
};

// ───────────────────────── semantics glue ──────────────────

export interface FunnySemanticsExt extends Semantics {
  (match: MatchResult): { parse(): ast.Module };
}

export const semantics: FunnySemanticsExt =
  (grammar.Funny as FunnyGrammar).createSemantics() as FunnySemanticsExt;

semantics.addOperation('parse()', getFunnyAst as any);

// ───────────────────────── parseFunny ──────────────────────

export function parseFunny(source: string): ast.Module {
  const m = (grammar.Funny as FunnyGrammar).match(source, 'Module');
  if (m.failed()) {
    const msg = (m as any).message as string | undefined;
    const re = /Line\s+(\d+),\s*col\s+(\d+)/;
    const mm = msg?.match(re);
    if (mm) {
      throw new FunnyError(String(msg), 'SyntaxError', parseInt(mm[1], 10), parseInt(mm[2], 10));
    }
    throw new FunnyError(String(msg ?? 'Syntax error'), 'SyntaxError');
  }
  return (semantics(m) as any).parse() as ast.Module;
}
