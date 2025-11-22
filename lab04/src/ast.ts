export type Op = "+" | "-" | "*" | "/";

export type Expr =
  | { k: "num"; n: number }
  | { k: "var"; v: string }
  | { k: "neg"; e: Expr }
  | { k: "bin"; op: Op; l: Expr; r: Expr };
