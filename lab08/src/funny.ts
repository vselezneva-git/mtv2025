import * as arith from "../../lab04";

export type TypeName = "int" | "int[]";

export interface Module {
  type: "module";
  functions: FunctionDef[];
}

export interface FunctionDef {
  type: "fun";
  name: string;
  parameters: ParameterDef[];
  returns: ParameterDef[];
  locals: ParameterDef[];
  body: Stmt; // корневой блок
}

export interface ParameterDef {
  type: "param";
  name: string;
  vtype: TypeName;
}

// ===== Стейтменты (минимально необходимые для парсера) =====

export type Stmt = Block | AssignVar | AssignIndex | AssignTuple | IfStmt | WhileStmt;

export interface Block {
  kind: "block";
  stmts: Stmt[];
}

export interface AssignVar {
  kind: "assignVar";
  name: string;
  expr: arith.Expr;
}

export interface AssignIndex {
  kind: "assignIndex";
  array: string;
  index: arith.Expr;
  expr: arith.Expr;
}

export interface AssignTuple {
  kind: "assignTuple";
  targets: string[];
  call: CallExpr;
}

export interface IfStmt {
  kind: "if";
  condSrc: string;     // условие как строка (boolean AST можно добавить позже)
  thenBranch: Stmt;
  elseBranch?: Stmt;
}

export interface WhileStmt {
  kind: "while";
  condSrc: string;
  body: Stmt;
}

export interface CallExpr {
  kind: "call";
  name: string;
  args: arith.Expr[];
}
